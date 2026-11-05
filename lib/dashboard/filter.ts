// Zoeken, filteren en sorteren van aanvragen. Alles komt uit de URL (?toon=…&q=…&sorteer=…),
// zodat terugkeren, vernieuwen en een link delen dezelfde lijst tonen.
import { OPVOLG_GROEPEN } from '@/lib/opvolging'
import {
  bronVan, dagVan, opvolgingVan, prijsVan, wachttijd, werkenVan, type Lead,
} from './weergave'

export const SORTERINGEN = [
  { sleutel: 'nieuw', label: 'Nieuwste eerst' },
  { sleutel: 'oud', label: 'Oudste eerst' },
  { sleutel: 'wacht', label: 'Langst wachtend' },
  { sleutel: 'prijs', label: 'Hoogste prijs' },
  { sleutel: 'gemeente', label: 'Gemeente (A–Z)' },
  { sleutel: 'actie', label: 'Volgende actie' },
] as const
export type Sortering = (typeof SORTERINGEN)[number]['sleutel']

export const TABS = [...OPVOLG_GROEPEN.map((g) => ({ sleutel: g.sleutel as string, label: g.label as string })), { sleutel: 'archief', label: 'Archief' }]

export type Filters = {
  toon: string           // te_doen | lopend | afgerond | alle | archief
  q: string
  sorteer: Sortering
  werk: string           // '' of een werkomschrijving
  bron: string           // '' of een bron
  tel: boolean           // enkel met telefoonnummer
  snel: string           // '' | wacht | vandaag | week | gecontacteerd | gewonnen (klik op een cijfer bovenaan)
}

const eerste = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export const standaardToon = (pad: string) => (pad.startsWith('/dashboard/kaart') ? 'alle' : 'te_doen')

export function leesFilters(sp: Record<string, string | string[] | undefined>, pad = '/dashboard'): Filters {
  const toon = eerste(sp.toon) || standaardToon(pad)
  const sorteer = eerste(sp.sorteer)
  return {
    toon: TABS.some((t) => t.sleutel === toon) ? toon : 'te_doen',
    q: eerste(sp.q).trim().slice(0, 80),
    sorteer: (SORTERINGEN.some((s) => s.sleutel === sorteer) ? sorteer : 'nieuw') as Sortering,
    werk: eerste(sp.werk).slice(0, 60),
    bron: eerste(sp.bron).slice(0, 60),
    tel: eerste(sp.tel) === '1',
    snel: eerste(sp.snel).slice(0, 20),
  }
}

/** De URL voor een gewijzigde set filters (lege waarden vallen weg) */
export function filterUrl(basis: string, f: Filters, wijziging: Partial<Filters> = {}): string {
  const n = { ...f, ...wijziging }
  const p = new URLSearchParams()
  // De kaart toont standaard alles, de lijst standaard wat te doen is
  if (n.toon !== standaardToon(basis)) p.set('toon', n.toon)
  if (n.q) p.set('q', n.q)
  if (n.sorteer !== 'nieuw') p.set('sorteer', n.sorteer)
  if (n.werk) p.set('werk', n.werk)
  if (n.bron) p.set('bron', n.bron)
  if (n.tel) p.set('tel', '1')
  if (n.snel) p.set('snel', n.snel)
  const s = p.toString()
  return s ? `${basis}?${s}` : basis
}

const gewoon = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function inTab(l: Lead, toon: string): boolean {
  if (toon === 'archief') return !!l.gearchiveerd_op
  if (l.gearchiveerd_op) return false
  const groep = OPVOLG_GROEPEN.find((g) => g.sleutel === toon) ?? OPVOLG_GROEPEN[0]
  return (groep.waarden as readonly string[]).includes(opvolgingVan(l))
}

/** Snelle filters achter de cijfers bovenaan */
export function inSnel(l: Lead, snel: string, nu = Date.now()): boolean {
  const vandaag = dagVan(new Date(nu))
  switch (snel) {
    case 'wacht': return (wachttijd(l) ?? 0) >= 2
    case 'vandaag': return dagVan(l.created_at) === vandaag
    case 'week': return nu - new Date(l.created_at).getTime() < 7 * 86_400_000
    case 'gecontacteerd': return ['gecontacteerd', 'doorgestuurd', 'offerte'].includes(opvolgingVan(l))
    case 'gewonnen': return opvolgingVan(l) === 'gewonnen' && dagVan(l.opvolging_op ?? l.created_at).slice(0, 7) === vandaag.slice(0, 7)
    default: return true
  }
}

