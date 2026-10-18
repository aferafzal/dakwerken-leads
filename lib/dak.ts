import type { Erfgoed, ErfgoedSoort } from '@/lib/erfgoed'

// Eén regel voor "het" gebouw van een perceel: het aangeduide gebouw (waar de bezoeker
// op tikte of waar het adres ligt) als het meetelt, anders het grootste gebouw dat meetelt.
// Zo tonen kaart, funnel en rapport dezelfde nokhoogte.
export function hoofdGebouw<T extends { oppervlakte?: number | null; aangeduid?: boolean; meetellen?: boolean }>(
  gebouwen: T[] | null | undefined,
): T | null {
  if (!gebouwen || gebouwen.length === 0) return null
  const mee = gebouwen.filter((g) => g.meetellen !== false)
  const kandidaten = mee.length ? mee : gebouwen
  return kandidaten.find((g) => g.aangeduid) ??
    kandidaten.reduce((a, b) => ((b.oppervlakte ?? 0) > (a.oppervlakte ?? 0) ? b : a))
}

/** Erfgoed van de gebouwen die meetellen, zonder dubbels, belangrijkste eerst */
export function erfgoedVan(gebouwen: { meetellen?: boolean; scan?: { erfgoed?: Erfgoed[] } | null }[]): Erfgoed[] {
  const volgorde: ErfgoedSoort[] = ['monument', 'gezicht', 'landschap', 'bouwkundig']
  const uniek = new Map<string, Erfgoed>()
  for (const g of gebouwen) {
    if (g.meetellen === false) continue
    for (const e of g.scan?.erfgoed ?? []) uniek.set(`${e.soort}-${e.naam}`, e)
  }
  return [...uniek.values()].sort((a, b) => volgorde.indexOf(a.soort) - volgorde.indexOf(b.soort))
}

type VlakVoorMaten = { richting: string | null; dakOppervlak: number; helling: number; zon: number }
type GebouwVoorMaten = {
  meetellen?: boolean
  dakOppervlak?: number | null
  oppervlakte?: number | null
  dakvorm?: string | null
  scan?: { meetbaar: boolean; dakOppervlak: number | null; dakvorm: string | null; nokhoogte: number | null; gootlengte?: number | null; vlakken: VlakVoorMaten[] } | null
}

/**
 * Maten voor het prijsmodel uit de gebouwen die meetellen: m² hellend en plat dak,
 * nokhoogte, gootlengte en m² dak op het zuiden, oosten of westen (voor zonnepanelen).
 */
export function dakMaten(gebouwen: GebouwVoorMaten[]): { hellend: number; plat: number; nokhoogte: number | null; gootlengte: number | null; zonM2: number } {
  let hellend = 0, plat = 0, goot = 0, zon = 0
  let nok: number | null = null
  for (const g of gebouwen) {
    if (g.meetellen === false) continue
    const s = g.scan?.meetbaar ? g.scan : null
    if (s && s.vlakken.length) {
      const som = s.vlakken.reduce((t, v) => t + v.dakOppervlak, 0)
      const f = som > 0 && s.dakOppervlak ? s.dakOppervlak / som : 1
      for (const v of s.vlakken) {
        if (v.richting === null) plat += v.dakOppervlak * f
        else hellend += v.dakOppervlak * f
        if (v.richting !== null && v.zon >= 0.4 && v.helling < 60) zon += v.dakOppervlak * f
      }
      goot += s.gootlengte ?? 0
      if (s.nokhoogte !== null) nok = Math.max(nok ?? 0, s.nokhoogte)
    } else {
      const opp = g.dakOppervlak ?? g.oppervlakte ?? 0
      if ((g.dakvorm ?? s?.dakvorm) === 'plat dak') plat += opp
      else hellend += opp
    }
  }
  return { hellend: Math.round(hellend), plat: Math.round(plat), nokhoogte: nok, gootlengte: goot > 0 ? Math.round(goot) : null, zonM2: Math.round(zon) }
}
