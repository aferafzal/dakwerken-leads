import { NextResponse } from 'next/server'
import { leadSchema } from '@/lib/validations'
import { createClient } from '@/lib/supabase/server'
import { sendLeadEmail } from '@/lib/notifications'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 })
  }

  const parsed = leadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validatiefout', details: parsed.error.flatten() }, { status: 422 })
  }

  const data = parsed.data

  // Opslaan in Supabase
  let leadId: string | undefined
  try {
    const supabase = await createClient()
    const { data: inserted, error } = await supabase
      .from('leads')
      .insert({
        naam: data.naam,
        telefoon: data.telefoon,
        email: data.email || null,
        adres: data.adres || null,
        gemeente: data.gemeente,
        probleem: data.probleem,
        urgentie: data.urgentie,
        opmerking: data.opmerking || null,
        gdpr_consent: data.gdpr_consent,
        followup_consent: data.followup_consent,
      })
      .select('id')
      .single()

    if (error) throw error
    leadId = inserted?.id
  } catch (err) {
    console.error('[leads] Supabase error:', err)
    // Ga door met notificaties ook al mislukt DB opslag
  }

  // Stuur e-mail notificatie (niet-blokkerend)
  if (leadId) {
    sendLeadEmail({ ...data, id: leadId }).catch((err) =>
      console.error('[leads] Email error:', err)
    )
  }

  return NextResponse.json({ success: true, id: leadId ?? null })
}
