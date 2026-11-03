import { after, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendNieuweAanvraag, sendRapportEmail, sendTerugbelAanvraag } from '@/lib/notifications'
import {
  funnelStapEmail,
  funnelStapVragenlijst,
  funnelStapTelefoon,
  metaVanBrowser,
} from '@/lib/validations'
import { bezoekerUit, stuurMetaGebeurtenis } from '@/lib/meta-capi'

// POST /api/funnel/step
// Body: { stap: 'email' | 'vragenlijst' | 'telefoon', sessionId: string, data: {...} }
//
// 'email'       → maakt nieuwe lead aan (status='warm'), returned id; rapportmail naar de bezoeker + melding naar de eigenaar
// 'vragenlijst' → update lead met opt-in antwoorden (status='engaged')
// 'telefoon'    → update lead met telefoon (status='hot') + melding 'bel terug' naar de eigenaar
//
// Mails gaan via after(): ze blokkeren het antwoord niet, en op Vercel loopt de functie door tot ze verstuurd zijn.
// (Een losse promise zonder await kan wegvallen zodra het antwoord vertrokken is.)
// Gaf de bezoeker toestemming voor marketingcookies (body.meta.toestemming), dan gaat de aanvraag ook naar de
// Meta Conversions API (lib/meta-capi.ts), eveneens via after().
export async function POST(request: Request) {
  let body: { stap?: string; sessionId?: string; data?: unknown; meta?: unknown }
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
  const metaParsed = metaVanBrowser.safeParse(body.meta)
  const meta = metaParsed.success && metaParsed.data?.toestemming ? metaParsed.data : null

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
      const rij = {
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
      }
      const herkomst = {
        ...(d.herkomst && Object.keys(d.herkomst).length ? { herkomst: d.herkomst } : {}),
        marketing_toestemming: !!meta,
      }
      let { data: inserted, error } = await supabase.from('leads').insert({ ...rij, ...herkomst }).select('id').single()
      // Migratie 010 (herkomst) nog niet uitgevoerd: de aanvraag gaat altijd voor, dan zonder herkomst
      if (error && /herkomst|marketing_toestemming/.test(error.message ?? '')) {
        console.warn('[funnel/step:email] kolommen herkomst ontbreken, bewaard zonder herkomst (migratie 010)')
        ;({ data: inserted, error } = await supabase.from('leads').insert(rij).select('id').single())
      }

      if (error) throw error

      after(() => Promise.all([
        sendRapportEmail(lead),
        sendNieuweAanvraag(lead),
        meta ? stuurMetaGebeurtenis({ naam: 'Lead', eventId: `${sessionId}-lead`, sessionId, email: d.email, fbp: meta.fbp, fbc: meta.fbc, url: meta.url, ...bezoekerUit(request) }) : null,
      ]))

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
      // Een bezoeker kan in hetzelfde tabblad meer dan één rapport aanvragen (zelfde sessionId):
      // de telefoonstap hoort bij de laatste aanvraag. Zonder dit gaf .single() een fout bij 2+ rijen.
      const { data: laatste, error: zoekFout } = await supabase
        .from('leads')
        .select('id')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (zoekFout) throw zoekFout
      if (!laatste) throw new Error(`geen aanvraag voor sessie ${sessionId}`)

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
        .eq('id', laatste.id)
        .select('id, email, adres, gemeente, dak_oppervlakte, dak_data')
        .single()

      if (error) throw error

      if (updated && meta) {
        after(() => stuurMetaGebeurtenis({
          naam: 'Contact', eventId: `${sessionId}-contact`, sessionId,
          email: updated.email ?? null, telefoon: d.telefoon, fbp: meta.fbp, fbc: meta.fbc, url: meta.url, ...bezoekerUit(request),
        }))
      }

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
