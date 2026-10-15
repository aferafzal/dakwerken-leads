// Eén regel voor "het" gebouw van een perceel: het grootste grondvlak.
// Zo tonen kaart, funnel en rapport dezelfde nokhoogte.
export function hoofdGebouw<T extends { oppervlakte?: number | null }>(
  gebouwen: T[] | null | undefined,
): T | null {
  if (!gebouwen || gebouwen.length === 0) return null
  return gebouwen.reduce((a, b) => ((b.oppervlakte ?? 0) > (a.oppervlakte ?? 0) ? b : a))
}
