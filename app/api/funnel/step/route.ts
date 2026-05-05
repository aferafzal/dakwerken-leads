import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendLeadEmail } from '@/lib/notifications'
import {
  funnelStapEmail,
  funnelStapVragenlijst,
  funnelStapTelefoon,
} from '@/lib/validations'

// POST /api/funnel/step
// Body: { stap: 'email' | 'vragenlijst' | 'telefoon', sessionId: string, data: {...} }
//
// 'email'       → maakt nieuwe lead aan (status='warm'), returned id
// 'vragenlijst' → update lead met opt-in antwoorden (status='engaged')
// 'telefoon'    → update lead met telefoon (status='hot') + trigger email naar eigenaar
export async function POST(request: Request) {
  let body: { stap?: string; sessionId?: string; data?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 })
  }

  const { stap, sessionId, data } = body
  if (!stap || !sessionId || !data) {
    return NextResponse.json({ error: 'stap, sessionId en data zijn vereist' }, { status: 400 })
  }

  const supabase = await createClient()

  // ── Stap 1: Email-capture → maak nieuwe lead ─────────────────────
  if (stap === 'email') {
    const parsed = funnelStapEmail.safeParse(data)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validatiefout', details: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data

    try {
      const { data: inserted, error } = await supabase
        .from('leads')
        .insert({
          email:           d.email,
          adres:           d.adres ?? null,
          gemeente:        d.gemeente ?? null,
          gdpr_consent:    d.gdpr_consent,
          followup_consent: false,
          status:          'warm',
          session_id:      sessionId,
          dak_data:        d.dak_data ?? null,
          ...(d.dakOppervlakte ? { dak_oppervlakte: d.dakOppervlakte } : {}),
        })
        .select('id')
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, id: inserted?.id })
    } catch (err) {
      console.error('[funnel/step:email]', err)
      const msg = err instanceof Error ? err.message : String(err)
      return NextResponse.json({ error: 'Opslaan mislukt', detail: msg }, { status: 500 })
    }
  }

  // ── Stap 2: Vragenlijst → update bestaande lead ──────────────────
  if (stap === 'vragenlijst') {
    const parsed = funnelStapVragenlijst.safeParse(data)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validatiefout', details: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data

    try {
      const { error } = await supabase
        .from('leads')
        .update({
          bouwjaar:          d.bouwjaar          ?? null,
          laatste_dakwerken: d.laatste_dakwerken ?? null,
          lekkage_recent:    d.lekkage_recent    ?? null,
          status:            'engaged',
        })
        .eq('session_id', sessionId)

      if (error) throw error
      return NextResponse.json({ success: true })
    } catch (err) {
      console.error('[funnel/step:vragenlijst]', err)
      const msg = err instanceof Error ? err.message : String(err)
      return NextResponse.json({ error: 'Update mislukt', detail: msg }, { status: 500 })
    }
  }

  // ── Stap 3: Telefoon → update + trigger eigenaar-notificatie ─────
  if (stap === 'telefoon') {
    const parsed = funnelStapTelefoon.safeParse(data)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validatiefout', details: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data

    try {
      const { data: updated, error } = await supabase
        .from('leads')
        .update({
          naam:             d.naam,
          telefoon:         d.telefoon,
          probleem:         d.probleem ?? null,
          urgentie:         d.urgentie ?? null,
          followup_consent: d.followup_consent,
          status:           'hot',
        })
        .eq('session_id', sessionId)
        .select('id, email, adres, gemeente, dak_oppervlakte')
        .single()

      if (error) throw error

      // Notificatie naar eigenaar (niet-blokkerend)
      if (updated) {
        sendLeadEmail({
          id:               updated.id,
          naam:             d.naam,
          telefoon:         d.telefoon,
          email:            updated.email ?? '',
          adres:            updated.adres ?? '',
          gemeente:         updated.gemeente ?? '',
          probleem:         d.probleem ?? 'anders',
          urgentie:         d.urgentie ?? 3,
          opmerking:        d.beste_tijd ? `Beste tijd om te bellen: ${d.beste_tijd}` : '',
          dakOppervlakte:   updated.dak_oppervlakte ?? undefined,
          gdpr_consent:     true,
          followup_consent: d.followup_consent,
        }).catch((err) => console.error('[funnel/step:telefoon] email:', err))
      }

      return NextResponse.json({ success: true, id: updated?.id })
    } catch (err) {
      console.error('[funnel/step:telefoon]', err)
      const msg = err instanceof Error ? err.message : String(err)
      return NextResponse.json({ error: 'Update mislukt', detail: msg }, { status: 500 })
    }
  }

  return NextResponse.json({ error: `Onbekende stap: ${stap}` }, { status: 400 })
}
