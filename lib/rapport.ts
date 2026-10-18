/**
 * Van opgeslagen lead naar alles wat het rapport toont (server).
 * Gebruikt door /rapport/[sessionId] en door het testrapport /rapport/voorbeeld.
 */

import { list } from '@vercel/blob'
import { gebouwOmtrek, scanGebouw, type Dakscan, type Windrichting } from '@/lib/dakscan'
import { naarLambert, naarWgs84 } from '@/lib/lambert'
import type { Erfgoed } from '@/lib/erfgoed'
import { ERFGOED_TEKST } from '@/lib/erfgoed-tekst'
import { DRIE_D_AAN } from '@/lib/instellingen'
import { kostenVoorDak, type Kostenregel, type SoortWerk } from '@/lib/kosten'
import { dakwerkenLabels, type FunnelStapVragenlijst } from '@/lib/validations'

export type LeadRow = {
  id: string
  email: string | null
  adres: string | null
  gemeente: string | null
  dak_oppervlakte: number | null
  bouwjaar: FunnelStapVragenlijst['bouwjaar'] | null
  laatste_dakwerken: FunnelStapVragenlijst['laatste_dakwerken'] | null
  lekkage_recent: FunnelStapVragenlijst['lekkage_recent'] | null
  type_werken: NonNullable<FunnelStapVragenlijst['type_werken']> | null
  dak_data: {
    capakey?: string
    oppervlakte?: number
    nokhoogte?: number
    daktype?: string
    aantalGebouwen?: number
    lat?: number
    lng?: number
    gebouwen?: { id: string | null; woning: boolean; grondOppervlak?: number; dakOppervlak?: number; dakvorm?: string | null }[]
    erfgoed?: Erfgoed[]
    dakscan?: {
      dakvorm: string | null
      helling: number | null
      nokhoogte: number | null
      vlakken: { richting: Windrichting | null; helling: number; dakOppervlak: number }[]
    } | null
  } | null
  created_at: string
}

export type RapportGebouw = {
  naam: string
  woning: boolean
  dakvorm: string | null
  dakOppervlak: number
  scan: Dakscan | null
  omtrek: [number, number][] | null   // Lambert72, voor het beeld
}

export type Aandachtspunt = { soort: 'erfgoed' | 'asbest' | 'leeftijd' | 'lekkage' | 'onderhoud'; titel: string; tekst: string; link?: string }

export type RapportData = {
  id: string
  adres: string
  gemeente: string | null
  datum: string
  totaalDak: number | null
  dakvorm: string | null
  helling: number | null
  nokhoogte: number | null
  vlakken: { richting: Windrichting | null; helling: number; dakOppervlak: number }[]
  gebouwen: RapportGebouw[]
  gemeten: boolean
  metingTekst: string
  kosten: Kostenregel[]
  aandachtspunten: Aandachtspunt[]
  jaren: { jaar: string; url: string }[]
  streetView: string | null
  drieD: string | null
  lat: number | null
  lng: number | null
}

// ─── Luchtfoto's door de jaren heen (Digitaal Vlaanderen, winteropnamen 25 cm) ───
const JAREN: [string, string][] = [
  ['2000–2003', 'OMWRGB00_03VL'],
  ['2008–2011', 'OMWRGB08_11VL'],
  ['2015', 'OMWRGB15VL'],
  ['2020', 'OMWRGB20VL'],
  ['2025', 'OMWRGB25VL'],
]

export function luchtfotoUrl(laag: string, [x0, y0, x1, y1]: number[], breedte: number, hoogte: number, dienst = 'OMW'): string {
  return `https://geo.api.vlaanderen.be/${dienst}/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image/jpeg` +
    `&LAYERS=${laag}&STYLES=&CRS=EPSG:31370&BBOX=${x0.toFixed(1)},${y0.toFixed(1)},${x1.toFixed(1)},${y1.toFixed(1)}` +
    `&WIDTH=${breedte}&HEIGHT=${hoogte}`
}

