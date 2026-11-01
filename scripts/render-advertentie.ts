/**
 * Render de advertentie voor sociale media (remotion/DakAdvertentie) naar advertenties/ (niet in git):
 *   dakwerken-advertentie-9x16.mp4  — Reels, TikTok, Stories en de Facebook-feed (1080×1920)
 *   dakwerken-advertentie-cover.jpg — omslagbeeld
 * Gebruik: npx tsx scripts/render-advertentie.ts
 *
 * Het dronebeeld komt van de hero-video online (NEXT_PUBLIC_HERO_VIDEO_URL uit .env.local).
 */

import { mkdirSync, readFileSync } from 'fs'
import path from 'path'
import { bundle } from '@remotion/bundler'
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer'

function heroUrl(): string | null {
  if (process.env.NEXT_PUBLIC_HERO_VIDEO_URL) return process.env.NEXT_PUBLIC_HERO_VIDEO_URL
  try {
    const regel = readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').match(/^NEXT_PUBLIC_HERO_VIDEO_URL=(.+)$/m)
    return regel ? regel[1].trim().replace(/^["']|["']$/g, '') : null
  } catch {
    return null
  }
}

async function main() {
  const cwd = process.cwd()
  const uit = path.join(cwd, 'advertenties')
  mkdirSync(uit, { recursive: true })
  const inputProps = { heroUrl: heroUrl() }
  if (!inputProps.heroUrl) console.warn('Geen NEXT_PUBLIC_HERO_VIDEO_URL: zonder dronebeeld op de achtergrond')

  console.log('Bundelen…')
  const serveUrl = await bundle({
    entryPoint: path.join(cwd, 'remotion', 'DakAdvertentie', 'index.tsx'),
    publicDir: path.join(cwd, 'remotion', 'DakAdvertentie', 'beelden'),
    webpackOverride: (config) => config,
  })
  const composition = await selectComposition({ serveUrl, id: 'DakAdvertentie', inputProps })

  const video = path.join(uit, 'dakwerken-advertentie-9x16.mp4')
  console.log(`Renderen naar ${video}…`)
  await renderMedia({
    composition,
    serveUrl,
    inputProps,
    codec: 'h264',
    crf: 18,            // hoge kwaliteit: Instagram en TikTok comprimeren zelf nog
    outputLocation: video,
    onProgress: ({ progress }) => process.stdout.write(`\r  ${Math.round(progress * 100)}%`),
  })

  // Omslag: de eerste vraag met het antwoord in beeld
  await renderStill({
    composition,
    serveUrl,
    inputProps,
    output: path.join(uit, 'dakwerken-advertentie-cover.jpg'),
    frame: 140,
    imageFormat: 'jpeg',
    jpegQuality: 90,
  })

  console.log(`\nKlaar: ${uit}`)
}

main().catch((err) => {
  console.error('Renderen mislukt:', err)
  process.exit(1)
})
