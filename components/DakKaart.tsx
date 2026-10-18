'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Check, Landmark, LoaderCircle } from 'lucide-react'
import type { GebouwInfo, PerceelKlikResultaat } from '@/app/api/dakmeting/route'
import type { Dakscan, Dakvlak, Windrichting } from '@/lib/dakscan'
import { ERFGOED_TEKST } from '@/lib/erfgoed-tekst'
import { MIDDEN, NOORD, ZUID, rgb, tekenScan, vlakKleur } from '@/lib/dakscan-kleur'
import { erfgoedVan, hoofdGebouw } from '@/lib/dak'

export type PerceelSelectie = PerceelKlikResultaat

export type KaartFase = 'zoeken' | 'meten' | 'klaar' | 'leeg'
type Fase = KaartFase

interface DakKaartProps {
  lat: number
  lng: number
  onPerceelSelect: (data: PerceelSelectie) => void
  onFase?: (fase: KaartFase) => void
}

const KORT: Record<Windrichting, string> = {
  noord: 'Noord', noordoost: 'Noordoost', oost: 'Oost', zuidoost: 'Zuidoost',
  zuid: 'Zuid', zuidwest: 'Zuidwest', west: 'West', noordwest: 'Noordwest',
}

const getal = (n: number, decimalen = 0) =>
  n.toLocaleString('nl-BE', { minimumFractionDigits: decimalen, maximumFractionDigits: decimalen })

function binnen([lat, lng]: [number, number], ring: [number, number][]): boolean {
  let ja = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ai, bi] = ring[i]
    const [aj, bj] = ring[j]
    if ((ai > lat) !== (aj > lat) && lng < ((bj - bi) * (lat - ai)) / (aj - ai) + bi) ja = !ja
  }
  return ja
}

// Het gebouw onder het punt; anders het dichtstbijzijnde middelpunt
function aangeduidGebouw(gebouwen: GebouwInfo[], punt: [number, number]): number {
  const raak = gebouwen.findIndex((g) => g.grenzen.length > 2 && binnen(punt, g.grenzen))
  if (raak >= 0) return raak
  let beste = -1, afstand = Infinity
  gebouwen.forEach((g, i) => {
    if (g.grenzen.length < 3) return
    const lat = g.grenzen.reduce((s, p) => s + p[0], 0) / g.grenzen.length
    const lng = g.grenzen.reduce((s, p) => s + p[1], 0) / g.grenzen.length
    const d = Math.hypot(lat - punt[0], (lng - punt[1]) * 0.63)
    if (d < afstand) { afstand = d; beste = i }
  })
  return beste
}

// Nummer per gebouw (het aangeduide gebouw is "uw woning"); de andere 2, 3, … van groot naar klein
function gebouwNummers(gebouwen: GebouwInfo[]): Map<number, number> {
  const anderen = gebouwen
    .map((g, i) => ({ g, i }))
    .filter(({ g }) => !g.aangeduid)
    .sort((a, b) => (b.g.oppervlakte ?? 0) - (a.g.oppervlakte ?? 0))
  return new Map(anderen.map(({ i }, n) => [i, n + 2]))
}

function gebouwNaam(g: GebouwInfo, nr: number | undefined): string {
  if (g.aangeduid) return 'Uw woning'
  return `${/bijgebouw/i.test(g.hoogte3d?.gebouwType ?? '') ? 'Bijgebouw' : 'Gebouw'} ${nr ?? ''}`.trim()
}

