'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isBeheerder } from '@/lib/beheer-auth'
import { isOpvolging } from '@/lib/opvolging'

export type OpvolgResultaat = { ok: true; op: string } | { ok: false; fout: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Opvolging en notitie van één aanvraag bewaren. Server Actions zijn rechtstreeks bereikbaar:
// daarom hier opnieuw de login controleren, niet alleen in proxy.ts.
export async function bewaarOpvolging(_vorige: OpvolgResultaat | null, formData: FormData): Promise<OpvolgResultaat> {
  if (!isBeheerder((await headers()).get('authorization'))) return { ok: false, fout: 'U bent niet aangemeld. Herlaad de pagina.' }

  const id = String(formData.get('id') ?? '')
  const opvolging = formData.get('opvolging')
  const notitie = String(formData.get('notitie') ?? '').trim().slice(0, 2000)
  if (!UUID.test(id) || !isOpvolging(opvolging)) return { ok: false, fout: 'Ongeldige gegevens.' }

  const op = new Date().toISOString()
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('leads')
      .update({ opvolging, notitie: notitie || null, opvolging_op: op })
      .eq('id', id)
    if (error) throw error
  } catch (err) {
    console.error('[dashboard/opvolging]', err)
    return { ok: false, fout: 'Bewaren mislukt. Probeer het opnieuw.' }
  }

  revalidatePath('/dashboard')
  return { ok: true, op }
}
