// Hoe een aanvraag in het dashboard getoond wordt. Geen databank, geen server-imports:
// ook bruikbaar in clientcomponenten (kaart, lijst).
import { berekenPrijs, werkOmschrijving, type Antwoorden, type DakMaten } from '@/lib/prijsmodel'
import { isOpvolging, type Opvolging } from '@/lib/opvolging'

export type DakData = {
  antwoorden?: Antwoorden
  verfijnd?: boolean
  maten?: DakMaten
  prijs?: { min: number; max: number; nauwkeurigheid: number }
  oppervlakte?: number | null
  lat?: number | null
  lng?: number | null
}

export type Herkomst = {
  utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_content?: string; fbclid?: string; verwijzer?: string
}

export type Lead = {
  id: string
  created_at: string
  email: string | null
  naam: string | null
  telefoon: string | null
  adres: string | null
  gemeente: string | null
  status: string | null
  session_id: string | null
  probleem: string | null
  urgentie: number | null
  bouwjaar: string | null
  type_werken: string[] | null
  dak_oppervlakte?: number | null
  dak_data: DakData | null
  opvolging?: string | null
  notitie?: string | null
  opvolging_op?: string | null
  herkomst?: Herkomst | null
  gearchiveerd_op?: string | null
  volgende_actie?: string | null
  volgende_actie_op?: string | null
  eerste_reactie_op?: string | null
}

export type TijdlijnRegel = {
  id: number | string
  lead_id: string
  soort: string
  door: 'klant' | 'systeem' | 'ai' | 'team'
  samenvatting: string | null
  data: Record<string, unknown> | null
  created_at: string
}

export const TZ = 'Europe/Brussels'
export const euro = (n: number) => `€${Math.round(n).toLocaleString('nl-BE')}`

export const opvolgingVan = (l: Lead): Opvolging => (isOpvolging(l.opvolging) ? l.opvolging : 'nieuw')

// type_werken van oudere aanvragen (vóór de werkkeuze in de funnel)
const TYPE_LABEL: Record<string, string> = {
  pannen: 'Dakbedekking vernieuwen', isolatie: 'Dak isoleren', plat_dak: 'Plat dak vernieuwen', dakgoten: 'Dakgoten',
  lekkage_onderzoek: 'Lekkage', totaalrenovatie: 'Totaalrenovatie', advies: 'Advies',
}
export const START_LABEL: Record<string, string> = {
  zo_snel_mogelijk: 'zo snel mogelijk', binnen_3_maanden: 'binnen drie maanden', dit_jaar: 'later dit jaar', orienterend: 'oriënteert zich nog',
}
export const BOUWJAAR_LABEL: Record<string, string> = {
  voor_1980: 'gebouwd vóór 1980', '1980_2000': 'gebouwd 1980–2000', '2000_2015': 'gebouwd 2000–2015', na_2015: 'gebouwd na 2015',
}

/** "Vandaag 14:05", "Gisteren 09:12", "3 nov. 10:00" */
export function wanneer(iso: string): string {
  const d = new Date(iso)
  const dag = (x: Date) => x.toLocaleDateString('en-CA', { timeZone: TZ })
  const nu = new Date()
  const uur = d.toLocaleTimeString('nl-BE', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  if (dag(d) === dag(nu)) return `Vandaag ${uur}`
  if (dag(d) === dag(new Date(nu.getTime() - 86_400_000))) return `Gisteren ${uur}`
  if (dag(d) === dag(new Date(nu.getTime() + 86_400_000))) return `Morgen ${uur}`
  const zelfdeJaar = d.toLocaleDateString('nl-BE', { timeZone: TZ, year: 'numeric' }) === nu.toLocaleDateString('nl-BE', { timeZone: TZ, year: 'numeric' })
  return `${d.toLocaleDateString('nl-BE', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', ...(zelfdeJaar ? {} : { year: 'numeric' }) })} ${uur}`
}

/** Dag in Brussel als JJJJ-MM-DD */
export const dagVan = (iso: string | Date) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ })

/** Wat de bezoeker deed: telefoon > prijs verfijnd > rapport */
export function interesse(l: Lead): { label: string; sterk: boolean } {
  if (l.telefoon) return { label: 'Wil gebeld worden', sterk: true }
  if (!l.session_id) return { label: 'Offerteformulier', sterk: false }
  if (l.dak_data?.verfijnd || l.status === 'engaged') return { label: 'Prijs verfijnd', sterk: false }
  return { label: 'Rapport aangevraagd', sterk: false }
}

/** Prijs zoals het rapport ze nu toont: herberekend uit de maten en de laatste antwoorden */
export function prijsVan(l: Lead): { min: number; max: number; nauwkeurigheid: number } | null {
  const d = l.dak_data
  if (!d) return null
  if (d.maten) {
    const p = berekenPrijs(d.maten, d.antwoorden ?? {})
    return p.max > 0 ? p : null
  }
  return d.prijs && d.prijs.max > 0 ? d.prijs : null
}

