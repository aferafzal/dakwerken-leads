import { NextRequest, NextResponse } from 'next/server'

const GEO = 'https://geo.api.vlaanderen.be/Geolocation/v4'
const BASISREG = 'https://api.basisregisters.vlaanderen.be/v2'

// GET /api/dakmeting?q=...      → adres autocomplete suggesties
// GET /api/dakmeting?adres=...  → { oppervlakte: number|null, gemeente: string|null }
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  const adres = req.nextUrl.searchParams.get('adres')

  if (q) return suggesties(q)
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

async function meting(adres: string) {
  try {
    // Stap 1: adres → velden + Lambert72 coördinaten
    const locRes = await fetch(`${GEO}/Location?q=${encodeURIComponent(adres)}`)
    if (!locRes.ok) return NextResponse.json({ oppervlakte: null, gemeente: null })
    const locData = await locRes.json()
    const loc = locData.LocationResult?.[0]
    if (!loc) return NextResponse.json({ oppervlakte: null, gemeente: null })

    const gemeente: string = loc.Municipality ?? null
    const postcode: string = loc.Zipcode
    const straat: string = loc.Thoroughfarename
    const huisnummer: string = loc.Housenumber

    if (!straat || !huisnummer || !postcode) {
      return NextResponse.json({ oppervlakte: null, gemeente })
    }

    // Stap 2: adres → adresObjectId
    const adresRes = await fetch(
      `${BASISREG}/adressen?postcode=${postcode}&huisnummer=${encodeURIComponent(huisnummer)}&straatnaam=${encodeURIComponent(straat)}`
    )
    if (!adresRes.ok) return NextResponse.json({ oppervlakte: null, gemeente })
    const adresData = await adresRes.json()
    const adresObjectId = adresData.adressen?.[0]?.identificator?.objectId
    if (!adresObjectId) return NextResponse.json({ oppervlakte: null, gemeente })

    // Stap 3: adresObjectId → gebouw detail URL
    const gebouwenRes = await fetch(`${BASISREG}/gebouwen?adresObjectId=${adresObjectId}`)
    if (!gebouwenRes.ok) return NextResponse.json({ oppervlakte: null, gemeente })
    const gebouwenData = await gebouwenRes.json()
    const detailUrl = gebouwenData.gebouwen?.[0]?.detail
    if (!detailUrl) return NextResponse.json({ oppervlakte: null, gemeente })

    // Stap 4: gebouw polygoon ophalen (GML posList)
    const gebouwRes = await fetch(detailUrl)
    if (!gebouwRes.ok) return NextResponse.json({ oppervlakte: null, gemeente })
    const gebouw = await gebouwRes.json()

    const gml: string = gebouw.gebouwPolygoon?.geometrie?.gml ?? ''
    const posListMatch = gml.match(/<gml:posList[^>]*>([\s\S]+?)<\/gml:posList>/)
    if (!posListMatch) return NextResponse.json({ oppervlakte: null, gemeente })

    // Stap 5: oppervlakte berekenen via Shoelace (Lambert72 = meters → m²)
    const nums = posListMatch[1].trim().split(/\s+/).map(Number)
    const punten: [number, number][] = []
    for (let i = 0; i + 1 < nums.length; i += 2) {
      punten.push([nums[i], nums[i + 1]])
    }

    const oppervlakte = shoelace(punten)
    return NextResponse.json({ oppervlakte: Math.round(oppervlakte), gemeente })
  } catch {
    return NextResponse.json({ oppervlakte: null, gemeente: null })
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
