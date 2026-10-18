// Opvolging van een aanvraag: wat wij ermee deden (los van status = wat de bezoeker deed).
// Kolom leads.opvolging, zie migrations/009_opvolging.sql.

export const OPVOLGING = [
  { waarde: 'nieuw', label: 'Nieuw' },
  { waarde: 'gecontacteerd', label: 'Gecontacteerd' },
  { waarde: 'doorgestuurd', label: 'Doorgestuurd naar dakwerker' },
  { waarde: 'offerte', label: 'Offerte gemaakt' },
  { waarde: 'gewonnen', label: 'Gewonnen' },
  { waarde: 'verloren', label: 'Verloren' },
] as const

export type Opvolging = (typeof OPVOLGING)[number]['waarde']

export const isOpvolging = (w: unknown): w is Opvolging => OPVOLGING.some((o) => o.waarde === w)

// Tabbladen in het dashboard
export const OPVOLG_GROEPEN = [
  { sleutel: 'te_doen', label: 'Te doen', waarden: ['nieuw'] },
  { sleutel: 'lopend', label: 'Lopend', waarden: ['gecontacteerd', 'doorgestuurd', 'offerte'] },
  { sleutel: 'afgerond', label: 'Afgerond', waarden: ['gewonnen', 'verloren'] },
  { sleutel: 'alle', label: 'Alle', waarden: OPVOLGING.map((o) => o.waarde) },
] as const satisfies readonly { sleutel: string; label: string; waarden: readonly Opvolging[] }[]