export function werkenVan(l: Lead): string[] {
  const a = l.dak_data?.antwoorden
  if (a?.werken?.length) return werkOmschrijving(a)
  return (l.type_werken ?? []).map((t) => TYPE_LABEL[t] ?? t)
}

export function oppervlakteVan(l: Lead): number | null {
  return l.dak_data?.oppervlakte ?? l.dak_oppervlakte ?? null
}

export function coordVan(l: Lead): [number, number] | null {
  const lat = l.dak_data?.lat, lng = l.dak_data?.lng
  return typeof lat === 'number' && typeof lng === 'number' && lat > 49 && lat < 52 && lng > 2 && lng < 7 ? [lat, lng] : null
}

/** Waar de aanvraag vandaan kwam (migratie 010) */
export function bronVan(l: Lead): string {
  const h = l.herkomst
  if (!h) return 'Rechtstreeks of onbekend'
  const bron = h.utm_source ?? (h.fbclid ? 'facebook' : h.verwijzer?.replace(/^(www|l|lm|m)\./, '')) ?? 'onbekend'
  return bron.toLowerCase().includes('facebook') || bron === 'fb' ? (h.utm_medium === 'social' ? 'Facebook-pagina' : 'Facebook') : bron
}
export function herkomstVan(l: Lead): string | null {
  const h = l.herkomst
  if (!h) return null
  return [bronVan(l), h.utm_campaign, h.utm_content].filter(Boolean).join(' · ')
}

/** Voornaam voor een aanspreking, enkel als de klant een naam gaf */
export function voornaamVan(l: Lead): string | null {
  const n = l.naam?.trim()
  return n ? n.split(/\s+/)[0] : null
}

/** Weergavenaam in lijsten: naam, anders het e-mailadres, anders het adres */
export function wieVan(l: Lead): string {
  return l.naam?.trim() || l.email || l.adres || 'Onbekende aanvrager'
}

// ─── Wachttijd in werkuren (ma–vr, 8–18 u, Brussel) ────────────────────

const WERK_BEGIN = 8, WERK_EINDE = 18

function brusselUurEnDag(t: number): { uur: number; dag: number } {
  const d = new Date(t)
  const uur = Number(d.toLocaleString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }))
  const dag = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(d.toLocaleString('en-US', { timeZone: TZ, weekday: 'short' }))
  return { uur, dag }
}

/** Aantal werkuren tussen twee momenten, per kwartier geteld (genoeg voor "wacht 3u") */
export function werkurenTussen(van: string | number, tot: number = Date.now()): number {
  let t = typeof van === 'string' ? new Date(van).getTime() : van
  const stap = 15 * 60_000
  let kwartieren = 0
  // Begrensd op 30 dagen: daarna is het toch "te lang"
  const grens = Math.min(tot, t + 30 * 86_400_000)
  while (t < grens) {
    const { uur, dag } = brusselUurEnDag(t)
    if (dag >= 1 && dag <= 5 && uur >= WERK_BEGIN && uur < WERK_EINDE) kwartieren++
    t += stap
  }
  return kwartieren / 4
}

/** Wacht deze aanvraag nog op een eerste reactie van ons? En hoe lang (werkuren)? */
export function wachttijd(l: Lead): number | null {
  if (l.gearchiveerd_op || l.eerste_reactie_op || opvolgingVan(l) !== 'nieuw') return null
  return werkurenTussen(l.created_at)
}

export function wachtLabel(uren: number): string {
  if (uren < 1) return 'wacht < 1 u'
  if (uren < 10) return `wacht ${Math.floor(uren)} u`
  return `wacht ${Math.round(uren / 10)} werkdag${Math.round(uren / 10) > 1 ? 'en' : ''}`
}

/** Telefoonnummer voor tel: en WhatsApp (België: 0470… → 32470…) */
export function telVan(t: string): { tel: string; whatsapp: string } {
  const tel = t.replace(/[^\d+]/g, '')
  const intl = tel.startsWith('+') ? tel.slice(1) : tel.startsWith('00') ? tel.slice(2) : tel.startsWith('0') ? `32${tel.slice(1)}` : tel
  return { tel, whatsapp: intl }
}

export const kaartLinks = (l: Lead) => {
  const c = coordVan(l)
  const q = encodeURIComponent(`${l.adres ?? ''} ${l.gemeente ?? ''}`.trim())
  return {
    maps: c ? `https://www.google.com/maps/search/?api=1&query=${c[0]},${c[1]}` : `https://www.google.com/maps/search/?api=1&query=${q}`,
    streetview: c ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${c[0]},${c[1]}` : null,
  }
}

export const VOLGENDE_ACTIES = ['Bellen', 'Mail sturen', 'Plaatsbezoek', 'Offerte maken', 'Offerte opvolgen', 'Doorsturen naar dakwerker'] as const
