import { Resend, type CreateEmailOptions } from 'resend'
import { AFZENDER, BEDRIJF } from './bedrijf'
import { berekenPrijs, werkOmschrijving, type Antwoorden, type DakMaten } from './prijsmodel'

// Eén afzender op het geverifieerde domein. RESEND_FROM_EMAIL staat enkel in productie;
// zonder viel de site terug op onboarding@resend.dev, en dat adres mag enkel naar de eigenaar van het Resend-account.
const AFZENDER_ADRES =
  process.env.RESEND_FROM_EMAIL?.match(/<([^>]+)>/)?.[1] ?? process.env.RESEND_FROM_EMAIL ?? 'noreply@dakwerken-oostvlaanderen.be'
const van = (naam: string) => `${naam} <${AFZENDER_ADRES}>`
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dakwerken-oostvlaanderen.be'

// Huisstijl van de site
const NAVY = '#0f172a'
const AMBER = '#f97316'

/** Gewone-tekstversie uit de HTML. Een mail met enkel HTML scoort slechter bij spamfilters (o.a. Hostinger). */
export function htmlNaarTekst(html: string): string {
  return html
    .replace(/<a [^>]*href="(?:mailto:|tel:)?([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, tekst: string) => {
      const t = tekst.replace(/<[^>]+>/g, '').trim()
      return t === href || href.startsWith('#') ? t : `${t} (${href})`
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/td>\s*<td[^>]*>/gi, ': ')
    .replace(/<\/(p|h[1-6]|tr|li|div|blockquote|table)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .split('\n').map((r) => r.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n')
}

/** Resend gooit geen fout bij een geweigerde mail: het antwoord bevat ze. Zonder deze controle faalt een mail stil. */
async function verstuur(bericht: CreateEmailOptions, wat: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[mail] RESEND_API_KEY ontbreekt: ${wat} niet verstuurd`)
    return false
  }
  // Elke mail krijgt ook een tekstversie (de rapportmail heeft er al een eigen)
  if (!bericht.text && typeof bericht.html === 'string') bericht = { ...bericht, text: htmlNaarTekst(bericht.html) } as CreateEmailOptions
  try {
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send(bericht)
    if (error) {
      console.error(`[mail] ${wat} geweigerd:`, error.name, error.message)
      return false
    }
    return true
  } catch (err) {
    console.error(`[mail] ${wat} mislukt:`, err)
    return false
  }
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const euro = (n: number) => `€${Math.round(n).toLocaleString('nl-BE')}`

// ─── Wat de funnel bewaart in dak_data (zie DakRapportFunnel) ─────────

type DakData = {
  antwoorden?: Antwoorden
  verfijnd?: boolean
  maten?: DakMaten
  prijs?: { min: number; max: number }
  nokhoogte?: number | null
  daktype?: string | null
  aantalGebouwen?: number
  erfgoed?: { naam: string }[]
  dakscan?: { dakvorm?: string; helling?: number } | null
}

export type LeadInfo = {
  sessionId: string
  email: string | null
  adres: string | null
  gemeente: string | null
  oppervlakte: number | null
  dakData: unknown
}

// Prijs zoals het rapport ze toont: herberekend uit de maten en de antwoorden
function prijsVan(d: DakData): { min: number; max: number; btw: boolean } | null {
  if (d.maten) {
    const p = berekenPrijs(d.maten, d.antwoorden ?? {})
    return p.max > 0 ? { min: p.min, max: p.max, btw: p.btwInbegrepen } : null
  }
  return d.prijs && d.prijs.max > 0 ? { ...d.prijs, btw: false } : null
}

export const LABEL: Record<string, Record<string, string>> = {
  houtwerk: { goed: 'in goede staat', slecht: 'rot, houtworm of doorbuiging', weet_niet: 'weet niet' },
  materiaal: {
    betonpannen: 'betonpannen', keramische_pannen: 'keramische pannen', natuurleien: 'natuurleien', kunstleien: 'kunstleien',
    golfplaten: 'golfplaten', epdm: 'EPDM', roofing: 'roofing', zink: 'zink', weet_niet: 'weet niet',
  },
  bouwjaar: { voor_1980: 'vóór 1980', '1980_2000': '1980–2000', '2000_2015': '2000–2015', na_2015: 'na 2015', onbekend: 'weet niet' },
  isolatie: { geen: 'niet geïsoleerd', beetje: 'een beetje', goed: 'goed geïsoleerd', weet_niet: 'weet niet' },
  zolder: { bewoond: 'bewoond of afgewerkt', niet_bewoond: 'niet bewoond', weet_niet: 'weet niet' },
  woningtype: { vrijstaand: 'vrijstaand', halfopen: 'halfopen', rij: 'rijwoning', weet_niet: 'weet niet' },
  goot: { zink: 'zink', pvc: 'PVC', bakgoot: 'bakgoot', weet_niet: 'weet niet' },
  start: { zo_snel_mogelijk: 'zo snel mogelijk', binnen_3_maanden: 'binnen drie maanden', dit_jaar: 'later dit jaar', orienterend: 'oriënteert zich nog' },
}
export const VRAAG: [keyof typeof LABEL, string][] = [
  ['start', 'Starten'], ['houtwerk', 'Houtwerk'], ['materiaal', 'Huidig materiaal'], ['bouwjaar', 'Bouwjaar'], ['isolatie', 'Isolatie nu'],
  ['zolder', 'Zolder'], ['woningtype', 'Woning'], ['goot', 'Dakgoot'],
]

function rij(label: string, waarde: string) {
  return `<tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top;white-space:nowrap">${label}</td><td style="padding:6px 0;color:${NAVY}">${waarde}</td></tr>`
}

const knop = (href: string, tekst: string, kleur = AMBER, tekstkleur = NAVY) =>
  `<a href="${href}" style="display:inline-block;background:${kleur};color:${tekstkleur};padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;margin:0 8px 8px 0">${tekst}</a>`

/** Alles wat we over de aanvraag weten, als tabel voor de mail aan de eigenaar */
function aanvraagTabel(lead: LeadInfo, d: DakData): string {
  const a = d.antwoorden ?? {}
  const prijs = prijsVan(d)
  const kaart = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lead.adres ?? ''} ${lead.gemeente ?? ''}`.trim())}`
  const dak = [
    lead.oppervlakte ? `±${lead.oppervlakte} m²` : null,
    d.maten && d.maten.plat >= 5 ? `waarvan ±${Math.round(d.maten.plat)} m² plat` : null,
    d.dakscan?.dakvorm ?? d.daktype ?? null,
    d.dakscan?.helling != null ? `helling ±${d.dakscan.helling}°` : null,
    d.nokhoogte ? `nok ±${(Math.round(d.nokhoogte * 10) / 10).toLocaleString('nl-BE')} m` : null,
    d.aantalGebouwen && d.aantalGebouwen > 1 ? `${d.aantalGebouwen} gebouwen` : null,
  ].filter(Boolean).join(' · ')
  const extra = [
    a.zonnepanelen != null ? `zonnepanelen: ${a.zonnepanelen === 0 ? 'geen' : a.zonnepanelen}` : null,
    ...VRAAG.filter(([k]) => a[k as keyof Antwoorden] != null).map(([k, label]) => `${label.toLowerCase()}: ${LABEL[k][String(a[k as keyof Antwoorden])] ?? a[k as keyof Antwoorden]}`),
  ].filter(Boolean)

  return `<table style="border-collapse:collapse;font-size:15px;line-height:1.45">
    ${lead.email ? rij('E-mail', `<a href="mailto:${esc(lead.email)}" style="color:${NAVY}">${esc(lead.email)}</a>`) : ''}
    ${rij('Adres', `${esc(lead.adres ?? lead.gemeente ?? 'onbekend')} · <a href="${kaart}" style="color:${NAVY}">kaart</a>`)}
    ${a.werken?.length ? rij('Wil laten doen', `<strong>${esc(werkOmschrijving(a).join(' · '))}</strong>`) : ''}
    ${prijs ? rij('Prijsindicatie', `${euro(prijs.min)} – ${euro(prijs.max)} ${prijs.btw ? 'incl.' : 'excl.'} btw${d.verfijnd ? ' (verfijnd met antwoorden)' : ''}`) : ''}
    ${dak ? rij('Dak', esc(dak)) : ''}
    ${extra.length ? rij('Antwoorden', esc(extra.join(' · '))) : ''}
    ${d.erfgoed?.length ? rij('Erfgoed', esc(d.erfgoed.map((e) => e.naam).join(', '))) : ''}
  </table>`
}

function eigenaarMail(kop: string, inleiding: string, lead: LeadInfo, d: DakData, metLinks = true): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:600px;color:${NAVY}">
    <h2 style="margin:0 0 4px;font-size:20px">${kop}</h2>
    <p style="margin:0 0 16px;color:#475569">${inleiding}</p>
    ${aanvraagTabel(lead, d)}
    ${metLinks ? `<p style="margin-top:20px">
      ${knop(`${SITE}/rapport/${encodeURIComponent(lead.sessionId)}`, 'Rapport van de klant')}
      ${knop(`${SITE}/dashboard`, 'Dashboard', NAVY, '#ffffff')}
    </p>` : ''}
  </div>`
}

// ─── Mails aan de eigenaar ─────────────────────────────────────────────

const NIET_BEWAARD = 'Let op: de databank gaf een fout. Deze aanvraag staat niet in het dashboard en de klant kreeg geen rapport. Neem zelf contact op.'

/** Elke nieuwe aanvraag: de bezoeker vroeg het rapport aan (e-mailadres gegeven). nietBewaard = vangnet als de databank faalde. */
export async function sendNieuweAanvraag(lead: LeadInfo, nietBewaard = false): Promise<boolean> {
  const ontvanger = process.env.OWNER_EMAIL
  if (!ontvanger) { console.warn('[mail] OWNER_EMAIL ontbreekt: geen melding van de aanvraag'); return false }
  const d = (lead.dakData ?? {}) as DakData
  const wat = d.antwoorden?.werken?.length ? werkOmschrijving(d.antwoorden)[0] : 'Dakrapport'
  return verstuur({
    from: van(`Aanvragen ${BEDRIJF.handelsnaam}`),
    to: ontvanger,
    ...(lead.email ? { replyTo: lead.email } : {}),
    subject: `${nietBewaard ? 'NIET BEWAARD · ' : ''}Nieuwe aanvraag: ${wat} · ${lead.adres ?? lead.gemeente ?? 'adres onbekend'}`,
    html: eigenaarMail(
      'Nieuwe aanvraag',
      nietBewaard ? `<strong style="color:#b91c1c">${NIET_BEWAARD}</strong>` : 'De bezoeker vroeg het dakrapport aan. Wil die gebeld worden, dan volgt een tweede mail.',
      lead, d, !nietBewaard,
    ),
  }, 'melding nieuwe aanvraag')
}

const BELMOMENT = { direct: 'zo snel mogelijk', vandaag: 'later vandaag', morgen: 'morgen' } as const

/** De bezoeker wil gebeld worden: naam en nummer, plus alles uit de aanvraag */
export async function sendTerugbelAanvraag(lead: LeadInfo & { naam: string; telefoon: string; besteTijd?: keyof typeof BELMOMENT }, nietBewaard = false): Promise<boolean> {
  const ontvanger = process.env.OWNER_EMAIL
  if (!ontvanger) { console.warn('[mail] OWNER_EMAIL ontbreekt: geen melding van de belafspraak'); return false }
  const d = (lead.dakData ?? {}) as DakData
  const wanneer = BELMOMENT[lead.besteTijd ?? 'direct']
  const tel = lead.telefoon.replace(/[^\d+]/g, '')
  return verstuur({
    from: van(`Aanvragen ${BEDRIJF.handelsnaam}`),
    to: ontvanger,
    ...(lead.email ? { replyTo: lead.email } : {}),
    subject: `${nietBewaard ? 'NIET BEWAARD · ' : ''}Bel terug (${wanneer}): ${lead.naam} · ${lead.gemeente ?? lead.adres ?? ''}`,
    html: eigenaarMail(
      `Bel ${esc(lead.naam)} terug`,
      `<a href="tel:${esc(tel)}" style="color:${NAVY};font-size:22px;font-weight:700;text-decoration:none">${esc(lead.telefoon)}</a><br>Wil gebeld worden: <strong>${wanneer}</strong>. Op werkdagen beloven we binnen 2 uur.${nietBewaard ? `<br><strong style="color:#b91c1c">${NIET_BEWAARD}</strong>` : ''}`,
      lead, d, !nietBewaard,
    ),
  }, 'melding terugbellen')
}

/** Een bezoeker schreef in de chat: het bericht en wie het is, om snel te antwoorden */
export async function sendChatBericht(bericht: { naam: string | null; email: string | null; inhoud: string }): Promise<boolean> {
  const ontvanger = process.env.OWNER_EMAIL
  if (!ontvanger) { console.warn('[mail] OWNER_EMAIL ontbreekt: geen melding van het chatbericht'); return false }
  return verstuur({
    from: van(`Chat ${BEDRIJF.handelsnaam}`),
    to: ontvanger,
    ...(bericht.email ? { replyTo: bericht.email } : {}),
    subject: `Chatbericht van ${bericht.naam ?? 'een bezoeker'}`,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:600px;color:${NAVY}">
      <h2 style="margin:0 0 4px;font-size:20px">Nieuw chatbericht</h2>
      <p style="margin:0 0 16px;color:#475569">Van ${esc(bericht.naam ?? 'een bezoeker')}${bericht.email ? ` (<a href="mailto:${esc(bericht.email)}" style="color:${NAVY}">${esc(bericht.email)}</a>)` : ''}. De chat belooft "meestal antwoord binnen 2 uur".</p>
      <blockquote style="margin:0;padding:12px 16px;border-left:4px solid ${AMBER};background:#f8fafc;white-space:pre-wrap">${esc(bericht.inhoud)}</blockquote>
      <p style="margin-top:20px">${knop(`${SITE}/dashboard`, 'Antwoorden in het dashboard', NAVY, '#ffffff')}</p>
    </div>`,
  }, 'melding chatbericht')
}