export default function DakKaart({ lat, lng, onPerceelSelect, onFase }: DakKaartProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const callbackRef = useRef(onPerceelSelect)
  callbackRef.current = onPerceelSelect
  const faseRef = useRef(onFase)
  faseRef.current = onFase

  const [luchtfoto, setLuchtfoto] = useState(false)
  const [fase, zetFase] = useState<Fase>('zoeken')
  const setFase = (f: Fase) => { zetFase(f); faseRef.current?.(f) }
  const [selectie, setSelectie] = useState<PerceelSelectie | null>(null)
  // Aan- of uitvinken van een gebouw (kaart en lijst gebruiken dezelfde functie)
  const wisselRef = useRef<(i: number) => void>(() => {})

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 19,
      maxZoom: 21,
      zoomControl: true,
      // Op gsm: één vinger scrolt de pagina, niet de kaart (inzoomen met twee vingers blijft)
      dragging: !L.Browser.mobile,
      // Geen focus bij een tik: anders scrolt het venster mee en komt de tik op een andere plek terecht.
      // De lijst met vinkjes onder de kaart blijft met het toetsenbord bruikbaar.
      keyboard: false,
    })
    mapInstance.current = map

    const foto = L.tileLayer.wms('https://geo.api.vlaanderen.be/OMWRGBMRVL/wms', {
      layers: 'Ortho',
      format: 'image/jpeg',
      transparent: false,
      maxZoom: 21,
      attribution: '© Digitaal Vlaanderen',
    }).addTo(map)
    foto.once('load', () => setLuchtfoto(true))

    L.circleMarker([lat, lng], {
      radius: 6,
      color: '#ffffff',
      fillColor: '#0f172a',
      fillOpacity: 1,
      weight: 2,
    }).addTo(map).bindTooltip('Uw adres', {
      permanent: true,
      direction: 'top',
      offset: [0, -8],
      className: 'dakkaart-adres',
    })

    const lagen = L.layerGroup().addTo(map)
    const labelLaag = L.layerGroup().addTo(map)
    let labels: { waar: [number, number]; tekst: string }[] = []
    let verzoek = 0
    let huidig: PerceelSelectie | null = null
    let perGebouw: { omtrek: L.Polygon | null; scan: L.ImageOverlay | null }[] = []

    function bewaar(sel: PerceelSelectie) {
      huidig = sel
      setSelectie(sel)
      callbackRef.current(sel)
    }

    // Wat meetelt: dikke witte omtrek en gekleurde dakvlakken. Wat niet meetelt: dunne omtrek.
    function toonGebouw(i: number) {
      const g = huidig?.gebouwen[i]
      const laag = perGebouw[i]
      if (!g || !laag) return
      const mee = g.meetellen !== false
      const scan = g.scan?.meetbaar && g.scan.raster ? g.scan : null
      if (mee && scan && !laag.scan) {
        const beeld = tekenScan(scan)
        if (beeld) {
          laag.scan = L.imageOverlay(beeld, [[scan.raster!.zuid, scan.raster!.west], [scan.raster!.noord, scan.raster!.oost]], {
            className: 'dakscan-laag',
            interactive: false,
          })
        }
      }
      if (laag.scan) {
        if (mee && !lagen.hasLayer(laag.scan)) lagen.addLayer(laag.scan)
        if (!mee && lagen.hasLayer(laag.scan)) lagen.removeLayer(laag.scan)
      }
      laag.omtrek?.setStyle({
        weight: mee ? 3 : 1.5,
        opacity: mee ? 1 : 0.75,
        fillOpacity: mee ? (laag.scan ? 0 : 0.15) : 0.08,
      })
      laag.omtrek?.bringToFront()
    }

    function wissel(i: number) {
      if (!huidig) return
      const g = huidig.gebouwen[i]
      const aantalMee = huidig.gebouwen.filter((x) => x.meetellen !== false).length
      // Er telt altijd minstens één gebouw mee
      if (!g || (g.meetellen !== false && aantalMee <= 1)) return
      bewaar({ ...huidig, gebouwen: huidig.gebouwen.map((x, j) => (j === i ? { ...x, meetellen: x.meetellen === false } : x)) })
      toonGebouw(i)
    }
    wisselRef.current = wissel

    // Labels zonder overlap: een label dat te dicht bij een vorig label staat, valt weg
    function plaatsLabels() {
      labelLaag.clearLayers()
      // Het label "Uw adres" staat boven de adresstip
      const geplaatst: L.Point[] = [map.latLngToContainerPoint([lat, lng]).subtract([0, 22])]
      for (const label of labels) {
        const p = map.latLngToContainerPoint(label.waar)
        if (geplaatst.some((q) => Math.abs(q.x - p.x) < 96 && Math.abs(q.y - p.y) < 28)) continue
        geplaatst.push(p)
        L.tooltip({ permanent: true, direction: 'center', className: 'dakvlak-label', interactive: false })
          .setLatLng(label.waar)
          .setContent(label.tekst)
          .addTo(labelLaag)
      }
    }
    map.on('zoomend', plaatsLabels)

    async function zoekOp(punt: [number, number]) {
      const dit = ++verzoek
      lagen.clearLayers()
      labels = []
      labelLaag.clearLayers()
      huidig = null
      perGebouw = []
      setFase('zoeken')
      setSelectie(null)

      const kring = L.circleMarker(punt, { radius: 10, color: '#ffffff', weight: 2, dashArray: '4 4', fill: false }).addTo(lagen)

      let data: PerceelSelectie | null = null
      try {
        const res = await fetch(`/api/dakmeting?click_lat=${punt[0]}&click_lng=${punt[1]}`)
        if (res.ok) data = await res.json()
      } catch { /* hieronder afgehandeld */ }
      if (dit !== verzoek) return
      lagen.removeLayer(kring)

      if (!data || data.error || data.gebouwen.length === 0) {
        setFase('leeg')
        return
      }

      const hoofdIndex = aangeduidGebouw(data.gebouwen, punt)
      // Standaard telt enkel het aangeduide gebouw mee; andere gebouwen op het perceel worden vermeld
      const gebouwen = data.gebouwen.map((g, i) => ({ ...g, aangeduid: i === hoofdIndex, meetellen: i === hoofdIndex }))

      // Perceel: dunne witte stippellijn; gebouwen: witte omtrek
      if (data.perceelGrenzen && data.perceelGrenzen.length > 2) {
        L.polygon(data.perceelGrenzen, { color: '#ffffff', weight: 1.5, opacity: 0.8, dashArray: '6 5', fill: false, interactive: false }).addTo(lagen)
      }
      const nummers = gebouwNummers(gebouwen)
      perGebouw = gebouwen.map((g, i) => {
        if (g.grenzen.length < 3) return { omtrek: null, scan: null }
        // Tik op een gebouw van dit perceel: mee- of niet meetellen (de kaart zoekt dan geen andere woning)
        const omtrek = L.polygon(g.grenzen, { color: '#ffffff', fillColor: '#ffffff', bubblingMouseEvents: false }).addTo(lagen)
        const tik = () => {
          if (!huidig?.gebouwen[i]?.aangeduid) wissel(i)
        }
        omtrek.on('click', tik)
        // Nummer op de andere gebouwen, zodat ze in de lijst herkenbaar zijn.
        // Aantikbaar: de tik gaat via de omtrek (zelfde klik-afhandeling) en niet naar de kaart.
        if (nummers.has(i)) {
          omtrek.bindTooltip(String(nummers.get(i)), {
            permanent: true,
            direction: 'center',
            className: 'gebouw-nummer',
            interactive: true,
            bubblingMouseEvents: false,
          } as L.TooltipOptions)
        }
        return { omtrek, scan: null }
      })
      // Inzoomen op de woning; liggen de andere gebouwen dichtbij, dan komen ze mee in beeld (om aan te tikken)
      const hoofd = gebouwen[hoofdIndex]
      if (hoofd && hoofd.grenzen.length > 2) {
        const alle = gebouwen.filter((g) => g.grenzen.length > 2).flatMap((g) => g.grenzen)
        const allesInBeeld = L.latLngBounds(alle).pad(0.1)
        const doel = gebouwen.length > 1 && map.getBoundsZoom(allesInBeeld) >= 20 ? allesInBeeld : L.latLngBounds(hoofd.grenzen).pad(0.15)
        map.flyToBounds(doel, { maxZoom: 21, duration: 0.6 })
      }

      bewaar({ ...data, gebouwen })
      gebouwen.forEach((_, i) => toonGebouw(i))
      setFase('meten')

      // Dakscan per gebouw (laserhoogtemeting)
      const scans = await Promise.all(
        gebouwen.map(async (g): Promise<Dakscan | null> => {
          if (!g.id) return null
          try {
            const res = await fetch(`/api/dakscan?gebouw=${g.id}`)
            return res.ok ? await res.json() : null
          } catch {
            return null
          }
        }),
      )
      if (dit !== verzoek) return

      // Meetwaarden invullen (de bezoeker kan intussen al gebouwen aan- of uitgevinkt hebben)
      const metScan = huidig!.gebouwen.map((g, i) => {
        const scan = scans[i]
        return scan?.meetbaar && scan.dakOppervlak ? { ...g, dakOppervlak: scan.dakOppervlak, scan } : { ...g, scan }
      })
      bewaar({ ...huidig!, gebouwen: metScan })
      metScan.forEach((_, i) => toonGebouw(i))

      // Labels op de grootste vlakken van het aangeduide gebouw
      const scanHoofd = scans[hoofdIndex]
      labels = scanHoofd?.meetbaar
        ? scanHoofd.vlakken
            .filter((v) => v.grondOppervlak >= 8)
            .slice(0, 3)
            .map((v) => ({ waar: v.midden, tekst: v.richting ? `${KORT[v.richting]} · ${v.helling}°` : 'Plat' }))
        : []
      plaatsLabels()
      setFase('klaar')
    }

    // Een tik komt op touchschermen soms bij de kaart binnen in plaats van bij het gebouw of zijn nummer.
    // Ligt de tik op een gebouw van dit perceel of vlak bij een nummer: aan- of uitvinken. Anders: een andere woning zoeken.
    map.on('click', (e: L.LeafletMouseEvent) => {
      const punt: [number, number] = [e.latlng.lat, e.latlng.lng]
      const raak = huidig?.gebouwen.findIndex((g, i) => {
        const nummer = perGebouw[i]?.omtrek?.getTooltip()?.getLatLng()
        const opNummer = nummer ? map.latLngToContainerPoint(nummer).distanceTo(e.containerPoint) < 16 : false
        return opNummer || (g.grenzen.length > 2 && binnen(punt, g.grenzen))
      }) ?? -1
      if (raak >= 0) {
        if (!huidig!.gebouwen[raak].aangeduid) wissel(raak)
        return
      }
      void zoekOp(punt)
    })
    void zoekOp([lat, lng])

    return () => {
      verzoek++
      map.remove()
      mapInstance.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const gebouwen = selectie?.gebouwen ?? []
  const hoofd = hoofdGebouw(gebouwen)
  const scan = hoofd?.scan?.meetbaar ? hoofd.scan : null
  const toonLegende = fase === 'klaar' && gebouwen.some((g) => g.scan?.meetbaar)

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="relative">
        <div ref={mapRef} className="h-[300px] w-full sm:h-[360px]" />

        {toonLegende && (
          <div className="pointer-events-none absolute right-2 top-2 z-[500] flex items-center gap-3 rounded-md bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-navy shadow-sm">
            <span className="flex items-center gap-1.5">
              Noord
              <span
                className="h-2 w-12 rounded-full"
                style={{ background: `linear-gradient(90deg, ${rgb(NOORD)}, ${rgb(MIDDEN)}, ${rgb(ZUID)})` }}
                aria-hidden
              />
              Zuid
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm border border-slate-300 bg-white" aria-hidden />
              Plat
            </span>
          </div>
        )}
      </div>

      {fase === 'leeg' ? (
        <p role="status" className="border-t border-slate-200 px-4 py-4 text-sm text-slate-700 sm:px-5">
          Op deze plek vonden we geen gebouw. Tik op de kaart op het dak van uw woning.
        </p>
      ) : fase !== 'klaar' ? (
        <ul role="status" aria-live="polite" className="space-y-2.5 border-t border-slate-200 px-4 py-4 text-sm sm:px-5">
          <Stap klaar={luchtfoto} tekst={luchtfoto ? 'Luchtfoto van uw buurt' : 'Luchtfoto ophalen'} />
          <Stap
            klaar={fase === 'meten'}
            tekst={fase === 'meten' ? 'Gebouw gevonden op uw perceel' : 'Uw gebouw zoeken'}
          />
          <Stap klaar={false} wacht={fase === 'zoeken'} tekst="Dak meten met de laserhoogtemeting" />
        </ul>
      ) : (
        <Meetstaat gebouwen={gebouwen} hoofd={hoofd} scan={scan} onWissel={(i) => wisselRef.current(i)} />
      )}

      <style jsx global>{`
        .dakkaart-adres {
          background: #0f172a;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 600;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.35);
        }
        .dakkaart-adres::before { border-top-color: #0f172a; }
        .dakvlak-label {
          background: rgba(15, 23, 42, 0.88);
          color: #ffffff;
          border: none;
          border-radius: 999px;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.3);
        }
        .dakvlak-label::before { display: none; }
        .gebouw-nummer {
          background: #ffffff;
          color: #0f172a;
          border: none;
          border-radius: 999px;
          min-width: 22px;
          padding: 1px 7px;
          font-size: 11px;
          font-weight: 800;
          text-align: center;
          box-shadow: 0 1px 4px rgba(15, 23, 42, 0.35);
        }
        .gebouw-nummer::before { display: none; }
        .gebouw-nummer.leaflet-interactive { cursor: pointer; }
        /* Eén moment: de gemeten vlakken schuiven van boven naar onder in beeld */
        @media (prefers-reduced-motion: no-preference) {
          .dakscan-laag { animation: dakscan-in 900ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        }
        @keyframes dakscan-in {
          from { clip-path: inset(0 0 100% 0); }
          to { clip-path: inset(0 0 0 0); }
        }
      `}</style>
    </div>
  )
}

