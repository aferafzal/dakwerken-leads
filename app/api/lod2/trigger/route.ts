import { NextRequest, NextResponse } from 'next/server'
import { list } from '@vercel/blob'

export async function POST(req: NextRequest) {
  const { capakey, footprint_wgs84, nokhoogte, gebouwType } = await req.json()

  if (!capakey || !footprint_wgs84?.length) {
    return NextResponse.json({ error: 'capakey + footprint_wgs84 vereist' }, { status: 400 })
  }

  const safe = (capakey as string).replace(/\//g, '_')

  // Check Vercel Blob cache (Vercel voegt random suffix toe vóór .glb)
  try {
    const { blobs } = await list({
      prefix: `lod2/v3/${safe}`,
      limit: 5,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    const glb = blobs.find((b) => b.pathname.endsWith('.glb'))
    if (glb) {
      return NextResponse.json({ status: 'done', url: glb.url })
    }
  } catch {
    // Blob niet gevonden of fout → ga door naar Modal trigger
  }

  // Trigger Modal job (fire-and-forget)
  const modalUrl = process.env.MODAL_TRIGGER_URL
  if (!modalUrl) {
    return NextResponse.json({ error: 'MODAL_TRIGGER_URL niet geconfigureerd' }, { status: 500 })
  }

  try {
    await fetch(modalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capakey, footprint_wgs84, nokhoogte, gebouwType }),
    })
  } catch (err) {
    console.error('Modal trigger fout:', err)
    return NextResponse.json({ error: 'Modal trigger mislukt' }, { status: 502 })
  }

  return NextResponse.json({ status: 'processing' })
}
