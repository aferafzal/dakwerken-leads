// Meta Conversions API: dezelfde gebeurtenis als de pixel in de browser, maar vanaf de server.
// Zo telt Meta een aanvraag ook als een adblocker de pixel tegenhoudt. Enkel na toestemming van de bezoeker
// (cookiekeuze "ja"); het eventId is gelijk aan dat van de pixel, zodat Meta ze samenvoegt.
// E-mail en telefoon gaan enkel gehasht (SHA-256) naar Meta, zoals Meta het vraagt.
//
// Instellingen (Vercel → Environment Variables):
//   NEXT_PUBLIC_META_PIXEL_ID   pixel-ID uit Meta Events Manager (ook nodig in de browser)
//   META_CAPI_TOKEN             toegangssleutel voor de Conversions API (Events Manager → Instellingen)
//   META_GRAPH_VERSION          optioneel, standaard v26.0
//   META_TEST_EVENT_CODE        optioneel: gebeurtenissen verschijnen dan onder "Testgebeurtenissen"

import { createHash } from 'node:crypto'

const sha = (w: string) => createHash('sha256').update(w).digest('hex')

/** Belgisch nummer naar internationaal formaat zonder +, zoals Meta het wil: 0470 12 34 56 → 32470123456 */
export function normaliseerTelefoon(t: string): string {
  let c = t.replace(/[^\d+]/g, '')
  if (c.startsWith('+')) c = c.slice(1)
  else if (c.startsWith('00')) c = c.slice(2)
  else if (c.startsWith('0')) c = '32' + c.slice(1)
  return c
}

export type MetaServerGebeurtenis = {
  naam: 'Lead' | 'Contact'
  eventId: string
  sessionId: string
  email?: string | null
  telefoon?: string | null
  fbp?: string
  fbc?: string
  url?: string
  ip?: string | null
  userAgent?: string | null
}

/** De payload zoals Meta hem verwacht (los, om te kunnen testen zonder iets te versturen) */
export function metaPayload(g: MetaServerGebeurtenis) {
  const user_data: Record<string, unknown> = { external_id: [sha(g.sessionId)] }
  if (g.email) user_data.em = [sha(g.email.trim().toLowerCase())]
  if (g.telefoon) user_data.ph = [sha(normaliseerTelefoon(g.telefoon))]
  if (g.fbp) user_data.fbp = g.fbp
  if (g.fbc) user_data.fbc = g.fbc
  if (g.ip) user_data.client_ip_address = g.ip
  if (g.userAgent) user_data.client_user_agent = g.userAgent
  return {
    data: [{
      event_name: g.naam,
      event_time: Math.floor(Date.now() / 1000),
      event_id: g.eventId,
      action_source: 'website',
      event_source_url: g.url,
      user_data,
    }],
    ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}),
  }
}

/** Stuurt de gebeurtenis; faalt nooit hard (een aanvraag mag hier nooit op stuklopen) */
export async function stuurMetaGebeurtenis(g: MetaServerGebeurtenis): Promise<void> {
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID
  const token = process.env.META_CAPI_TOKEN
  if (!pixel || !token) return
  const versie = process.env.META_GRAPH_VERSION ?? 'v26.0'
  try {
    const res = await fetch(`https://graph.facebook.com/${versie}/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metaPayload(g)),
    })
    if (!res.ok) console.error('[meta-capi]', g.naam, res.status, (await res.text()).slice(0, 300))
  } catch (err) {
    console.error('[meta-capi]', g.naam, err)
  }
}

/** IP en browser van de bezoeker uit het verzoek (Vercel zet het echte IP vooraan in x-forwarded-for) */
export function bezoekerUit(request: Request) {
  return {
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: request.headers.get('user-agent'),
  }
}
