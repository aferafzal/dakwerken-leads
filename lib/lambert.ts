import proj4 from 'proj4'

// Lambert72 projectie (Belgisch kadaster)
proj4.defs(
  'EPSG:31370',
  '+proj=lcc +lat_1=51.16667723333333 +lat_2=49.8333339 +lat_0=90 +lon_0=4.367486666666666 +x_0=150000.013 +y_0=5400088.438 +ellps=intl +towgs84=-106.868628,52.297783,-103.723893,0.336570,-0.456955,1.842183,-1.2747 +units=m +no_defs'
)

export { proj4 }

/** Lambert72 [x, y] → WGS84 [lat, lng] */
export function naarWgs84([x, y]: [number, number]): [number, number] {
  const [lng, lat] = proj4('EPSG:31370', 'EPSG:4326', [x, y])
  return [lat, lng]
}

/** Lambert72 [x,y][] → WGS84 [lat,lng][] voor Leaflet */
export function lambert72ToWgs84(coords: [number, number][]): [number, number][] {
  return coords.map(naarWgs84)
}

/** Parse Lambert72 coördinaten uit GML posList */
export function extractCoordsFromGml(gml: string): [number, number][] | null {
  const match = gml.match(/<gml:posList[^>]*>([\s\S]+?)<\/gml:posList>/)
  if (!match) return null

  const nums = match[1].trim().split(/\s+/).map(Number)
  const punten: [number, number][] = []
  for (let i = 0; i + 1 < nums.length; i += 2) punten.push([nums[i], nums[i + 1]])
  return punten.length > 2 ? punten : null
}

export function shoelace(punten: [number, number][]): number {
  let som = 0
  const n = punten.length
  for (let i = 0; i < n; i++) {
    const [x1, y1] = punten[i]
    const [x2, y2] = punten[(i + 1) % n]
    som += x1 * y2 - x2 * y1
  }
  return Math.abs(som / 2)
}