/** Kader rond de gebouwen (Lambert72), met marge en een vaste verhouding breedte:hoogte */
export function kaderRond(ringen: [number, number][][], verhouding: number, marge = 0.35, minBreedte = 28): [number, number, number, number] | null {
  const punten = ringen.flat()
  if (punten.length === 0) return null
  const xs = punten.map(([x]) => x)
  const ys = punten.map(([, y]) => y)
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2
  let b = Math.max((Math.max(...xs) - Math.min(...xs)) * (1 + 2 * marge), minBreedte)
  let h = (Math.max(...ys) - Math.min(...ys)) * (1 + 2 * marge)
  if (b / h < verhouding) b = h * verhouding
  else h = b / verhouding
  return [cx - b / 2, cy - h / 2, cx + b / 2, cy + h / 2]
}

// ─── Street View (Google): enkel tonen als er een beeld is ───
type Panorama = { pano_id: string; location: { lat: number; lng: number } }

async function zoekPanorama(lat: number, lng: number, straal: number, key: string): Promise<Panorama | null> {
  const r = await fetch(
    `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&radius=${straal}&source=outdoor&key=${key}`,
    { next: { revalidate: 86400 } },
  )
  if (!r.ok) return null
  const d: { status?: string; pano_id?: string; location?: { lat: number; lng: number } } = await r.json()
  return d.status === 'OK' && d.pano_id && d.location ? { pano_id: d.pano_id, location: d.location } : null
}

function kijkrichting(van: { lat: number; lng: number }, naar: [number, number]): number {
  const rad = Math.PI / 180
  const φ1 = van.lat * rad, φ2 = naar[0] * rad, Δλ = (naar[1] - van.lng) * rad
  return (Math.atan2(Math.sin(Δλ) * Math.cos(φ2), Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)) / rad + 360) % 360
}

/**
 * Gevelbeeld: een fotopunt aan de overkant van de straat (zo staan gevel én dak in beeld),
 * met de camera gericht op de woning. Lukt dat niet, dan het dichtstbijzijnde fotopunt.
 */
async function streetViewBeeld(lat: number | null, lng: number | null, woning: [number, number][] | null): Promise<string | null> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (lat == null || lng == null || !key) return null
  try {
    let pano: Panorama | null = null
    if (woning && woning.length > 2) {
      // Van het midden van het gebouw naar het adrespunt (aan de straatkant), en 15 m verder
      const [ax, ay] = naarLambert([lat, lng])
      const mx = woning.reduce((s, [x]) => s + x, 0) / woning.length
      const my = woning.reduce((s, [, y]) => s + y, 0) / woning.length
      const d = Math.hypot(ax - mx, ay - my)
      if (d > 0.5) {
        const [olat, olng] = naarWgs84([ax + ((ax - mx) / d) * 15, ay + ((ay - my) / d) * 15])
        pano = await zoekPanorama(olat, olng, 12, key)
      }
    }
    pano ??= await zoekPanorama(lat, lng, 50, key)
    if (!pano) return null
    const richting = Math.round(kijkrichting(pano.location, [lat, lng]))
    return `https://maps.googleapis.com/maps/api/streetview?size=1200x600&pano=${pano.pano_id}&heading=${richting}&fov=80&pitch=15&key=${key}`
  } catch {
    return null
  }
}

// ─── 3D (staat uit, zie lib/instellingen.ts) ───
async function drieDModel(capakey: string | undefined, lat: number | null, lng: number | null): Promise<string | null> {
  if (!DRIE_D_AAN || !capakey) return null
  try {
    const { blobs } = await list({ prefix: `lod2/v6/${capakey.replace(/\//g, '_')}`, limit: 10, token: process.env.BLOB_READ_WRITE_TOKEN })
    const glb = blobs.find((b) => b.pathname.endsWith('.glb'))
    if (!glb) return null
    let middelpunt: { lat: number; lng: number } | null = null
    const meta = blobs.find((b) => b.pathname.endsWith('.meta.json'))
    if (meta) {
      try {
        const m = await (await fetch(meta.url, { cache: 'no-store' })).json()
        if (m?.centroid) middelpunt = { lat: m.centroid.lat, lng: m.centroid.lng }
      } catch { /* metadata is optioneel */ }
    }
    return `/lod2-viewer.html?glb=${encodeURIComponent(glb.url)}&lat=${middelpunt?.lat ?? lat ?? ''}&lng=${middelpunt?.lng ?? lng ?? ''}`
  } catch {
    return null
  }
}

