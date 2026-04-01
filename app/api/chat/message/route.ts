import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const messageSchema = z.object({
  conversation_id: z.string().uuid(),
  inhoud: z.string().min(1).max(2000),
  van: z.enum(['klant', 'ons'] as const),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 })
  }

  const parsed = messageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validatiefout' }, { status: 422 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('messages')
    .insert(parsed.data)
    .select('id, created_at')
    .single()

  if (error) {
    console.error('[chat/message]', error)
    return NextResponse.json({ error: 'Database fout' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id, created_at: data.created_at })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversation_id')

  if (!conversationId) {
    return NextResponse.json({ error: 'conversation_id vereist' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('messages')
    .select('id, inhoud, van, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Database fout' }, { status: 500 })
  }

  return NextResponse.json(data)
}