// ─── Mail aan de bezoeker ──────────────────────────────────────────────

/** De link naar het rapport, met wat de bezoeker koos en de prijs */
export async function sendRapportEmail(lead: LeadInfo): Promise<boolean> {
  if (!lead.email) return false
  const d = (lead.dakData ?? {}) as DakData
  const rapportUrl = `${SITE}/rapport/${encodeURIComponent(lead.sessionId)}`
  const prijs = prijsVan(d)
  const keuze = d.antwoorden?.werken?.length ? werkOmschrijving(d.antwoorden).join(' · ') : null
  const plaats = lead.adres ?? lead.gemeente ?? 'uw woning'

  return verstuur({
    from: van(BEDRIJF.handelsnaam),
    to: lead.email,
    replyTo: BEDRIJF.email,
    subject: `Uw dakrapport voor ${plaats}`,
    text: [
      `Uw dakrapport voor ${plaats} is klaar.`,
      keuze ? `Uw keuze: ${keuze}` : '',
      prijs ? `Prijsindicatie: ${euro(prijs.min)} – ${euro(prijs.max)} ${prijs.btw ? 'incl.' : 'excl.'} btw` : '',
      `Bekijk uw rapport: ${rapportUrl}`,
      `Vragen? Antwoord op deze e-mail.`,
      `${BEDRIJF.handelsnaam} is een handelsnaam van ${BEDRIJF.naam}, ondernemingsnummer ${BEDRIJF.ondernemingsnummer}.`,
    ].filter(Boolean).join('\n\n'),
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;color:${NAVY}">
      <div style="background:${NAVY};color:#fff;padding:22px 24px;border-radius:14px 14px 0 0">
        <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.75">Uw dakrapport</p>
        <h1 style="margin:6px 0 0;font-size:22px;line-height:1.3">${esc(plaats)}</h1>
        ${keuze ? `<p style="margin:10px 0 0;font-size:15px;opacity:.9">${esc(keuze)}</p>` : ''}
        ${prijs ? `<p style="margin:6px 0 0;font-size:26px;font-weight:800">${euro(prijs.min)} – ${euro(prijs.max)}</p>
        <p style="margin:2px 0 0;font-size:12px;opacity:.7">${prijs.btw ? 'incl.' : 'excl.'} btw · indicatief</p>` : ''}
      </div>
      <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 14px 14px">
        <p style="margin:0 0 12px;font-size:15px;line-height:1.55">Bedankt voor uw aanvraag. In uw rapport vindt u:</p>
        <ul style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.7;color:#334155">
          <li>uw dak op de luchtfoto, met elk dakvlak gemeten${lead.oppervlakte ? ` (±${lead.oppervlakte} m²)` : ''}</li>
          <li>de prijs per werk, en wat erin zit</li>
          <li>aandachtspunten voor uw woning, premies en uw dak door de jaren heen</li>
        </ul>
        <p style="margin:0 0 24px">${knop(rapportUrl, 'Bekijk uw rapport')}</p>
        <p style="margin:0;font-size:14px;line-height:1.55;color:#475569">
          Vragen? Antwoord gewoon op deze e-mail. Een dakwerker uit ons netwerk maakt na een plaatsbezoek een definitieve offerte.
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px">
        <p style="margin:0;font-size:11px;line-height:1.5;color:#94a3b8">
          De metingen komen uit publieke gegevens van de Vlaamse overheid (luchtfoto's en laserhoogtemeting).
          ${BEDRIJF.handelsnaam} is een handelsnaam van ${BEDRIJF.naam}, ${BEDRIJF.straat}, ${BEDRIJF.postcodeGemeente}, ondernemingsnummer ${BEDRIJF.ondernemingsnummer}.
          U krijgt deze e-mail omdat u op ${SITE.replace(/^https?:\/\//, '')} een rapport aanvroeg.
        </p>
      </div>
    </div>`,
  }, 'rapportmail')
}

// ─── Persoonlijke mail uit het dashboard ───────────────────────────────

/** Handtekening zoals op de handtekeningpagina: tekst, kleuren van het merk, geen afbeeldingen */
function handtekening(): { html: string; tekst: string } {
  const tel = AFZENDER.telefoon.replace(/[^\d+]/g, '')
  const html = `<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;color:${NAVY};font-size:14px;line-height:1.45;margin-top:18px">` +
    `<div style="font-size:16px;font-weight:700">${esc(AFZENDER.naam)}</div>` +
    `<div style="color:#64748b;font-size:13px">${esc(AFZENDER.functie)}</div>` +
    `<div style="margin-top:10px;font-size:15px;font-weight:800">Dakwerken <span style="color:#c2410c;font-weight:700">Oost-Vlaanderen</span></div>` +
    `<div style="margin-top:8px"><span style="color:#c2410c;font-weight:700">T</span>&nbsp; <a href="tel:${esc(tel)}" style="color:${NAVY};text-decoration:none">${esc(AFZENDER.telefoon)}</a><br>` +
    `<span style="color:#c2410c;font-weight:700">E</span>&nbsp; <a href="mailto:${BEDRIJF.email}" style="color:${NAVY};text-decoration:none">${BEDRIJF.email}</a><br>` +
    `<span style="color:#c2410c;font-weight:700">W</span>&nbsp; <a href="${SITE}" style="color:${NAVY};text-decoration:none;font-weight:600">${SITE.replace(/^https?:\/\//, '')}</a></div>` +
    `<div style="margin-top:12px;color:#94a3b8;font-size:11px;line-height:1.4">${BEDRIJF.handelsnaam} is een handelsnaam van ${BEDRIJF.naam}, ${BEDRIJF.straat}, ${BEDRIJF.postcodeGemeente} · ondernemingsnummer ${BEDRIJF.ondernemingsnummer}</div>` +
    `</div>`
  const tekst = [
    '--', AFZENDER.naam, AFZENDER.functie, BEDRIJF.handelsnaam,
    `T ${AFZENDER.telefoon}`, `E ${BEDRIJF.email}`, `W ${SITE.replace(/^https?:\/\//, '')}`,
    `${BEDRIJF.handelsnaam} is een handelsnaam van ${BEDRIJF.naam}, ${BEDRIJF.straat}, ${BEDRIJF.postcodeGemeente} · ondernemingsnummer ${BEDRIJF.ondernemingsnummer}`,
  ].join('\n')
  return { html, tekst }
}

/**
 * Een mail die Afer in het dashboard schreef (of een AI-concept dat hij nalas), vanaf info@.
 * Een kopie (bcc) gaat naar info@, zodat elke mail ook in de mailbox staat. Antwoorden komen op info@ binnen.
 */
export async function sendKlantMail(m: { aan: string; onderwerp: string; tekst: string; kopie?: boolean }): Promise<boolean> {
  const h = handtekening()
  const alineas = m.tekst.trim().split(/\n{2,}/).map((a) =>
    `<p style="margin:0 0 14px">${esc(a).replace(/\n/g, '<br>')}</p>`).join('')
  return verstuur({
    from: `${AFZENDER.naam} · ${BEDRIJF.handelsnaam} <${BEDRIJF.email}>`,
    to: m.aan,
    replyTo: BEDRIJF.email,
    ...(m.kopie === false ? {} : { bcc: BEDRIJF.email }),
    subject: m.onderwerp,
    text: `${m.tekst.trim()}\n\n${h.tekst}`,
    html: `<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:${NAVY};max-width:600px">${alineas}${h.html}</div>`,
  }, 'klantmail')
}
