/**
 * Erfgoed op een gebouw, uit de aanduidingsobjecten van het agentschap Onroerend Erfgoed
 * (publieke WFS van Mercator, Vlaamse overheid). Alleen wat voor dakwerken uitmaakt:
 * beschermd monument, beschermd stads- of dorpsgezicht, beschermd landschap en vastgesteld bouwkundig erfgoed.
 */

const WFS = 'https://www.mercator.vlaanderen.be/raadpleegdienstenmercatorpubliek/wfs'

export type ErfgoedSoort = 'monument' | 'gezicht' | 'landschap' | 'bouwkundig'

export type Erfgoed = {
  soort: ErfgoedSoort
  naam: string
  url: string | null   // fiche in de inventaris van Onroerend Erfgoed
}

const SOORTEN: [RegExp, ErfgoedSoort][] = [
  [/^beschermd monument/i, 'monument'],
  [/^beschermd stads- of dorpsgezicht/i, 'gezicht'],
  [/^beschermd cultuurhistorisch landschap/i, 'landschap'],
  [/^vastgesteld bouwkundig erfgoed/i, 'bouwkundig'],
]

const BELANG: Record<ErfgoedSoort, number> = { monument: 0, gezicht: 1, landschap: 2, bouwkundig: 3 }

type Ring = [number, number][]
type Veelhoek = Ring[]                  // buitenrand + eventuele gaten
type Geometrie =
  | { type: 'Polygon'; coordinates: Veelhoek }
  | { type: 'MultiPolygon'; coordinates: Veelhoek[] }

function binnenRing(x: number, y: number, ring: Ring): boolean {
  let binnen = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) binnen = !binnen
  }
  return binnen
}

function binnenGeometrie(x: number, y: number, g: Geometrie): boolean {
  const veelhoeken = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
  return veelhoeken.some(([buiten, ...gaten]) => binnenRing(x, y, buiten) && !gaten.some((gat) => binnenRing(x, y, gat)))
}

// Raster van punten over het gebouw (hoogstens ±400): zo meten we welk deel van het gebouw in een erfgoedzone ligt
function monsterpunten(ring: Ring): [number, number][] {
  const xs = ring.map(([x]) => x)
  const ys = ring.map(([, y]) => y)
  const [x0, y0, x1, y1] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
  const stap = Math.max(0.5, Math.sqrt((x1 - x0) * (y1 - y0)) / 20)
  const punten: [number, number][] = []
  for (let x = x0 + stap / 2; x < x1; x += stap) {
    for (let y = y0 + stap / 2; y < y1; y += stap) if (binnenRing(x, y, ring)) punten.push([x, y])
  }
  return punten
}

// Telt mee vanaf 10% van het gebouw: een monument dat enkel tegen de woning aan ligt, telt niet
const MIN_AANDEEL = 0.1

/** Erfgoed dat op het gebouw ligt (ring in Lambert72), belangrijkste eerst */
export async function zoekErfgoed(ring: Ring): Promise<Erfgoed[]> {
  const xs = ring.map(([x]) => x)
  const ys = ring.map(([, y]) => y)
  const bbox = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map((v) => v.toFixed(1)).join(',')
  const url = `${WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=ps:ps_aandobj` +
    `&SRSNAME=EPSG:31370&BBOX=${bbox},EPSG:31370&COUNT=50&OUTPUTFORMAT=application/json`
  const res = await fetch(url, { next: { revalidate: 604800 }, signal: AbortSignal.timeout(6000) })
  if (!res.ok) return []
  const data = await res.json()

  const punten = monsterpunten(ring)
  if (punten.length === 0) return []
  const gevonden = new Map<string, Erfgoed>()
  for (const f of data.features ?? []) {
    const p = f.properties ?? {}
    const soort = SOORTEN.find(([re]) => re.test(p.type_naam ?? ''))?.[1]
    if (!soort || !f.geometry) continue
    const binnen = punten.filter(([x, y]) => binnenGeometrie(x, y, f.geometry as Geometrie)).length
    if (binnen / punten.length < MIN_AANDEEL) continue
    const sleutel = `${soort}-${p.aanduid_id}`
    if (!gevonden.has(sleutel)) gevonden.set(sleutel, { soort, naam: p.naam ?? '', url: p.url ?? null })
  }
  return [...gevonden.values()].sort((a, b) => BELANG[a.soort] - BELANG[b.soort])
}
