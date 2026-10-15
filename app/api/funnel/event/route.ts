import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// POST /api/funnel/event
// Anonieme funnelstatistiek: { sessionId, stap }. Geen persoonsgegevens.
// Faalt altijd stil: statistiek mag de funnel nooit hinderen.
const eventSchema = z.object({
  sessionId: z.string().min(8).max(64),
  stap: z.enum(['adres', 'scan', 'preview', 'email', 'vragenlijst', 'telefoon', 'klaar'] as const),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new NextResponse(null, { status: 400 })
  }

  const parsed = eventSchema.safeParse(body)
  if (!parsed.success) return new NextResponse(null, { status: 422 })

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('funnel_events')
      .insert({ session_id: parsed.data.sessionId, stap: parsed.data.stap })
    if (error) console.error('[funnel/event]', error.message)
  } catch (err) {
    console.error('[funnel/event]', err)
  }

  return new NextResponse(null, { status: 204 })
}
