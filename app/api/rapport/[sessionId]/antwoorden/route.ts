import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// POST /api/rapport/[sessionId]/antwoorden
// Antwoorden uit "Maak mijn prijs nauwkeuriger" in het rapport bewaren. De link van het rapport
// is de sleutel (zoals voor het rapport zelf). Het rapport rekent de prijs opnieuw uit bij het tonen.

const aantal = z.number().int().min(0).max(60).nullable().optional()
const antwoordenSchema = z.object({
  werken: z.array(z.enum(['dakbedekking', 'isolatie', 'plat_dak', 'goten', 'lekkage', 'advies'])).max(6).optional(),
  materiaal: z.enum(['betonpannen', 'keramische_pannen', 'natuurleien', 'kunstleien', 'golfplaten', 'epdm', 'roofing', 'zink', 'weet_niet']).optional(),
  bouwjaar: z.enum(['voor_1980', '1980_2000', '2000_2015', 'na_2015', 'onbekend']).optional(),
  isolatie: z.enum(['geen', 'beetje', 'goed', 'weet_niet']).optional(),
  zolder: z.enum(['bewoond', 'niet_bewoond', 'weet_niet']).optional(),
  dakramen: aantal,
  dakkapellen: aantal,
  schoorstenen: aantal,
  zonnepanelen: aantal,
  woningtype: z.enum(['vrijstaand', 'halfopen', 'rij', 'weet_niet']).optional(),
  goot: z.enum(['zink', 'pvc', 'bakgoot', 'weet_niet']).optional(),
  start: z.enum(['zo_snel_mogelijk', 'binnen_3_maanden', 'dit_jaar', 'orienterend']).optional(),
})
const bodySchema = z.object({ antwoorden: antwoordenSchema, verfijnd: z.boolean().optional() })

const NAAR_TYPE = {
  dakbedekking: 'pannen', isolatie: 'isolatie', plat_dak: 'plat_dak', goten: 'dakgoten', lekkage: 'lekkage_onderzoek', advies: 'advies',
} as const

export async function POST(request: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params
  if (!/^[A-Za-z0-9-]{8,64}$/.test(sessionId)) return NextResponse.json({ error: 'Ongeldig rapport' }, { status: 400 })

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Ongeldige gegevens' }, { status: 400 }) }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Ongeldige antwoorden' }, { status: 422 })
  const { antwoorden, verfijnd } = parsed.data

  try {
    const supabase = await createClient()
    const { data: lead, error: leesFout } = await supabase
      .from('leads')
      .select('id, status, dak_data')
      .eq('session_id', sessionId)
      .single<{ id: string; status: string | null; dak_data: Record<string, unknown> | null }>()
    if (leesFout || !lead) return NextResponse.json({ error: 'Rapport niet gevonden' }, { status: 404 })

    const dakData = { ...(lead.dak_data ?? {}), antwoorden, ...(verfijnd ? { verfijnd: true } : {}) }
    const { error } = await supabase
      .from('leads')
      .update({
        dak_data: dakData,
        ...(antwoorden.bouwjaar ? { bouwjaar: antwoorden.bouwjaar } : {}),
        ...(antwoorden.werken?.length ? { type_werken: antwoorden.werken.map((w) => NAAR_TYPE[w]) } : {}),
        ...(antwoorden.werken?.includes('lekkage') ? { lekkage_recent: 'ja' } : {}),
        // Wie zijn prijs verfijnt, toont interesse; een lead gaat nooit omlaag in status
        ...(lead.status === 'warm' ? { status: 'engaged' } : {}),
      })
      .eq('id', lead.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[rapport/antwoorden]', err)
    return NextResponse.json({ error: 'Bewaren mislukt' }, { status: 500 })
  }
}