export function filter(leads: Lead[], f: Filters): Lead[] {
  const q = gewoon(f.q)
  // Een snelfilter kijkt over alle tabbladen heen (behalve het archief)
  const resultaat = leads.filter((l) => {
    if (f.snel) { if (l.gearchiveerd_op || !inSnel(l, f.snel)) return false }
    else if (!inTab(l, f.toon)) return false
    if (f.tel && !l.telefoon) return false
    if (f.werk && !werkenVan(l).includes(f.werk)) return false
    if (f.bron && bronVan(l) !== f.bron) return false
    if (q) {
      const hooi = gewoon([l.naam, l.email, l.telefoon?.replace(/\s+/g, ''), l.telefoon, l.adres, l.gemeente, l.notitie].filter(Boolean).join(' '))
      if (!q.split(/\s+/).every((woord) => hooi.includes(woord))) return false
    }
    return true
  })
  return sorteer(resultaat, f.sorteer)
}

export function sorteer(leads: Lead[], s: Sortering): Lead[] {
  const tijd = (l: Lead) => new Date(l.created_at).getTime()
  const kopie = [...leads]
  switch (s) {
    case 'oud': return kopie.sort((a, b) => tijd(a) - tijd(b))
    case 'wacht': return kopie.sort((a, b) => (wachttijd(b) ?? -1) - (wachttijd(a) ?? -1) || tijd(a) - tijd(b))
    case 'prijs': return kopie.sort((a, b) => (prijsVan(b)?.max ?? 0) - (prijsVan(a)?.max ?? 0))
    case 'gemeente': return kopie.sort((a, b) => (a.gemeente ?? 'zzz').localeCompare(b.gemeente ?? 'zzz', 'nl'))
    case 'actie': return kopie.sort((a, b) =>
      (a.volgende_actie_op ? new Date(a.volgende_actie_op).getTime() : Infinity) - (b.volgende_actie_op ? new Date(b.volgende_actie_op).getTime() : Infinity))
    default: return kopie.sort((a, b) => tijd(b) - tijd(a))
  }
}

/** De cijfers bovenaan het dashboard */
export function kerncijfers(leads: Lead[], nu = Date.now()) {
  const actief = leads.filter((l) => !l.gearchiveerd_op)
  const tel = (snel: string) => actief.filter((l) => inSnel(l, snel, nu)).length
  return {
    teDoen: actief.filter((l) => opvolgingVan(l) === 'nieuw').length,
    wacht: tel('wacht'),
    vandaag: tel('vandaag'),
    week: tel('week'),
    gecontacteerd: tel('gecontacteerd'),
    gewonnen: tel('gewonnen'),
  }
}

/** Voor "Vandaag": geplande acties tot het einde van vandaag, en nieuwe aanvragen die wachten */
export function vandaagTeDoen(leads: Lead[], nu = Date.now()) {
  const vandaag = dagVan(new Date(nu))
  const actief = leads.filter((l) => !l.gearchiveerd_op)
  const gepland = actief
    .filter((l) => l.volgende_actie && l.volgende_actie_op && dagVan(l.volgende_actie_op) <= vandaag)
    .sort((a, b) => new Date(a.volgende_actie_op!).getTime() - new Date(b.volgende_actie_op!).getTime())
  const wachtend = actief
    .filter((l) => wachttijd(l) != null && !l.volgende_actie_op)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  return { gepland, wachtend }
}

/** Keuzes voor de filters: enkel wat echt voorkomt */
export function keuzes(leads: Lead[]) {
  const werken = new Set<string>(), bronnen = new Set<string>()
  for (const l of leads) { werkenVan(l).forEach((w) => werken.add(w)); bronnen.add(bronVan(l)) }
  return { werken: [...werken].sort((a, b) => a.localeCompare(b, 'nl')), bronnen: [...bronnen].sort((a, b) => a.localeCompare(b, 'nl')) }
}
