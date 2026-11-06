'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { isBeheerder } from '@/lib/beheer-auth'
import { isOpvolging, OPVOLGING } from '@/lib/opvolging'
import {
  bewaarBericht, isVoorbeeld, leesAanvraag, leesBerichten, voegTijdlijnToe, wijzigAanvragen, wisAanvragen, zetEersteReactie,
} from '@/lib/dashboard/gegevens'
import { opvolgingVan, oppervlakteVan, prijsVan, START_LABEL, voornaamUitEmail, voornaamVan, VOLGENDE_ACTIES, werkenVan } from '@/lib/dashboard/weergave'
import { isMailSoort, maakConceptTekst, MAIL_SOORTEN, welkeAi } from '@/lib/ai/concept'
import { sendKlantMail } from '@/lib/notifications'
import { AFZENDER } from '@/lib/bedrijf'

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

// ─── Mail aan de klant ─────────────────────────────────────────────────

export type ConceptResultaat = { ok: true; onderwerp: string; tekst: string; bron: string } | { ok: false; fout: string }

/** Een AI schrijft een concept. Er wordt niets verstuurd. */
export async function maakConcept(id: unknown, soort: unknown, instructie: unknown): Promise<ConceptResultaat> {
  if (!(await aangemeld())) return { ok: false, fout: NIET_AANGEMELD }
  if (typeof id !== 'string' || !UUID.test(id) || !isMailSoort(soort)) return { ok: false, fout: 'Ongeldige gegevens.' }
  const extra = String(instructie ?? '').trim().slice(0, 1000)
  if (soort === 'vrij' && !extra) return { ok: false, fout: 'Schrijf bij "Eigen bericht" kort wat er in de mail moet staan.' }

  try {
    const l = await leesAanvraag(id)
    if (!l) return { ok: false, fout: 'Deze aanvraag bestaat niet meer.' }
    const prijs = prijsVan(l)
    const eerder = (await leesBerichten(id)).filter((b) => b.richting === 'uit')
    const concept = await maakConceptTekst({
      soort,
      instructie: extra,
      afzender: AFZENDER.naam,
      telefoon: AFZENDER.telefoon,
      klant: {
        voornaam: voornaamVan(l),
        voornaamUitEmail: voornaamUitEmail(l.email),
        gemeente: l.gemeente,
        adres: l.adres,
        werken: werkenVan(l),
        prijs: prijs ? { min: prijs.min, max: prijs.max, btwInbegrepen: false } : null,
        oppervlakte: oppervlakteVan(l),
        start: l.dak_data?.antwoorden?.start ? START_LABEL[l.dak_data.antwoorden.start] ?? null : null,
        wilGebeldWorden: !!l.telefoon,
        status: label(opvolgingVan(l)),
      },
      eerdereMails: eerder.map((b) => ({ onderwerp: b.onderwerp, inhoud: b.inhoud, datum: b.created_at.slice(0, 10) })),
    })
    return { ok: true, ...concept }
  } catch (err) {
    console.error('[dashboard/concept]', err)
    const m = String((err as { message?: string })?.message ?? err)
    if (/402|RESOURCE_EXHAUSTED|credit|quota|insufficient/i.test(m)) {
      return { ok: false, fout: `Het tegoed van de AI (${welkeAi() ?? 'AI'}) is op. Laad tegoed op bij de aanbieder, of schrijf de mail zelf.` }
    }
    if (/401|403|API key|invalid.*key|PERMISSION/i.test(m)) {
      return { ok: false, fout: `De AI-sleutel (${welkeAi() ?? 'AI'}) werkt niet. Kijk de sleutel na in Vercel, of schrijf de mail zelf.` }
    }
    return { ok: false, fout: 'De AI gaf geen bruikbaar concept. Probeer het opnieuw, of schrijf de mail zelf.' }
  }
}

/** De mail versturen zoals Afer ze nalas. Vanaf info@, met een kopie in info@, en bewaard in de tijdlijn. */
export async function verstuurMail(id: unknown, onderwerp: unknown, tekst: unknown, soort: unknown, metAi: unknown): Promise<Resultaat> {
  if (!(await aangemeld())) return { ok: false, fout: NIET_AANGEMELD }
  if (typeof id !== 'string' || !UUID.test(id)) return { ok: false, fout: 'Ongeldige gegevens.' }
  const ond = String(onderwerp ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 160)
  const inhoud = String(tekst ?? '').replace(/\r\n/g, '\n').trim().slice(0, 8000)
  if (!ond) return { ok: false, fout: 'Vul een onderwerp in.' }
  if (inhoud.length < 10) return { ok: false, fout: 'De mail is leeg.' }

  try {
    const l = await leesAanvraag(id)
    if (!l) return { ok: false, fout: 'Deze aanvraag bestaat niet meer.' }
    if (!l.email) return { ok: false, fout: 'Deze aanvraag heeft geen e-mailadres.' }

    // In de voorbeeldmodus gaat de mail naar het testadres van Resend, nooit naar het verzonnen adres
    const aan = isVoorbeeld() ? 'delivered@resend.dev' : l.email
    const ok = await sendKlantMail({ aan, onderwerp: ond, tekst: inhoud, kopie: !isVoorbeeld() })
    if (!ok) return { ok: false, fout: 'Versturen mislukt. Er is niets verstuurd; probeer het opnieuw.' }
    await naVersturen(l, id, aan, ond, inhoud, soort, metAi === true)
  } catch (err) {
    console.error('[dashboard/mail]', err)
    return { ok: false, fout: 'Versturen mislukt. Probeer het opnieuw.' }
  }
  vernieuw([id])
  return { ok: true }
}

/** Na een geslaagde verzending: bewaren en status bijwerken. Een fout hier mag nooit "mislukt" melden (de mail is weg). */
async function naVersturen(l: NonNullable<Awaited<ReturnType<typeof leesAanvraag>>>, id: string, _aan: string, ond: string, inhoud: string, soort: unknown, metAi: boolean) {
  try {
    const op = new Date().toISOString()
    const soortLabel = MAIL_SOORTEN.find((m) => m.sleutel === soort)?.label
    await bewaarBericht({
      lead_id: id, kanaal: 'email', richting: 'uit', van: 'info@dakwerken-oostvlaanderen.be', aan: l.email,
      onderwerp: ond, inhoud, verstuurd_door: metAi ? 'ai' : 'team',
    })
    await voegTijdlijnToe([{
      lead_id: id, soort: 'mail_uit', door: 'team',
      samenvatting: `Mail verstuurd: ${ond}`,
      data: { soort: soortLabel ?? null, ai_concept: metAi },
    }])
    await zetEersteReactie([id], op)
    // De eerste mail aan een nieuwe aanvraag: status "Gecontacteerd"
    if (opvolgingVan(l) === 'nieuw') {
      await wijzigAanvragen([id], { opvolging: 'gecontacteerd', opvolging_op: op })
      await voegTijdlijnToe([{ lead_id: id, soort: 'status', door: 'team', samenvatting: `Status: ${label('gecontacteerd')}`, data: { van: 'nieuw', naar: 'gecontacteerd' } }])
    }
  } catch (err) {
    console.error('[dashboard/mail:na]', err)
  }
}
