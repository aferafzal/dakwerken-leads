// Eén regel voor "het" gebouw van een perceel: het aangeduide gebouw (waar de bezoeker
// op tikte of waar het adres ligt), anders het grootste grondvlak.
// Zo tonen kaart, funnel en rapport dezelfde nokhoogte.
export function hoofdGebouw<T extends { oppervlakte?: number | null; aangeduid?: boolean }>(
  gebouwen: T[] | null | undefined,
): T | null {
  if (!gebouwen || gebouwen.length === 0) return null
  return gebouwen.find((g) => g.aangeduid) ??
    gebouwen.reduce((a, b) => ((b.oppervlakte ?? 0) > (a.oppervlakte ?? 0) ? b : a))
}
