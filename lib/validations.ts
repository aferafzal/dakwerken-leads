import { z } from 'zod'

export const leadSchema = z.object({
  naam: z.string().min(2, 'Naam is verplicht'),
  telefoon: z
    .string()
    .min(9, 'Telefoonnummer is ongeldig')
    .regex(/^[0-9+\s()-]{9,15}$/, 'Voer een geldig telefoonnummer in'),
  email: z.string().email('Ongeldig e-mailadres').optional().or(z.literal('')),
  adres: z.string().optional(),
  gemeente: z.string().min(2, 'Gemeente is verplicht'),
  probleem: z.enum(
    ['daklekkage', 'isolatie', 'renovatie', 'nieuw_dak', 'anders'] as const,
    { error: 'Selecteer een type probleem' }
  ),
  urgentie: z.number().int().min(1).max(5),
  opmerking: z.string().optional(),
  gdpr_consent: z.literal(true, {
    error: 'U moet akkoord gaan met de privacyverklaring',
  }),
  followup_consent: z.boolean(),
})

export type LeadFormData = z.infer<typeof leadSchema>

export const probleemLabels: Record<LeadFormData['probleem'], string> = {
  daklekkage: 'Daklekkage / waterinfiltratie',
  isolatie: 'Dakisolatie',
  renovatie: 'Dakrenovatie',
  nieuw_dak: 'Nieuw dak',
  anders: 'Ander probleem',
}
