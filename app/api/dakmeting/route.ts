import { NextRequest, NextResponse } from 'next/server'

const GEO      = 'https://geo.api.vlaanderen.be/Geolocation/v4'
const BASISREG = 'https://api.basisregisters.vlaanderen.be/v2'
const CAPAKEY  = 'https://geo.api.vlaanderen.be/capakey/v2'

export type DakmetingResultaat = {
  oppervlakte:   number | null
  gemeente:      string | null
  capakey:       string | null
  perceelnummer: string | null
  afdeling:      string | null
  aantalAdressen: number | null
}

// GET /api/dakmeting?q=...      → adres autocomplete suggesties
// GET /api/dakmeting?adres=...  → DakmetingResultaat
export async function GET(req: NextRequest) {
  const q     = req.nextUrl.searchParams.get('q')
  const adres = req.nextUrl.searchParams.get('adres')

  if (q)     return suggesties(q)
  if (adres) return meting(adres)
  return NextResponse.json({ error: 'q of adres parameter vereist' }, { status: 400 })
}

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

async function meting(adres: string): Promise<NextResponse> {
  const leeg: DakmetingResultaat = {
    oppervlakte: null, gemeente: null, capakey: null,
    perceelnummer: null, afdeling: null, aantalAdressen: null,
  }

  try {
    // Stap 1: adres → Lambert72 coördinaten + adrescomponenten
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

    if (!straat || !huisnummer || !postcode) return NextResponse.json({ ...leeg, gemeente })

    // Stap 2 & 3: gebouwoppervlakte + Capakey parallel ophalen
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
    } satisfies DakmetingResultaat)
  } catch {
    return NextResponse.json(leeg)
  }
}

async function berekenOppervlakte(
  postcode: string, huisnummer: string, straat: string
): Promise<number | null> {
  try {
    // Stap 1: adresObjectId ophalen
    const adresRes = await fetch(
      `${BASISREG}/adressen?postcode=${postcode}&huisnummer=${encodeURIComponent(huisnummer)}&straatnaam=${encodeURIComponent(straat)}`
    )
    if (!adresRes.ok) return null
    const adresObjectId = (await adresRes.json()).adressen?.[0]?.identificator?.objectId
    if (!adresObjectId) return null

    // Stap 2: perceel ophalen → capakey
    // (gebouwen?adresObjectId is kapot in de Basisregisters API — altijd zelfde gebouw)
    const perceelRes = await fetch(`${BASISREG}/percelen?adresObjectId=${adresObjectId}`)
    if (!perceelRes.ok) return null
    const capakey = (await perceelRes.json()).percelen?.[0]?.identificator?.objectId
    if (!capakey) return null

    // Stap 3: gebouw via capakey → polygoon
    const gebouwenRes = await fetch(`${BASISREG}/gebouwen?capakey=${encodeURIComponent(capakey)}`)
    if (!gebouwenRes.ok) return null
    const detailUrl = (await gebouwenRes.json()).gebouwen?.[0]?.detail
    if (!detailUrl) return null

    const gebouw = await (await fetch(detailUrl)).json()
    const gml: string = gebouw.gebouwPolygoon?.geometrie?.gml ?? ''
    const match = gml.match(/<gml:posList[^>]*>([\s\S]+?)<\/gml:posList>/)
    if (!match) return null

    const nums = match[1].trim().split(/\s+/).map(Number)
    const punten: [number, number][] = []
    for (let i = 0; i + 1 < nums.length; i += 2) punten.push([nums[i], nums[i + 1]])
    return Math.round(shoelace(punten))
  } catch {
    return null
  }
}

async function getCapakey(x: number, y: number) {
  try {
    const res = await fetch(`${CAPAKEY}/parcel?x=${Math.round(x)}&y=${Math.round(y)}&srs=31370`)
    if (!res.ok) return null
    const d = await res.json()
    if (!d?.result?.succes) return null
    return {
      capakey:        d.capakey       ?? null,
      perceelnummer:  d.perceelnummer ?? null,
      afdeling:       d.departmentName ?? null,
      aantalAdressen: Array.isArray(d.adres) ? d.adres.length : null,
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
