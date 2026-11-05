'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { isBeheerder } from '@/lib/beheer-auth'
import { isOpvolging, OPVOLGING } from '@/lib/opvolging'
import { leesAanvraag, voegTijdlijnToe, wijzigAanvragen, wisAanvragen, zetEersteReactie } from '@/lib/dashboard/gegevens'
import { VOLGENDE_ACTIES } from '@/lib/dashboard/weergave'

export type OpvolgResultaat = { ok: true; op: string } | { ok: false; fout: string }
export type Resultaat = { ok: true } | { ok: false; fout: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NIET_AANGEMELD = 'U bent niet aangemeld. Herlaad de pagina.'
const label = (w: string) => OPVOLGING.find((o) => o.waarde === w)?.label ?? w

// Server Actions zijn rechtstreeks bereikbaar: daarom in elke actie opnieuw de login controleren, niet alleen in proxy.ts.
async function aangemeld() {
  return isBeheerder((await headers()).get('authorization'))
}
function geldigeIds(ids: unknown): string[] | null {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 200) return null
  return ids.every((i) => typeof i === 'string' && UUID.test(i)) ? (ids as string[]) : null
}
function vernieuw(ids: string[]) {
  revalidatePath('/dashboard')
  for (const id of ids) revalidatePath(`/dashboard/aanvraag/${id}`)
}

/** Opvolgstatus en notitie van één aanvraag (formulier in LeadOpvolging) */
export async function bewaarOpvolging(_vorige: OpvolgResultaat | null, formData: FormData): Promise<OpvolgResultaat> {
  if (!(await aangemeld())) return { ok: false, fout: NIET_AANGEMELD }

  const id = String(formData.get('id') ?? '')
  const opvolging = formData.get('opvolging')
  const notitie = String(formData.get('notitie') ?? '').trim().slice(0, 2000)
  if (!UUID.test(id) || !isOpvolging(opvolging)) return { ok: false, fout: 'Ongeldige gegevens.' }

  const op = new Date().toISOString()
  try {
    const voor = await leesAanvraag(id)
    if (!voor) return { ok: false, fout: 'Deze aanvraag bestaat niet meer.' }
    await wijzigAanvragen([id], { opvolging, notitie: notitie || null, opvolging_op: op })
    const regels = []
    if ((voor.opvolging ?? 'nieuw') !== opvolging) {
      regels.push({ lead_id: id, soort: 'status', door: 'team' as const, samenvatting: `Status: ${label(opvolging)}`, data: { van: voor.opvolging ?? 'nieuw', naar: opvolging } })
      if (opvolging !== 'nieuw') await zetEersteReactie([id], op)
    }
    if ((voor.notitie ?? '') !== notitie && notitie) {
      regels.push({ lead_id: id, soort: 'notitie', door: 'team' as const, samenvatting: notitie.slice(0, 300), data: null })
    }
    await voegTijdlijnToe(regels)
  } catch (err) {
    console.error('[dashboard/opvolging]', err)
    return { ok: false, fout: 'Bewaren mislukt. Probeer het opnieuw.' }
  }

  vernieuw([id])
  return { ok: true, op }
}

/** Status van meerdere aanvragen tegelijk */
export async function zetStatus(ids: unknown, opvolging: unknown): Promise<Resultaat> {
  if (!(await aangemeld())) return { ok: false, fout: NIET_AANGEMELD }
  const geldig = geldigeIds(ids)
  if (!geldig || !isOpvolging(opvolging)) return { ok: false, fout: 'Ongeldige gegevens.' }
  const op = new Date().toISOString()
  try {
    await wijzigAanvragen(geldig, { opvolging, opvolging_op: op })
    if (opvolging !== 'nieuw') await zetEersteReactie(geldig, op)
    await voegTijdlijnToe(geldig.map((id) => ({ lead_id: id, soort: 'status', door: 'team' as const, samenvatting: `Status: ${label(opvolging)}`, data: { naar: opvolging } })))
  } catch (err) {
    console.error('[dashboard/status]', err)
    return { ok: false, fout: 'Bewaren mislukt. Probeer het opnieuw.' }
  }
  vernieuw(geldig)
  return { ok: true }
}

