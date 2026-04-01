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

      <div style="margin-top:24px;padding:16px;background:#fef9c3;border:1px solid #fbbf24;border-radius:8px">
        <h3 style="margin:0 0 8px;color:#92400e">🛰️ Spotable AI Dakmeting</h3>
        <p style="margin:0 0 12px;color:#78350f">
          Open Spotable en voer het onderstaande adres in om de 3D-dakmeting te starten en een offerte te genereren:
        </p>
        <p style="margin:0 0 12px;font-weight:bold;font-size:16px">${lead.adres ?? lead.gemeente}</p>
        <a href="https://app.spotable.be?address=${spotableAdres}"
           style="background:#f59e0b;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">
          Open Spotable →
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

export function buildWhatsAppUrl(phone: string, lead: LeadFormData): string {
  const tekst = `Nieuwe aanvraag dakwerken!\n\nNaam: ${lead.naam}\nTelefoon: ${lead.telefoon}\nGemeente: ${lead.gemeente}\nProbleem: ${probleemLabels[lead.probleem]}\nUrgentie: ${lead.urgentie}/5`
  return `https://wa.me/${phone}?text=${encodeURIComponent(tekst)}`
}
