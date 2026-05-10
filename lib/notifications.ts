import { Resend } from 'resend'
import type { LeadFormData } from './validations'
import { probleemLabels } from './validations'

export async function sendLeadEmail(lead: LeadFormData & { id: string }) {
  const ownerEmail = process.env.OWNER_EMAIL
  if (!ownerEmail || !process.env.RESEND_API_KEY) return

  const resend = new Resend(process.env.RESEND_API_KEY)

  const urgentieStars = '★'.repeat(lead.urgentie) + '☆'.repeat(5 - lead.urgentie)
  const spotableAdres = encodeURIComponent(`${lead.adres ?? ''} ${lead.gemeente}`.trim())

  await resend.emails.send({
    from: 'Dakwerken Leads <onboarding@resend.dev>',
    to: ownerEmail,
    subject: `🔔 Nieuwe lead: ${lead.naam} — ${lead.gemeente} (urgentie ${lead.urgentie}/5)`,
    html: `
      <h2>Nieuwe dakwerken aanvraag</h2>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:8px;font-weight:bold">Naam</td><td style="padding:8px">${lead.naam}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Telefoon</td><td style="padding:8px"><a href="tel:${lead.telefoon}">${lead.telefoon}</a></td></tr>
        ${lead.email ? `<tr><td style="padding:8px;font-weight:bold">E-mail</td><td style="padding:8px">${lead.email}</td></tr>` : ''}
        ${lead.adres ? `<tr><td style="padding:8px;font-weight:bold">Adres</td><td style="padding:8px">${lead.adres}</td></tr>` : ''}
        <tr><td style="padding:8px;font-weight:bold">Gemeente</td><td style="padding:8px">${lead.gemeente}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Probleem</td><td style="padding:8px">${probleemLabels[lead.probleem]}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Urgentie</td><td style="padding:8px">${urgentieStars} (${lead.urgentie}/5)</td></tr>
        ${lead.opmerking ? `<tr><td style="padding:8px;font-weight:bold">Opmerking</td><td style="padding:8px">${lead.opmerking}</td></tr>` : ''}
        <tr><td style="padding:8px;font-weight:bold">Follow-up consent</td><td style="padding:8px">${lead.followup_consent ? 'Ja' : 'Nee'}</td></tr>
      </table>

      ${lead.dakOppervlakte ? `
      <div style="margin-top:24px;padding:20px;background:#f0fdf4;border:2px solid #16a34a;border-radius:8px">
        <h3 style="margin:0 0 4px;color:#14532d;font-size:20px">🏠 Digitale dakmeting</h3>
        <p style="margin:0;font-size:36px;font-weight:bold;color:#16a34a">±${lead.dakOppervlakte} m²</p>
        <p style="margin:8px 0 0;color:#166534;font-size:13px">
          Automatisch berekend via het Vlaams Gebouwenregister op basis van het kadastrale gebouwpolygoon.
        </p>
      </div>
      ` : ''}

      <div style="margin-top:16px;padding:16px;background:#fef9c3;border:1px solid #fbbf24;border-radius:8px">
        <h3 style="margin:0 0 8px;color:#92400e">📍 Locatie opzoeken</h3>
        <p style="margin:0 0 12px;font-weight:bold;font-size:16px">${lead.adres ?? lead.gemeente}</p>
        <a href="https://www.google.com/maps/search/?api=1&query=${spotableAdres}"
           style="background:#f59e0b;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">
          Open in Google Maps →
        </a>
      </div>

      <p style="margin-top:16px">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" style="background:#16a34a;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">
          Bekijk in dashboard
        </a>
      </p>
    `,
  })
}

/** Email naar de gebruiker met link naar zijn rapport. */
export async function sendRapportEmail(opts: {
  email: string
  sessionId: string
  adres: string | null
  gemeente: string | null
  oppervlakte: number | null
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[notifications] RESEND_API_KEY ontbreekt — skip rapport-mail')
    return
  }
  const fromAddr = process.env.RESEND_FROM_EMAIL ?? 'Dakrapport <onboarding@resend.dev>'
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dakwerken-oostvlaanderen.be'
  const rapportUrl = `${siteUrl}/rapport/${opts.sessionId}`

  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: fromAddr,
    to: opts.email,
    subject: `Uw dakrapport voor ${opts.adres ?? opts.gemeente ?? 'uw woning'} is klaar`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
        <div style="background:#15803d;color:white;padding:20px 24px;border-radius:12px 12px 0 0">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.8">Uw persoonlijk dakrapport</p>
          <h1 style="margin:6px 0 0;font-size:22px">${opts.adres ?? 'Uw woning'}</h1>
          <p style="margin:4px 0 0;opacity:0.85;font-size:14px">${opts.gemeente ?? ''}</p>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
          <p style="font-size:15px;line-height:1.55">
            Bedankt voor uw aanvraag. Uw <strong>volledige dakrapport</strong> is klaar en bevat:
          </p>
          <ul style="font-size:14px;line-height:1.7;color:#374151">
            <li>3D-model van uw dak</li>
            <li>Dakoppervlakte, daktype en nokhoogte</li>
            <li>Buurtvergelijking</li>
            <li>Indicatieve renovatiekosten</li>
            <li>Mogelijke premies</li>
            <li>Persoonlijke aandachtspunten</li>
            ${opts.oppervlakte ? `<li>Schatting energiebesparing bij isolatie (uw dak: ${opts.oppervlakte} m²)</li>` : ''}
          </ul>
          <div style="text-align:center;margin:28px 0">
            <a href="${rapportUrl}" style="background:#15803d;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
              Bekijk uw rapport →
            </a>
          </div>
          <p style="font-size:13px;color:#6b7280;line-height:1.55">
            Heeft u vragen of wilt u een offerte op maat? Onze experts helpen u graag verder.
            Antwoord eenvoudig op deze e-mail of bel ons.
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
          <p style="font-size:11px;color:#9ca3af;line-height:1.5">
            Dit rapport is gebaseerd op publieke data van het Vlaams 3D GRB, Basisregisters en DHMV II LiDAR.
            Een definitieve offerte volgt steeds na een plaatsbezoek door een gecertificeerde dakwerker.
          </p>
        </div>
      </div>
    `,
  })
}

export function buildWhatsAppUrl(phone: string, lead: LeadFormData): string {
  const tekst = `Nieuwe aanvraag dakwerken!\n\nNaam: ${lead.naam}\nTelefoon: ${lead.telefoon}\nGemeente: ${lead.gemeente}\nProbleem: ${probleemLabels[lead.probleem]}\nUrgentie: ${lead.urgentie}/5`
  return `https://wa.me/${phone}?text=${encodeURIComponent(tekst)}`
}
