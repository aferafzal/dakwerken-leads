// Meta-pixel in de browser, enkel na toestemming van de bezoeker (cookiekeuze "ja").
// Zonder NEXT_PUBLIC_META_PIXEL_ID doet alles hier niets: geen banner, geen script, geen cookies.
// Elke gebeurtenis krijgt een eventId; de server stuurt dezelfde gebeurtenis met hetzelfde id naar de
// Conversions API (lib/meta-capi.ts), zodat Meta ze samenvoegt in plaats van dubbel te tellen.

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? ''

const SLEUTEL = 'dw-cookiekeuze'
const GELDIG_DAGEN = 180   // daarna vragen we opnieuw
export const KEUZE_EVENT = 'dw-cookiekeuze'

export type Keuze = 'ja' | 'nee'

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; push?: unknown; loaded?: boolean; version?: string }
declare global { interface Window { fbq?: Fbq; _fbq?: Fbq } }

/** De bewaarde keuze, of null als de bezoeker nog niets koos (of de keuze verlopen is) */
export function leesKeuze(): Keuze | null {
  if (typeof window === 'undefined') return null
  try {
    const w = JSON.parse(localStorage.getItem(SLEUTEL) ?? 'null') as { keuze: Keuze; op: string } | null
    if (!w) return null
    if (Date.now() - new Date(w.op).getTime() > GELDIG_DAGEN * 864e5) return null
    return w.keuze
  } catch {
    return null
  }
}

export function bewaarKeuze(keuze: Keuze) {
  try { localStorage.setItem(SLEUTEL, JSON.stringify({ keuze, op: new Date().toISOString() })) } catch { /* privémodus */ }
  if (keuze === 'nee') wisMetaCookies()
  window.dispatchEvent(new CustomEvent(KEUZE_EVENT, { detail: keuze }))
}

export function vergeetKeuze() {
  try { localStorage.removeItem(SLEUTEL) } catch { /* niet erg */ }
  wisMetaCookies()
  window.dispatchEvent(new CustomEvent(KEUZE_EVENT, { detail: null }))
}

function wisMetaCookies() {
  for (const naam of ['_fbp', '_fbc']) {
    document.cookie = `${naam}=; Max-Age=0; path=/`
    document.cookie = `${naam}=; Max-Age=0; path=/; domain=.${window.location.hostname.replace(/^www\./, '')}`
  }
}

export const metaToegestaan = () => !!META_PIXEL_ID && leesKeuze() === 'ja'

/** Laadt het pixelscript van Meta (één keer) en telt het paginabezoek */
export function laadMetaPixel() {
  if (!metaToegestaan() || window.fbq) return
  const fbq: Fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args)
    else fbq.queue!.push(args)
  } as Fbq
  fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = []
  window.fbq = fbq
  window._fbq = fbq
  const s = document.createElement('script')
  s.async = true
  s.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(s)
  fbq('init', META_PIXEL_ID)
  fbq('track', 'PageView')
}

/** Een gebeurtenis in de browser; doet niets zonder toestemming */
export function metaGebeurtenis(naam: string, eventId?: string, params?: Record<string, unknown>) {
  if (!metaToegestaan() || !window.fbq) return
  window.fbq('track', naam, params ?? {}, eventId ? { eventID: eventId } : undefined)
}

function cookie(naam: string): string | undefined {
  return document.cookie.split('; ').find((c) => c.startsWith(naam + '='))?.split('=')[1]
}

export type MetaVoorServer = { toestemming: boolean; fbp?: string; fbc?: string; url?: string }

/** Wat de server nodig heeft om dezelfde gebeurtenis via de Conversions API te sturen */
export function metaVoorServer(fbclid?: string): MetaVoorServer {
  if (!metaToegestaan()) return { toestemming: false }
  const fbc = cookie('_fbc') ?? (fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined)
  return { toestemming: true, fbp: cookie('_fbp'), fbc, url: window.location.origin + window.location.pathname }
}
