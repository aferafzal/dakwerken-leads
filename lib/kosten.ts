/**
 * Indicatieve prijzen per soort dakwerk: één bron voor rapport (en straks de funnel, stap 15).
 * Nog na te kijken door Afer (vakman); tot dan de prijzen die al in het rapport stonden.
 */

export type SoortWerk = 'pannen' | 'isolatie' | 'plat_dak' | 'dakgoten' | 'totaalrenovatie' | 'lekkage_onderzoek' | 'advies'

type Prijs = { naam: string; uitleg: string; min: number; max: number; eenheid: 'm2' | 'lm' | 'vast' | 'op_aanvraag' }

export const PRIJZEN: Record<SoortWerk, Prijs> = {
  pannen:            { naam: 'Dakbedekking vernieuwen', uitleg: 'pannen of leien vervangen, incl. uitvoering', min: 80,  max: 120, eenheid: 'm2' },
  isolatie:          { naam: 'Hellend dak isoleren',    uitleg: 'isolatie van het hellende dak',               min: 90,  max: 150, eenheid: 'm2' },
  plat_dak:          { naam: 'Plat dak vernieuwen',     uitleg: 'EPDM of roofing vernieuwen',                  min: 110, max: 170, eenheid: 'm2' },
  totaalrenovatie:   { naam: 'Volledige dakrenovatie',  uitleg: 'dakbedekking en isolatie samen vernieuwen',   min: 220, max: 350, eenheid: 'm2' },
  dakgoten:          { naam: 'Dakgoten vervangen',      uitleg: 'per lopende meter',                           min: 60,  max: 100, eenheid: 'lm' },
  lekkage_onderzoek: { naam: 'Lekkage-onderzoek',       uitleg: 'inspectie ter plaatse',                       min: 150, max: 350, eenheid: 'vast' },
  advies:            { naam: 'Persoonlijk advies',      uitleg: 'gesprek met een dakwerker',                   min: 0,   max: 0,   eenheid: 'op_aanvraag' },
}

export type Kostenregel = {
  soort: SoortWerk
  naam: string
  uitleg: string
  oppervlakte: number | null    // m² waarop de prijs slaat (null bij vaste prijs of per lopende meter)
  eenheidsprijs: string         // bv. "€80–€120 per m²"
  totaal: [number, number] | null
}

const afgerond = (n: number) => Math.round(n / 100) * 100

/**
 * Welke werken passen bij dit dak, met een prijsvork.
 * hellend / plat: m² dak van elk soort (uit de dakscan); gekozen: wat de bezoeker zelf aanduidde.
 */
export function kostenVoorDak(hellend: number, plat: number, gekozen: SoortWerk[] = []): Kostenregel[] {
  const soorten: SoortWerk[] = []
  if (hellend >= 5) soorten.push('pannen', 'isolatie')
  if (plat >= 5) soorten.push('plat_dak')
  if (hellend >= 5 && gekozen.includes('totaalrenovatie')) soorten.push('totaalrenovatie')
  for (const g of gekozen) if (!soorten.includes(g) && g !== 'totaalrenovatie') soorten.push(g)

  return soorten.map((soort) => {
    const p = PRIJZEN[soort]
    const opp = p.eenheid === 'm2' ? (soort === 'plat_dak' ? plat : hellend) : null
    const eenheidsprijs =
      p.eenheid === 'op_aanvraag' ? 'op aanvraag'
      : p.eenheid === 'vast' ? `€${p.min}–€${p.max}`
      : `€${p.min}–€${p.max} per ${p.eenheid === 'm2' ? 'm²' : 'lopende meter'}`
    return {
      soort,
      naam: p.naam,
      uitleg: p.uitleg,
      oppervlakte: opp && opp > 0 ? Math.round(opp) : null,
      eenheidsprijs,
      totaal: opp && opp > 0 ? [afgerond(opp * p.min), afgerond(opp * p.max)] : null,
    }
  })
}

export const euro = (n: number) => `€${Math.round(n).toLocaleString('nl-BE')}`
