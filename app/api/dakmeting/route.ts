import { NextRequest, NextResponse } from 'next/server'
import proj4 from 'proj4'

const GEO      = 'https://geo.api.vlaanderen.be/Geolocation/v4'
const BASISREG = 'https://api.basisregisters.vlaanderen.be/v2'
const CAPAKEY  = 'https://geo.api.vlaanderen.be/capakey/v2'

const WMS_LUCHT = 'https://geo.api.vlaanderen.be/OMWRGBMRVL/wms'

// Lambert72 projectie (Belgisch kadaster)
proj4.defs(
  'EPSG:31370',
  '+proj=lcc +lat_1=51.16667723333333 +lat_2=49.8333339 +lat_0=90 +lon_0=4.367486666666666 +x_0=150000.013 +y_0=5400088.438 +ellps=intl +towgs84=-106.868628,52.297783,-103.723893,0.336570,-0.456955,1.842183,-1.2747 +units=m +no_defs'
)

export type DakmetingResultaat = {
  oppervlakte:    number | null
  gemeente:       string | null
  capakey:        string | null
  perceelnummer:  string | null
  afdeling:       string | null
  aantalAdressen: number | null
  luchtfotoUrl:   string | null
  lat:            number | null
  lng:            number | null
}

export type PerceelKlikResultaat = {
  capakey:        string | null
  perceelnummer:  string | null
  afdeling:       string | null
  aantalAdressen: number | null
  oppervlakte:    number | null
  gemeente:       string | null
  error?:         string
}

// GET /api/dakmeting?q=...                    → adres autocomplete suggesties
// GET /api/dakmeting?adres=...                → DakmetingResultaat
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
    oppervlakte: null, gemeente: null, capakey: null,
    perceelnummer: null, afdeling: null, aantalAdressen: null,
    luchtfotoUrl: null, lat: null, lng: null,
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

    // WGS84 coördinaten voor de kaart
    const lat: number | null = loc.Location?.Lat_WGS84 ?? null
    const lng: number | null = loc.Location?.Lon_WGS84 ?? null

    if (!straat || !huisnummer || !postcode) return NextResponse.json({ ...leeg, gemeente, lat, lng })

    const luchtfotoUrl = x && y
      ? `${WMS_LUCHT}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image/png&LAYERS=Ortho&STYLES=&CRS=EPSG:31370&BBOX=${Math.round(x - 40)},${Math.round(y - 40)},${Math.round(x + 40)},${Math.round(y + 40)}&WIDTH=500&HEIGHT=500`
      : null

    const [oppervlakte, capaInfo] = await Promise.all([
      berekenOppervlakte(postcode, huisnummer, straat),
      x && y ? getCapakey(x, y) : Promise.resolve(null),
    ])

    return NextResponse.json({
      oppervlakte,
      gemeente,
      capakey:        capaInfo?.capakey        ?? null,
      perceelnummer:  capaInfo?.perceelnummer  ?? null,
      afdeling:       capaInfo?.afdeling       ?? null,
      aantalAdressen: capaInfo?.aantalAdressen ?? null,
      luchtfotoUrl,
      lat,
      lng,
    } satisfies DakmetingResultaat)
  } catch {
    return NextResponse.json(leeg)
  }
}

// ─── Klik op kaart → perceelinfo ─────────────────────────────────────
async function perceelKlik(lat: number, lng: number): Promise<NextResponse> {
  try {
    // WGS84 → Lambert72
    const [x, y] = proj4('EPSG:4326', 'EPSG:31370', [lng, lat])

    const [capaInfo, oppervlakte] = await Promise.all([
      getCapakey(x, y),
      getGebouwOppervlakteXY(x, y),
    ])

    if (!capaInfo) {
      return NextResponse.json({ error: 'Geen perceel gevonden op deze locatie' } as PerceelKlikResultaat)
    }

    // Als oppervlakte niet gevonden via XY, probeer via capakey
    const opp = oppervlakte ?? (capaInfo.capakey ? await getGebouwOppervlakte(capaInfo.capakey) : null)

    return NextResponse.json({
      capakey:        capaInfo.capakey,
      perceelnummer:  capaInfo.perceelnummer,
      afdeling:       capaInfo.afdeling,
      aantalAdressen: capaInfo.aantalAdressen,
      oppervlakte:    opp,
      gemeente:       capaInfo.gemeente ?? null,
    } satisfies PerceelKlikResultaat)
  } catch {
    return NextResponse.json({ error: 'Fout bij opzoeken perceel' } as PerceelKlikResultaat)
  }
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

/** Gebouwoppervlakte ophalen via capakey */
async function getGebouwOppervlakte(capakey: string): Promise<number | null> {
  try {
    const gebouwenRes = await fetch(`${BASISREG}/gebouwen?capakey=${encodeURIComponent(capakey)}`)
    if (!gebouwenRes.ok) return null
    const detailUrl = (await gebouwenRes.json()).gebouwen?.[0]?.detail
    if (!detailUrl) return null

    const gebouw = await (await fetch(detailUrl)).json()
    return extractOppervlakteFromGml(gebouw.gebouwPolygoon?.geometrie?.gml ?? '')
  } catch {
    return null
  }
}

/** Gebouwoppervlakte ophalen via Lambert72 XY (zoekt dichtstbijzijnde gebouw) */
async function getGebouwOppervlakteXY(x: number, y: number): Promise<number | null> {
  try {
    // Zoek gebouwen in een straal van ~30m rond het punt
    const gebouwenRes = await fetch(
      `${BASISREG}/gebouwen?status=gerealiseerd&limit=1` +
      `&boundingBox.lowerLeft=${Math.round(x - 30)},${Math.round(y - 30)}` +
      `&boundingBox.upperRight=${Math.round(x + 30)},${Math.round(y + 30)}`
    )
    if (!gebouwenRes.ok) return null
    const detailUrl = (await gebouwenRes.json()).gebouwen?.[0]?.detail
    if (!detailUrl) return null

    const gebouw = await (await fetch(detailUrl)).json()
    return extractOppervlakteFromGml(gebouw.gebouwPolygoon?.geometrie?.gml ?? '')
  } catch {
    return null
  }
}

function extractOppervlakteFromGml(gml: string): number | null {
  const match = gml.match(/<gml:posList[^>]*>([\s\S]+?)<\/gml:posList>/)
  if (!match) return null

  const nums = match[1].trim().split(/\s+/).map(Number)
  const punten: [number, number][] = []
  for (let i = 0; i + 1 < nums.length; i += 2) punten.push([nums[i], nums[i + 1]])
  return Math.round(shoelace(punten))
}

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
