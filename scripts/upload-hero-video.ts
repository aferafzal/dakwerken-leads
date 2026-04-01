/**
 * Eenmalig script: upload public/hero.mp4 naar Vercel Blob
 * Gebruik: npx tsx scripts/upload-hero-video.ts
 */
import { put } from '@vercel/blob'
import { readFileSync } from 'fs'
import { join } from 'path'

function loadEnvLocal() {
  try {
    const env = readFileSync('.env.local', 'utf-8')
    for (const line of env.split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const val = match[2].trim().replace(/^"|"$/g, '')
        if (!process.env[key]) process.env[key] = val
      }
    }
  } catch {}
}

async function main() {
  loadEnvLocal()

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    console.error('❌ BLOB_READ_WRITE_TOKEN ontbreekt in je omgeving')
    process.exit(1)
  }

  const filePath = join(process.cwd(), 'public', 'hero-compressed.mp4')
  const file = readFileSync(filePath)

  console.log('⬆️  Bezig met uploaden van hero.mp4 naar Vercel Blob...')

  const blob = await put('hero.mp4', file, {
    access: 'public',
    token,
    contentType: 'video/mp4',
    allowOverwrite: true,
  })

  console.log('\n✅ Upload geslaagd!')
  console.log('🔗 URL:', blob.url)
  console.log('\nVoeg dit toe aan je .env.local en .env.production:')
  console.log(`NEXT_PUBLIC_HERO_VIDEO_URL=${blob.url}`)
}

main().catch(console.error)
