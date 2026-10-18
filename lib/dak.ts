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
