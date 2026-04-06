import { NextRequest, NextResponse } from 'next/server'
import proj4 from 'proj4'

const GEO      = 'https://geo.api.vlaanderen.be/Geolocation/v4'
const BASISREG = 'https://api.basisregisters.vlaanderen.be/v2'
const CAPAKEY  = 'https://geo.api.vlaanderen.be/capakey/v2'

const WMS_LUCHT = 'https://geo.api.vlaanderen.be/OMWRGBMRVL/wms'
const WMS_3DGRB = 'https://geo.api.vlaanderen.be/3DGRB/wms'

// Lambert72 projectie (Belgisch kadaster)
proj4.defs(
  'EPSG:31370',
  '+proj=lcc +lat_1=51.16667723333333 +lat_2=49.8333339 +lat_0=90 +lon_0=4.367486666666666 +x_0=150000.013 +y_0=5400088.438 +ellps=intl +towgs84=-106.868628,52.297783,-103.723893,0.336570,-0.456955,1.842183,-1.2747 +units=m +no_defs'
)

export type Hoogte3D = {
  nokhoogte:    number | null   // HN_P99 — gebouwhoogte (nok) in meter
  grondniveau:  number | null   // H_DTM_GEM — gemiddeld maaiveld
  gebouwType:   string | null   // LBLTYPE — hoofdgebouw, bijgebouw, etc.
  footprint3d:  number | null   // OPPERVL — grondoppervlak volgens 3D GRB
  kwaliteit:    string | null   // H_KWAL — kwaliteit hoogte-data
}

export type DakmetingResultaat = {
  oppervlakte:    number | null
  dakOppervlak:   number | null   // geschatte werkelijke dakoppervlakte (gecorrigeerd voor helling)
  gemeente:       string | null
  capakey:        string | null
  perceelnummer:  string | null
  afdeling:       string | null
  aantalAdressen: number | null
  luchtfotoUrl:   string | null
  lat:            number | null
  lng:            number | null
  hoogte3d:       Hoogte3D | null
}

export type GebouwInfo = {
  oppervlakte:  number
  dakOppervlak: number | null
  grenzen:      [number, number][]  // [lat, lng][] polygon
  hoogte3d:     Hoogte3D | null
}

export type PerceelKlikResultaat = {
  capakey:         string | null
  perceelnummer:   string | null
  afdeling:        string | null
  aantalAdressen:  number | null
  gemeente:        string | null
  perceelGrenzen:  [number, number][] | null  // [lat, lng][] polygon
  gebouwen:        GebouwInfo[]               // alle gebouwen op het perceel
  error?:          string
}

// GET /api/dakmeting?q=...                       → adres autocomplete suggesties
// GET /api/dakmeting?adres=...                   → DakmetingResultaat
// GET /api/dakmeting?click_lat=...&click_lng=... → PerceelKlikResultaat
export async function GET(req: NextRequest) {
  const q         = req.nextUrl.searchParams.get('q')
  const adres     = req.nextUrl.searchParams.get('adres')
  const clickLat  = req.nextUrl.searchParams.get('click_lat')
  const clickLng  = req.nextUrl.searchParams.get('click_lng')

  if (q)                    return suggesties(q)
  if (adres)                return meting(adres)
  if (clickLat && clickLng) return perceelKlik(parseFloat(clickLat), parseFloat(clickLng))
  return NextResponse.json({ error: 'q, adres of click_lat/click_lng parameter vereist' }, { status: 400 })
}

