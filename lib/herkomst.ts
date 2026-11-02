// Herkomst van een bezoek: uit welke link (advertentie, bericht, knop op Facebook) kwam de bezoeker binnen?
// Geen cookies: we lezen de link zelf (utm_*, fbclid) en onthouden die enkel in dit tabblad (sessionStorage),
// zodat ze bewaard blijft als de bezoeker binnen de site verder klikt. Het tabblad sluiten wist ze.

export type Herkomst = {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  fbclid?: string
  verwijzer?: string   // enkel de domeinnaam van de vorige site, bv. "l.facebook.com"
  landing?: string     // eerste pagina op deze site, zonder zoekparameters
}

const SLEUTEL = 'dw-herkomst'
const VELDEN = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'] as const

function uitLink(): Herkomst | null {
  const p = new URLSearchParams(window.location.search)
  const h: Herkomst = {}
  for (const v of VELDEN) {
    const w = p.get(v)
    if (w) h[v] = w.slice(0, 200)
  }
  try {
    const ref = document.referrer ? new URL(document.referrer).hostname : ''
    if (ref && ref !== window.location.hostname) h.verwijzer = ref.slice(0, 100)
  } catch { /* geen geldige verwijzer */ }
  if (!Object.keys(h).length) return null
  h.landing = window.location.pathname.slice(0, 200)
  return h
}

/** De herkomst van dit bezoek: de eerste link met gegevens in dit tabblad wint */
export function leesHerkomst(): Herkomst | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const bewaard = sessionStorage.getItem(SLEUTEL)
    if (bewaard) return JSON.parse(bewaard) as Herkomst
  } catch { /* sessionStorage geblokkeerd: dan enkel de huidige link */ }
  const nu = uitLink()
  if (!nu) return undefined
  try { sessionStorage.setItem(SLEUTEL, JSON.stringify(nu)) } catch { /* niet erg */ }
  return nu
}
