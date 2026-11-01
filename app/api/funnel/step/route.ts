import { after, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendNieuweAanvraag, sendRapportEmail, sendTerugbelAanvraag } from '@/lib/notifications'
import {
  funnelStapEmail,
  funnelStapVragenlijst,
  funnelStapTelefoon,
} from '@/lib/validations'

// POST /api/funnel/step
// Body: { stap: 'email' | 'vragenlijst' | 'telefoon', sessionId: string, data: {...} }
//
// 'email'       → maakt nieuwe lead aan (status='warm'), returned id; rapportmail naar de bezoeker + melding naar de eigenaar
// 'vragenlijst' → update lead met opt-in antwoorden (status='engaged')
// 'telefoon'    → update lead met telefoon (status='hot') + melding 'bel terug' naar de eigenaar
//
// Mails gaan via after(): ze blokkeren het antwoord niet, en op Vercel loopt de functie door tot ze verstuurd zijn.
// (Een losse promise zonder await kan wegvallen zodra het antwoord vertrokken is.)
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
    const lead = {
      sessionId,
      email:       d.email,
      adres:       d.adres ?? null,
      gemeente:    d.gemeente ?? null,
      oppervlakte: d.dakOppervlakte ?? null,
      dakData:     d.dak_data ?? null,
    }

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
          ...(d.bouwjaar ? { bouwjaar: d.bouwjaar } : {}),
          ...(d.type_werken?.length ? { type_werken: d.type_werken } : {}),
          ...(d.lekkage_recent ? { lekkage_recent: d.lekkage_recent } : {}),
        })
        .select('id')
        .single()

      if (error) throw error

      after(() => Promise.all([sendRapportEmail(lead), sendNieuweAanvraag(lead)]))

      return NextResponse.json({ success: true, id: inserted?.id })
    } catch (err) {
      console.error('[funnel/step:email]', err)
      // Vangnet: de databank faalde (bv. gepauzeerd). De eigenaar krijgt de aanvraag toch, om zelf op te volgen.
      after(() => sendNieuweAanvraag(lead, true))
      return NextResponse.json({ error: 'Opslaan mislukt' }, { status: 500 })
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
          type_werken:       d.type_werken       ?? null,
          status:            'engaged',
        })
        .eq('session_id', sessionId)

      if (error) throw error
      return NextResponse.json({ success: true })
    } catch (err) {
      console.error('[funnel/step:vragenlijst]', err)
      return NextResponse.json({ error: 'Update mislukt' }, { status: 500 })
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
        .select('id, email, adres, gemeente, dak_oppervlakte, dak_data')
        .single()

      if (error) throw error

      if (updated) {
        after(() => sendTerugbelAanvraag({
          sessionId,
          email:       updated.email ?? null,
          adres:       updated.adres ?? null,
          gemeente:    updated.gemeente ?? null,
          oppervlakte: updated.dak_oppervlakte ?? null,
          dakData:     updated.dak_data ?? null,
          naam:        d.naam,
          telefoon:    d.telefoon,
          besteTijd:   d.beste_tijd,
        }))
      }

      return NextResponse.json({ success: true, id: updated?.id })
    } catch (err) {
      console.error('[funnel/step:telefoon]', err)
      after(() => sendTerugbelAanvraag({
        sessionId, email: null, adres: null, gemeente: null, oppervlakte: null, dakData: null,
        naam: d.naam, telefoon: d.telefoon, besteTijd: d.beste_tijd,
      }, true))
      return NextResponse.json({ error: 'Update mislukt' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: `Onbekende stap: ${stap}` }, { status: 400 })
}