const HOOFDLETTER = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export async function maakRapport(lead: LeadRow): Promise<RapportData> {
  const dak = lead.dak_data ?? {}
  const lat = dak.lat ?? null
  const lng = dak.lng ?? null

  // Gebouwen die meetellen (nieuwe rapporten); oudere rapporten hebben enkel een totaal
  const opgeslagen = (dak.gebouwen ?? []).filter((g) => g.id)
  const erfgoedUitScan: Erfgoed[] = []
  const [metScan, drieD] = await Promise.all([
    Promise.all(
      opgeslagen.map(async (g, i): Promise<RapportGebouw> => {
        const [scan, omtrek] = await Promise.all([
          scanGebouw(g.id!).catch(() => null),
          gebouwOmtrek(g.id!).catch(() => null),
        ])
        erfgoedUitScan.push(...(scan?.erfgoed ?? []))
        return {
          naam: g.woning ? 'Uw woning' : `Gebouw ${i + 1}`,
          woning: g.woning,
          dakvorm: g.dakvorm ?? (scan?.meetbaar ? scan.dakvorm : null),
          dakOppervlak: g.dakOppervlak ?? (scan?.meetbaar ? scan.dakOppervlak : null) ?? g.grondOppervlak ?? 0,
          scan: scan?.meetbaar ? scan : null,
          omtrek,
        }
      }),
    ),
    drieDModel(dak.capakey, lat, lng),
  ])
  const streetView = await streetViewBeeld(lat, lng, metScan.find((g) => g.woning)?.omtrek ?? null)
  // Andere gebouwen nummeren zoals in de funnel (2, 3, …)
  let nr = 2
  for (const g of metScan) if (!g.woning) g.naam = `Gebouw ${nr++}`

  const ds = dak.dakscan ?? null
  const totaalDak = metScan.length
    ? metScan.reduce((s, g) => s + g.dakOppervlak, 0)
    : lead.dak_oppervlakte ?? dak.oppervlakte ?? null

  // Hellend en plat dak (m²) voor de kosten
  let hellend = 0
  let plat = 0
  if (metScan.length) {
    for (const g of metScan) {
      if (g.scan) {
        for (const v of g.scan.vlakken) {
          if (v.richting === null) plat += v.dakOppervlak
          else hellend += v.dakOppervlak
        }
        // Verschil tussen som van de vlakken en totaal (exacte omtrek) evenredig verdelen
        const som = g.scan.vlakken.reduce((s, v) => s + v.dakOppervlak, 0)
        if (som > 0 && g.scan.dakOppervlak) {
          const f = g.scan.dakOppervlak / som
          const h = g.scan.vlakken.filter((v) => v.richting !== null).reduce((s, v) => s + v.dakOppervlak, 0)
          hellend += h * (f - 1)
          plat += (som - h) * (f - 1)
        }
      } else if (g.dakvorm === 'plat dak') plat += g.dakOppervlak
      else hellend += g.dakOppervlak
    }
  } else if (totaalDak) {
    const isPlat = (dak.daktype ?? '').toLowerCase().includes('plat')
    if (isPlat) plat = totaalDak
    else hellend = totaalDak
  }
  const kosten = kostenVoorDak(hellend, plat, (lead.type_werken ?? []) as SoortWerk[])

  // Aandachtspunten: enkel wat vaststaat of wat de bezoeker zelf opgaf
  const aandachtspunten: Aandachtspunt[] = []
  // Erfgoed zoals opgeslagen door de funnel; anders opnieuw uit de scan (zonder dubbels)
  const erfgoed = dak.erfgoed ?? [...new Map(erfgoedUitScan.map((e) => [`${e.soort}-${e.naam}`, e])).values()]
  for (const e of erfgoed) {
    aandachtspunten.push({
      soort: 'erfgoed',
      titel: `${ERFGOED_TEKST[e.soort].titel}: ${e.naam}`,
      tekst: ERFGOED_TEKST[e.soort].tekst,
      link: e.url ?? undefined,
    })
  }
  if (lead.bouwjaar === 'voor_1980' || lead.bouwjaar === '1980_2000') {
    aandachtspunten.push({
      soort: 'asbest',
      titel: 'Mogelijk asbest',
      tekst: `Uw woning is gebouwd ${lead.bouwjaar === 'voor_1980' ? 'vóór 1980' : 'tussen 1980 en 2000'}. Gebouwen van vóór 2001 kunnen asbest bevatten, bijvoorbeeld in leien of golfplaten. Laat dit nakijken vóór er aan het dak gewerkt wordt. Bij verkoop is een asbestattest verplicht.`,
      link: 'https://ovam.vlaanderen.be/asbestattest',
    })
  }
  if (lead.laatste_dakwerken === 'meer_15j' || lead.laatste_dakwerken === 'nooit') {
    aandachtspunten.push({
      soort: 'leeftijd',
      titel: 'Laat het dak nakijken',
      tekst: `Laatste dakwerken: ${dakwerkenLabels[lead.laatste_dakwerken].toLowerCase()}. Een inspectie toont of pannen, goten en onderdak nog in orde zijn, vóór er schade ontstaat.`,
    })
  }
  if (lead.lekkage_recent === 'ja') {
    aandachtspunten.push({
      soort: 'lekkage',
      titel: 'U meldde een lekkage',
      tekst: 'Laat dit snel bekijken: vocht kan isolatie en dakstructuur aantasten. Hoe sneller de oorzaak gevonden is, hoe beperkter de herstelling.',
    })
  }
  if (plat >= 5) {
    aandachtspunten.push({
      soort: 'onderhoud',
      titel: 'Plat dak: houd de afvoeren vrij',
      tekst: 'Een verstopte afvoer is bij een plat dak een veelvoorkomende oorzaak van lekkage. Kijk de afvoeren minstens één keer per jaar na, zeker na de bladval.',
    })
  }

  // Luchtfoto's per jaar: kader rond de gebouwen die meetellen, of rond het adres
  const ringen = metScan.map((g) => g.omtrek).filter((r): r is [number, number][] => !!r)
  // Geen gebouw bewaard (oudere rapporten): een vierkant rond het adrespunt
  if (ringen.length === 0 && lat != null && lng != null) {
    const [x, y] = naarLambert([lat, lng])
    ringen.push([[x - 8, y - 8], [x + 8, y - 8], [x + 8, y + 8], [x - 8, y + 8]])
  }
  const kader = kaderRond(ringen, 1, 0.45, 30)
  const jaren = kader ? JAREN.map(([jaar, laag]) => ({ jaar, url: luchtfotoUrl(laag, kader, 480, 480) })) : []

  const woning = metScan.find((g) => g.woning) ?? metScan[0] ?? null
  const scanWoning = woning?.scan ?? null

  return {
    id: lead.id,
    adres: lead.adres ?? 'Uw woning',
    gemeente: lead.gemeente,
    datum: lead.created_at,
    totaalDak: totaalDak ? Math.round(totaalDak) : null,
    dakvorm: (scanWoning?.dakvorm ?? ds?.dakvorm) ? HOOFDLETTER((scanWoning?.dakvorm ?? ds?.dakvorm)!) : null,
    helling: scanWoning?.helling ?? ds?.helling ?? null,
    nokhoogte: scanWoning?.nokhoogte ?? ds?.nokhoogte ?? dak.nokhoogte ?? null,
    vlakken: scanWoning
      ? scanWoning.vlakken.map((v) => ({ richting: v.richting, helling: v.helling, dakOppervlak: v.dakOppervlak }))
      : ds?.vlakken ?? [],
    gebouwen: metScan,
    gemeten: metScan.some((g) => g.scan) || !!ds,
    metingTekst: metScan.some((g) => g.scan) || ds
      ? 'Gemeten met de laserhoogtemeting van de Vlaamse overheid (2013–2015). Sindsdien verbouwd? Dan kan het afwijken; een dakwerker meet ter plaatse na.'
      : opgeslagen.length
        ? 'Voor dit gebouw is er geen laserhoogtemeting, vermoedelijk omdat het na 2015 gebouwd of verbouwd werd. De oppervlakte is geschat uit het grondvlak; een dakwerker meet ter plaatse na.'
        : 'De oppervlakte is geschat uit het grondvlak van uw woning. Een dakwerker meet ter plaatse na.',
    kosten,
    aandachtspunten,
    jaren,
    streetView,
    drieD,
    lat,
    lng,
  }
}
