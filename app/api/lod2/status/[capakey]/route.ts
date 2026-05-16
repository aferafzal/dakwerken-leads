import { NextRequest, NextResponse } from 'next/server'
import { list } from '@vercel/blob'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ capakey: string }> },
) {
  const { capakey } = await params
  const safe = capakey.replace(/\//g, '_')

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
    // geen blob gevonden
  }

  return NextResponse.json({ status: 'processing' })
}
