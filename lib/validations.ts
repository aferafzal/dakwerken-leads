import { z } from 'zod'

// ── Volledig schema (legacy — voor het oude offerte-formulier) ─────
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
  dakOppervlakte: z.number().int().positive().optional(),
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

// ── Nieuwe stap-schemas voor de stapsgewijze funnel ───────────────

/** Stap 1 — Email + dakscan-data → status 'warm' */
export const funnelStapEmail = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
  gdpr_consent: z.literal(true, { error: 'U moet akkoord gaan met de privacyverklaring' }),
  adres: z.string().optional(),
  gemeente: z.string().optional(),
  dakOppervlakte: z.number().int().positive().optional(),
  dak_data: z.unknown().optional(),
})

/** Stap 2 — Optionele vragenlijst → status 'engaged' */
export const funnelStapVragenlijst = z.object({
  bouwjaar: z.enum(['voor_1980', '1980_2000', '2000_2015', 'na_2015', 'onbekend']).optional(),
  laatste_dakwerken: z.enum(['nooit', 'minder_5j', 'tussen_5_15j', 'meer_15j']).optional(),
  lekkage_recent: z.enum(['ja', 'nee', 'niet_zeker']).optional(),
  type_werken: z.array(z.enum([
    'pannen', 'isolatie', 'plat_dak', 'dakgoten',
    'lekkage_onderzoek', 'totaalrenovatie', 'advies',
  ])).optional(),
})

/** Stap 3 — Telefoon + naam + probleem → status 'hot' */
export const funnelStapTelefoon = z.object({
  naam: z.string().min(2, 'Naam is verplicht'),
  telefoon: z
    .string()
    .min(9, 'Telefoonnummer is ongeldig')
    .regex(/^[0-9+\s()-]{9,15}$/, 'Voer een geldig telefoonnummer in'),
  beste_tijd: z.enum(['direct', 'vandaag', 'morgen']).optional(),
  probleem: z.enum(
    ['daklekkage', 'isolatie', 'renovatie', 'nieuw_dak', 'anders'] as const
  ).optional(),
  urgentie: z.number().int().min(1).max(5).optional(),
  followup_consent: z.boolean().default(false),
})

export type FunnelStapEmail       = z.infer<typeof funnelStapEmail>
export type FunnelStapVragenlijst = z.infer<typeof funnelStapVragenlijst>
export type FunnelStapTelefoon    = z.infer<typeof funnelStapTelefoon>

export const bouwjaarLabels: Record<NonNullable<FunnelStapVragenlijst['bouwjaar']>, string> = {
  voor_1980:  'Voor 1980',
  '1980_2000': '1980 – 2000',
  '2000_2015': '2000 – 2015',
  na_2015:    'Na 2015',
  onbekend:   'Onbekend',
}

export const dakwerkenLabels: Record<NonNullable<FunnelStapVragenlijst['laatste_dakwerken']>, string> = {
  nooit:        'Nooit',
  minder_5j:    'Minder dan 5 jaar geleden',
  tussen_5_15j: '5 – 15 jaar geleden',
  meer_15j:     'Meer dan 15 jaar geleden',
}

export const lekkageLabels: Record<NonNullable<FunnelStapVragenlijst['lekkage_recent']>, string> = {
  ja:         'Ja',
  nee:        'Nee',
  niet_zeker: 'Niet zeker',
}

export const typeWerkenLabels: Record<NonNullable<FunnelStapVragenlijst['type_werken']>[number], string> = {
  pannen:            'Pannen of leien vervangen',
  isolatie:          'Dak isoleren',
  plat_dak:          'Plat dak vernieuwen (EPDM/roofing)',
  dakgoten:          'Dakgoten onderhoud/vervanging',
  lekkage_onderzoek: 'Lekkage onderzoeken',
  totaalrenovatie:   'Volledige dakrenovatie',
  advies:            'Nog niet zeker, eerst advies',
}