// ─── Autocomplete ────────────────────────────────────────────────────
async function suggesties(q: string) {
  try {
    const res = await fetch(
      `${GEO}/Suggestion?q=${encodeURIComponent(q)}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return NextResponse.json({ suggesties: [] })
    const data = await res.json()
    return NextResponse.json({ suggesties: (data.SuggestionResult ?? []).slice(0, 6) })
  } catch {
    return NextResponse.json({ suggesties: [] })
  }
}

// ─── Adres → volledige meting ────────────────────────────────────────
async function meting(adres: string): Promise<NextResponse> {
  const leeg: DakmetingResultaat = {
    oppervlakte: null, dakOppervlak: null, gemeente: null, capakey: null,
    perceelnummer: null, afdeling: null, aantalAdressen: null,
    luchtfotoUrl: null, lat: null, lng: null, hoogte3d: null,
  }

  try {
    const locRes = await fetch(`${GEO}/Location?q=${encodeURIComponent(adres)}`)
    if (!locRes.ok) return NextResponse.json(leeg)
    const locData = await locRes.json()
    const loc = locData.LocationResult?.[0]
    if (!loc) return NextResponse.json(leeg)

    const gemeente: string   = loc.Municipality ?? null
    const postcode: string   = loc.Zipcode
    const straat: string     = loc.Thoroughfarename
    const huisnummer: string = loc.Housenumber
    const x: number          = loc.Location?.X_Lambert72
    const y: number          = loc.Location?.Y_Lambert72

    const lat: number | null = loc.Location?.Lat_WGS84 ?? null
    const lng: number | null = loc.Location?.Lon_WGS84 ?? null

    if (!straat || !huisnummer || !postcode) return NextResponse.json({ ...leeg, gemeente, lat, lng })

    const luchtfotoUrl = x && y
      ? `${WMS_LUCHT}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image/png&LAYERS=Ortho&STYLES=&CRS=EPSG:31370&BBOX=${Math.round(x - 40)},${Math.round(y - 40)},${Math.round(x + 40)},${Math.round(y + 40)}&WIDTH=500&HEIGHT=500`
      : null

    // Alle data-ophaling parallel
    const [oppervlakte, capaInfo, hoogte3d] = await Promise.all([
      berekenOppervlakte(postcode, huisnummer, straat),
      x && y ? getCapakey(x, y) : Promise.resolve(null),
      x && y ? get3DGrbInfo(x, y) : Promise.resolve(null),
    ])

    // Geschatte dakoppervlakte met hellingcorrectie
    const footprint = oppervlakte ?? hoogte3d?.footprint3d ?? null
    const dakOppervlak = berekenDakOppervlak(footprint, hoogte3d?.nokhoogte ?? null)

    return NextResponse.json({
      oppervlakte: footprint,
      dakOppervlak,
      gemeente,
      capakey:        capaInfo?.capakey        ?? null,
      perceelnummer:  capaInfo?.perceelnummer  ?? null,
      afdeling:       capaInfo?.afdeling       ?? null,
      aantalAdressen: capaInfo?.aantalAdressen ?? null,
      luchtfotoUrl,
      lat,
      lng,
      hoogte3d,
    } satisfies DakmetingResultaat)
  } catch {
    return NextResponse.json(leeg)
  }
}

// ─── Klik op kaart → perceelinfo + alle gebouwen ─────────────────────
async function perceelKlik(lat: number, lng: number): Promise<NextResponse> {
  try {
    const [x, y] = proj4('EPSG:4326', 'EPSG:31370', [lng, lat])

    // Stap 1: identificeer perceel (Capakey API geeft ook geometry als JSON)
    const capaInfo = await getCapakeyMetGeometrie(x, y)
    if (!capaInfo?.capakey) {
      return NextResponse.json({ error: 'Geen perceel gevonden op deze locatie' } as PerceelKlikResultaat)
    }

    // Stap 2: alle gebouwen op dit perceel ophalen
    // Basisregisters gebruikt '-' waar Capakey API '/' gebruikt
    const basisregCapakey = capaInfo.capakey.replace('/', '-')
    const gebouwen = await getAlleGebouwen(basisregCapakey)

    return NextResponse.json({
      capakey:        capaInfo.capakey,
      perceelnummer:  capaInfo.perceelnummer,
      afdeling:       capaInfo.afdeling,
      aantalAdressen: capaInfo.aantalAdressen,
      gemeente:       capaInfo.gemeente ?? null,
      perceelGrenzen: capaInfo.perceelGrenzen,
      gebouwen,
    } satisfies PerceelKlikResultaat)
  } catch {
    return NextResponse.json({ error: 'Fout bij opzoeken perceel' } as PerceelKlikResultaat)
  }
}

// ─── 3D GRB — hoogte en gebouwinfo via WMS GetFeatureInfo ────────────

async function get3DGrbInfo(x: number, y: number): Promise<Hoogte3D | null> {
  try {
    const delta = 40 // 80m venster
    const url = `${WMS_3DGRB}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo` +
      `&LAYERS=GRBGEBL1D2&QUERY_LAYERS=GRBGEBL1D2` +
      `&INFO_FORMAT=${encodeURIComponent('application/geo+json')}` +
      `&CRS=EPSG:31370` +
      `&BBOX=${Math.round(x - delta)},${Math.round(y - delta)},${Math.round(x + delta)},${Math.round(y + delta)}` +
      `&WIDTH=101&HEIGHT=101&I=50&J=50&FEATURE_COUNT=5`

    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()

    const features = data?.features
    if (!Array.isArray(features) || features.length === 0) return null

    // Pak het dichtstbijzijnde hoofdgebouw, of anders het eerste resultaat
    const hoofd = features.find(
      (f: { properties?: { ENTITEIT?: string } }) => f.properties?.ENTITEIT === 'Gbg'
    ) ?? features[0]
    const p = hoofd.properties
    if (!p) return null

    return {
      nokhoogte:   parseVlaamsGetal(p.HN_P99)   ?? parseVlaamsGetal(p.HN_MAX),
      grondniveau: parseVlaamsGetal(p.H_DTM_GEM) ?? parseVlaamsGetal(p.H_DTM_MIN),
      gebouwType:  p.LBLTYPE ?? null,
      footprint3d: parseVlaamsGetal(p.OPPERVL),
      kwaliteit:   p.H_KWAL ?? null,
    }
  } catch {
    return null
  }
}

/** Parse getal dat ofwel een JSON number ofwel een string met komma als decimaal is */
function parseVlaamsGetal(val: unknown): number | null {
  if (val == null) return null
  if (typeof val === 'number') return isNaN(val) ? null : Math.round(val * 100) / 100
  if (typeof val === 'string') {
    const cleaned = val.replace(',', '.')
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : Math.round(num * 100) / 100
  }
  return null
}

// ─── Dakoppervlakte schatting met hellingcorrectie ───────────────────

/**
 * Schat werkelijke dakoppervlakte op basis van footprint + nokhoogte.
 *
 * Zonder hoogte: geeft footprint terug (= minimum).
 * Met hoogte: corrigeert voor gemiddelde dakhelling.
 *
 * Heuristiek:
 *  - nokhoogte < 5m  → vermoedelijk plat dak / laagbouw → factor ~1.05
 *  - nokhoogte 5-8m  → gemiddeld hellend dak (25-30°)   → factor ~1.15
 *  - nokhoogte 8-12m → steil hellend dak (35-45°)       → factor ~1.30
 *  - nokhoogte > 12m → hoog gebouw, vaak plat dak        → factor ~1.05
 *
 * Bij hoge gebouwen (>12m) met klein grondvlak (<150m²) is het
 * waarschijnlijk een smal huis met steil dak → hogere factor.
 */
function berekenDakOppervlak(
  footprint: number | null,
  nokhoogte: number | null
): number | null {
  if (!footprint) return null
  if (!nokhoogte) return footprint // geen hoogte → geef footprint terug

  let factor: number

  if (nokhoogte > 12 && footprint > 150) {
    // Groot hoog gebouw → waarschijnlijk plat dak (appartementsblok)
    factor = 1.05
  } else if (nokhoogte > 12 && footprint <= 150) {
    // Klein hoog gebouw → smal huis met steil dak
    factor = 1.35
  } else if (nokhoogte >= 8) {
    // Typisch Vlaamse woning met steile kap
    factor = 1.30
  } else if (nokhoogte >= 5) {
    // Gemiddeld hellend dak
    factor = 1.15
  } else {
    // Laagbouw / plat dak
    factor = 1.05
  }

  return Math.round(footprint * factor)
}

// ─── Helpers ─────────────────────────────────────────────────────────

async function berekenOppervlakte(
  postcode: string, huisnummer: string, straat: string
): Promise<number | null> {
  try {
    const adresRes = await fetch(
      `${BASISREG}/adressen?postcode=${postcode}&huisnummer=${encodeURIComponent(huisnummer)}&straatnaam=${encodeURIComponent(straat)}`
    )
    if (!adresRes.ok) return null
    const adresObjectId = (await adresRes.json()).adressen?.[0]?.identificator?.objectId
    if (!adresObjectId) return null

    const perceelRes = await fetch(`${BASISREG}/percelen?adresObjectId=${adresObjectId}`)
    if (!perceelRes.ok) return null
    const capakey = (await perceelRes.json()).percelen?.[0]?.identificator?.objectId
    if (!capakey) return null

    return getGebouwOppervlakte(capakey)
  } catch {
    return null
  }
}

async function getGebouwOppervlakte(capakey: string): Promise<number | null> {
  try {
    const basisregCapakey = capakey.replace('/', '-')
    const gebouwenRes = await fetch(`${BASISREG}/gebouwen?capakey=${encodeURIComponent(basisregCapakey)}`)
    if (!gebouwenRes.ok) return null
    const detailUrl = (await gebouwenRes.json()).gebouwen?.[0]?.detail
    if (!detailUrl) return null

    const gebouw = await (await fetch(detailUrl)).json()
    const gml: string = gebouw.gebouwPolygoon?.geometrie?.gml ?? ''
    const lambert72 = extractCoordsFromGml(gml)
    if (!lambert72) return null
    return Math.round(shoelace(lambert72))
  } catch {
    return null
  }
}

/** Alle gebouwen op een perceel ophalen met contour + 3D hoogte */
async function getAlleGebouwen(basisregCapakey: string): Promise<GebouwInfo[]> {
  try {
    const gebouwenRes = await fetch(`${BASISREG}/gebouwen?capakey=${encodeURIComponent(basisregCapakey)}`)
    if (!gebouwenRes.ok) return []
    const lijst = (await gebouwenRes.json()).gebouwen ?? []
    if (lijst.length === 0) return []

    // Alle gebouwdetails parallel ophalen
    const details = await Promise.all(
      lijst.map(async (g: { detail?: string }): Promise<GebouwInfo | null> => {
        if (!g.detail) return null
        try {
          const gebouw = await (await fetch(g.detail)).json()
          const gml: string = gebouw.gebouwPolygoon?.geometrie?.gml ?? ''
          const lambert72 = extractCoordsFromGml(gml)
          if (!lambert72 || lambert72.length < 3) return null

          const oppervlakte = Math.round(shoelace(lambert72))
          const grenzen = lambert72ToWgs84(lambert72)

          // 3D hoogte ophalen via centroïde van het gebouw
          const cx = lambert72.reduce((s, [x]) => s + x, 0) / lambert72.length
          const cy = lambert72.reduce((s, [, y]) => s + y, 0) / lambert72.length
          const hoogte3d = await get3DGrbInfo(cx, cy)

          const dakOppervlak = berekenDakOppervlak(oppervlakte, hoogte3d?.nokhoogte ?? null)

          return { oppervlakte, dakOppervlak, grenzen, hoogte3d }
        } catch {
          return null
        }
      })
    )

    return details.filter((d): d is GebouwInfo => d !== null)
  } catch {
    return []
  }
}

/** Capakey API met perceelgeometrie (JSON formaat) */
async function getCapakeyMetGeometrie(x: number, y: number) {
  try {
    const res = await fetch(`${CAPAKEY}/parcel?x=${Math.round(x)}&y=${Math.round(y)}&srs=31370`)
    if (!res.ok) return null
    const d = await res.json()
    if (!d?.result?.succes) return null

    // Perceelgeometrie zit als JSON-string in d.geometry.boundingBox
    // We moeten de polygon-coördinaten (Lambert72) → WGS84 converteren
    let perceelGrenzen: [number, number][] | null = null
    try {
      const geomJson = JSON.parse(d.geometry?.boundingBox ?? '{}')
      const coords: number[][][] = geomJson?.coordinates
      if (coords?.[0]) {
        perceelGrenzen = coords[0].map(([x, y]) => {
          const [lng, lat] = proj4('EPSG:31370', 'EPSG:4326', [x, y])
          return [lat, lng] as [number, number]
        })
      }
    } catch { /* geometry parsing mislukt, niet fataal */ }

    return {
      capakey:        d.capakey        ?? null,
      perceelnummer:  d.perceelnummer  ?? null,
      afdeling:       d.departmentName ?? null,
      aantalAdressen: Array.isArray(d.adres) ? d.adres.length : null,
      gemeente:       d.municipalityName ?? null,
      perceelGrenzen,
    }
  } catch {
    return null
  }
}

/** Oude getCapakey voor de meting() flow (zonder geometrie) */
async function getCapakey(x: number, y: number) {
  try {
    const res = await fetch(`${CAPAKEY}/parcel?x=${Math.round(x)}&y=${Math.round(y)}&srs=31370`)
    if (!res.ok) return null
    const d = await res.json()
    if (!d?.result?.succes) return null
    return {
      capakey:        d.capakey        ?? null,
      perceelnummer:  d.perceelnummer  ?? null,
      afdeling:       d.departmentName ?? null,
      aantalAdressen: Array.isArray(d.adres) ? d.adres.length : null,
      gemeente:       d.municipalityName ?? null,
    }
  } catch {
    return null
  }
}

/** Parse Lambert72 coördinaten uit GML posList */
function extractCoordsFromGml(gml: string): [number, number][] | null {
  const match = gml.match(/<gml:posList[^>]*>([\s\S]+?)<\/gml:posList>/)
  if (!match) return null

  const nums = match[1].trim().split(/\s+/).map(Number)
  const punten: [number, number][] = []
  for (let i = 0; i + 1 < nums.length; i += 2) punten.push([nums[i], nums[i + 1]])
  return punten.length > 2 ? punten : null
}

/** Lambert72 [x,y][] → WGS84 [lat,lng][] voor Leaflet */
function lambert72ToWgs84(coords: [number, number][]): [number, number][] {
  return coords.map(([x, y]) => {
    const [lng, lat] = proj4('EPSG:31370', 'EPSG:4326', [x, y])
    return [lat, lng] as [number, number]
  })
}

function shoelace(punten: [number, number][]): number {
  let som = 0
  const n = punten.length
  for (let i = 0; i < n; i++) {
    const [x1, y1] = punten[i]
    const [x2, y2] = punten[(i + 1) % n]
    som += x1 * y2 - x2 * y1
  }
  return Math.abs(som / 2)
}
