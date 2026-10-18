import { NextRequest, NextResponse } from 'next/server'
import { scanGebouw } from '@/lib/dakscan'

// GET /api/dakscan?gebouw=<objectId uit het Gebouwenregister> → Dakscan
export async function GET(req: NextRequest) {
  const gebouw = req.nextUrl.searchParams.get('gebouw') ?? ''
  if (!/^\d{1,12}$/.test(gebouw)) {
    return NextResponse.json({ error: 'gebouw-ID vereist' }, { status: 400 })
  }
  try {
    const scan = await scanGebouw(gebouw)
    if (!scan) return NextResponse.json({ error: 'Gebouw niet gevonden' }, { status: 404 })
    // De hoogtemeting verandert niet: lang bewaren op het CDN
    return NextResponse.json(scan, {
      headers: { 'Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=86400' },
    })
  } catch {
    return NextResponse.json({ error: 'Dakscan mislukt' }, { status: 502 })
  }
}
