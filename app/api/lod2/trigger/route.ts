import { NextRequest, NextResponse } from 'next/server'
import { list } from '@vercel/blob'

type Gebouw = {
  footprint_wgs84: [number, number][]
  nokhoogte?: number | null
  gebouwType?: string | null
}

export async function POST(req: NextRequest) {
  const { capakey, gebouwen } = await req.json() as { capakey?: string; gebouwen?: Gebouw[] }

  if (!capakey || !gebouwen?.length) {
    return NextResponse.json({ error: 'capakey + gebouwen vereist' }, { status: 400 })
  }

  const safe = capakey.replace(/\//g, '_')

  // Check Vercel Blob cache (v4 = multi-gebouw versie)
  try {
    const { blobs } = await list({
      prefix: `lod2/v5/${safe}.glb`,
      limit: 5,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    const glb = blobs.find((b) => b.pathname.endsWith('.glb'))
    if (glb) {
      return NextResponse.json({ status: 'done', url: glb.url })
    }
  } catch {
    // niet gecached → trigger Modal
  }

  const modalUrl = process.env.MODAL_TRIGGER_URL
  if (!modalUrl) {
    return NextResponse.json({ error: 'MODAL_TRIGGER_URL niet geconfigureerd' }, { status: 500 })
  }

  try {
    await fetch(modalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capakey, gebouwen }),
    })
  } catch (err) {
    console.error('Modal trigger fout:', err)
    return NextResponse.json({ error: 'Modal trigger mislukt' }, { status: 502 })
  }

  return NextResponse.json({ status: 'processing' })
}