/** Naar het archief (of terug). Niets wordt gewist. */
export async function archiveer(ids: unknown, terug = false): Promise<Resultaat> {
  if (!(await aangemeld())) return { ok: false, fout: NIET_AANGEMELD }
  const geldig = geldigeIds(ids)
  if (!geldig) return { ok: false, fout: 'Ongeldige gegevens.' }
  try {
    await wijzigAanvragen(geldig, { gearchiveerd_op: terug ? null : new Date().toISOString() })
    await voegTijdlijnToe(geldig.map((id) => ({
      lead_id: id, soort: terug ? 'herstel' : 'archief', door: 'team' as const, samenvatting: terug ? 'Teruggezet uit het archief' : 'Gearchiveerd', data: null,
    })))
  } catch (err) {
    console.error('[dashboard/archief]', err)
    return { ok: false, fout: 'Archiveren mislukt. Is migratie 021 uitgevoerd?' }
  }
  vernieuw(geldig)
  return { ok: true }
}

/** Definitief wissen, met de tijdlijn en de mails. Enkel met het woord WISSEN als bevestiging. */
export async function wisDefinitief(ids: unknown, bevestiging: unknown): Promise<Resultaat> {
  if (!(await aangemeld())) return { ok: false, fout: NIET_AANGEMELD }
  const geldig = geldigeIds(ids)
  if (!geldig) return { ok: false, fout: 'Ongeldige gegevens.' }
  if (String(bevestiging ?? '').trim().toUpperCase() !== 'WISSEN') return { ok: false, fout: 'Typ WISSEN om te bevestigen.' }
  try {
    await wisAanvragen(geldig)
  } catch (err) {
    console.error('[dashboard/wissen]', err)
    return { ok: false, fout: 'Wissen mislukt. Probeer het opnieuw.' }
  }
  revalidatePath('/dashboard')
  return { ok: true }
}

/** Wat er als volgende moet gebeuren, en wanneer. Leeg = gedaan. */
export async function zetVolgendeActie(id: unknown, actie: unknown, op: unknown): Promise<Resultaat> {
  if (!(await aangemeld())) return { ok: false, fout: NIET_AANGEMELD }
  if (typeof id !== 'string' || !UUID.test(id)) return { ok: false, fout: 'Ongeldige gegevens.' }
  const wis = actie === null || actie === ''
  const tekst = wis ? null : String(actie).trim().slice(0, 120)
  const moment = wis ? null : new Date(String(op))
  if (!wis && (!tekst || !moment || Number.isNaN(moment.getTime()))) return { ok: false, fout: 'Kies een actie en een moment.' }
  try {
    const voor = await leesAanvraag(id)
    await wijzigAanvragen([id], { volgende_actie: tekst, volgende_actie_op: moment?.toISOString() ?? null })
    const tijd = moment?.toLocaleString('nl-BE', { timeZone: 'Europe/Brussels', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    await voegTijdlijnToe([{
      lead_id: id, soort: 'volgende_actie', door: 'team',
      samenvatting: wis ? `Gedaan: ${voor?.volgende_actie ?? 'volgende actie'}` : `Gepland: ${tekst} · ${tijd}`,
      data: wis ? null : { actie: tekst, op: moment!.toISOString(), vast: (VOLGENDE_ACTIES as readonly string[]).includes(tekst!) },
    }])
  } catch (err) {
    console.error('[dashboard/volgende-actie]', err)
    return { ok: false, fout: 'Bewaren mislukt. Is migratie 021 uitgevoerd?' }
  }
  vernieuw([id])
  return { ok: true }
}
