import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const startSchema = z.object({
  naam: z.string().min(2, 'Naam is verplicht'),
  email: z.string().email().optional().or(z.literal('')),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 })
  }

  const parsed = startSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validatiefout' }, { status: 422 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('conversations')
    .insert({ naam: parsed.data.naam, email: parsed.data.email || null })
    .select('id')
    .single()

  if (error) {
    console.error('[chat/start]', error)
    return NextResponse.json({ error: 'Database fout' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