function Stap({ klaar, wacht = false, tekst }: { klaar: boolean; wacht?: boolean; tekst: string }) {
  return (
    <li className={`flex items-center gap-2.5 ${wacht ? 'text-slate-500' : 'text-navy'}`}>
      {klaar ? (
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-navy text-white">
          <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
        </span>
      ) : (
        <LoaderCircle className={`h-5 w-5 flex-shrink-0 ${wacht ? '' : 'animate-spin'}`} aria-hidden />
      )}
      <span className={klaar ? 'font-semibold' : ''}>{tekst}</span>
    </li>
  )
}

function Meetstaat({ gebouwen, hoofd, scan, onWissel }: {
  gebouwen: GebouwInfo[]
  hoofd: GebouwInfo | null
  scan: Dakscan | null
  onWissel: (i: number) => void
}) {
  const opp = (g: GebouwInfo) => g.dakOppervlak ?? g.oppervlakte ?? 0
  const mee = gebouwen.filter((g) => g.meetellen !== false)
  const totaal = mee.reduce((s, g) => s + opp(g), 0)
  const nummers = gebouwNummers(gebouwen)
  const volgorde = gebouwen
    .map((g, i) => ({ g, i }))
    .sort((a, b) => (a.g.aangeduid ? -1 : b.g.aangeduid ? 1 : (nummers.get(a.i) ?? 0) - (nummers.get(b.i) ?? 0)))

  const samenvatting = scan
    ? [
        scan.dakvorm && scan.dakvorm.charAt(0).toUpperCase() + scan.dakvorm.slice(1),
        scan.helling !== null && `helling\u00a0±${scan.helling}°`,
        scan.nokhoogte !== null && `nokhoogte ${getal(scan.nokhoogte, 1)}\u00a0m`,
      ].filter(Boolean).join(' · ')
    : null

  // Vlakken met dezelfde richting (bv. twee platte delen) als één rij; de kaart toont ze apart
  const perRichting = new Map<string, Dakvlak[]>()
  for (const v of scan?.vlakken.filter((v) => v.grondOppervlak >= 3) ?? []) {
    const sleutel = v.richting ?? 'plat'
    perRichting.set(sleutel, [...(perRichting.get(sleutel) ?? []), v])
  }
  const rijen = [...perRichting.values()]
    .map((groep) => {
      const opp = groep.reduce((s, v) => s + v.dakOppervlak, 0)
      const helling = Math.round(groep.reduce((s, v) => s + v.helling * v.dakOppervlak, 0) / (opp || 1))
      return { ...groep[0], dakOppervlak: opp, helling, delen: groep }
    })
    .sort((a, b) => b.dakOppervlak - a.dakOppervlak)
  const getoond = rijen.slice(0, 4)
  const getoondeDelen = getoond.flatMap((r) => r.delen)
  const rest = scan ? scan.vlakken.filter((v) => !getoondeDelen.includes(v)) : []
  const restOpp = rest.reduce((s, v) => s + v.dakOppervlak, 0)
  const scanMislukt = !scan && hoofd?.scan === null
  const erfgoed = erfgoedVan(gebouwen)[0]

  return (
    <div className="border-t border-slate-200 px-4 py-4 sm:px-5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-semibold text-slate-600">
          {mee.length > 1 ? `Dakoppervlakte, ${mee.length} gebouwen` : 'Dakoppervlakte'}
        </p>
        <p className="text-3xl font-black tabular-nums tracking-tight text-navy">±{getal(totaal)}{'\u00a0'}m²</p>
      </div>
      {samenvatting && (
        <p className="mt-1 text-sm text-slate-700">
          {mee.length > 1 && hoofd
            ? `${gebouwNaam(hoofd, nummers.get(gebouwen.indexOf(hoofd)))}: ${samenvatting.charAt(0).toLowerCase()}${samenvatting.slice(1)}`
            : samenvatting}
        </p>
      )}

      {getoond.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 border-y border-slate-100">
          {getoond.map((v) => (
            <li key={v.richting ?? 'plat'} className="flex items-center gap-3 py-2 text-sm">
              <span
                className="h-3.5 w-3.5 flex-shrink-0 rounded-sm border border-slate-300"
                style={{ background: rgb(vlakKleur(v)) }}
                aria-hidden
              />
              <span className="flex-1 font-semibold text-navy">{v.richting ? KORT[v.richting] : 'Plat'}</span>
              <span className="w-10 text-right tabular-nums text-slate-600">{v.richting ? `${v.helling}°` : ''}</span>
              <span className="w-16 text-right font-semibold tabular-nums text-navy">{getal(v.dakOppervlak)}{'\u00a0'}m²</span>
            </li>
          ))}
        </ul>
      )}

      {erfgoed && (
        <div className="mt-4 flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <Landmark className="mt-0.5 h-5 w-5 flex-shrink-0 text-navy" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold text-navy">{ERFGOED_TEKST[erfgoed.soort].titel}</p>
            <p className="mt-0.5 text-slate-700">{ERFGOED_TEKST[erfgoed.soort].tekst}</p>
            {erfgoed.url && (
              <a
                href={erfgoed.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block font-semibold text-navy underline underline-offset-2"
              >
                Bekijk de fiche bij Onroerend Erfgoed
              </a>
            )}
          </div>
        </div>
      )}

      {gebouwen.length > 1 && (
        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-navy">Welke gebouwen tellen mee?</legend>
          <p className="mt-0.5 text-xs text-slate-600">Vink een garage of bijgebouw aan, of tik erop op de kaart.</p>
          <ul className="mt-2 divide-y divide-slate-100 border-y border-slate-100">
            {volgorde.map(({ g, i }) => {
              const aan = g.meetellen !== false
              const vast = aan && mee.length <= 1
              const vorm = g.scan?.meetbaar ? g.scan.dakvorm : null
              return (
                <li key={g.id ?? i}>
                  <label className={`flex min-h-11 items-center gap-3 py-1.5 text-sm ${vast ? '' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 flex-shrink-0 accent-navy"
                      checked={aan}
                      disabled={vast}
                      onChange={() => onWissel(i)}
                    />
                    <span className="flex-1">
                      <span className="font-semibold text-navy">{gebouwNaam(g, nummers.get(i))}</span>
                      {vorm && <span className="text-slate-600"> · {vorm}</span>}
                    </span>
                    <span className={`w-16 text-right tabular-nums ${aan ? 'font-semibold text-navy' : 'text-slate-600'}`}>
                      {getal(opp(g))}{'\u00a0'}m²
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </fieldset>
      )}

      <div className="mt-3 space-y-1 text-xs leading-relaxed text-slate-600">
        {rest.length > 0 && restOpp > 0 && (
          <p>
            Plus {rest.length === 1 ? 'een klein dakdeel' : `${rest.length} kleine dakdelen`} ({getal(restOpp)} m²), bijvoorbeeld een dakkapel of goot.
          </p>
        )}
        {scan ? (
          <p>Gemeten met de laserhoogtemeting van de Vlaamse overheid (2013–2015). Sindsdien verbouwd? Dan kan het afwijken.</p>
        ) : scanMislukt ? (
          <p>De laserhoogtemeting is nu niet bereikbaar. De oppervlakte is geschat uit het grondvlak.</p>
        ) : (
          <p>
            Voor dit gebouw is er geen laserhoogtemeting, vermoedelijk omdat het na 2015 gebouwd of verbouwd werd.
            De oppervlakte is geschat uit het grondvlak.
          </p>
        )}
      </div>
    </div>
  )
}
