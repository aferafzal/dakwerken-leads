/**
 * Render het promofilmpje (remotion/DakPromo) naar public/promo.mp4 en public/promo-poster.jpg.
 * Gebruik: npx tsx scripts/render-promo.ts
 * Neem eerst de beelden op met: npx tsx scripts/promo-opname.ts
 *
 * Het dronebeeld komt van de hero-video online (NEXT_PUBLIC_HERO_VIDEO_URL uit .env.local),
 * zodat het grote bestand niet in git hoeft.
 */

import { readFileSync } from 'fs'
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
  const entryPoint = path.join(cwd, 'remotion', 'DakPromo', 'index.tsx')
  const video = path.join(cwd, 'public', 'promo.mp4')
  const poster = path.join(cwd, 'public', 'promo-poster.jpg')
  const inputProps = { heroUrl: heroUrl() }
  if (!inputProps.heroUrl) console.warn('Geen NEXT_PUBLIC_HERO_VIDEO_URL: de intro wordt zonder dronebeeld gerenderd')

  console.log('Bundelen…')
  const serveUrl = await bundle({
    entryPoint,
    // staticFile() leest uit de bronbeelden, niet uit public/
    publicDir: path.join(cwd, 'remotion', 'DakPromo', 'beelden'),
    webpackOverride: (config) => config,
  })

  const composition = await selectComposition({ serveUrl, id: 'DakPromo', inputProps })

  console.log(`Renderen naar ${video}…`)
  await renderMedia({
    composition,
    serveUrl,
    inputProps,
    codec: 'h264',
    crf: 28,            // klein bestand voor de website
    scale: 2 / 3,       // 1280×720: scherp genoeg op de site, veel lichter
    outputLocation: video,
    onProgress: ({ progress }) => process.stdout.write(`\r  ${Math.round(progress * 100)}%`),
  })

  // Poster: de prijsscène, met de prijskaart in beeld
  await renderStill({
    composition,
    serveUrl,
    inputProps,
    output: poster,
    frame: 555 + 110,
    imageFormat: 'jpeg',
    jpegQuality: 82,
    scale: 2 / 3,
  })

  console.log(`\nKlaar: ${video} en ${poster}`)
}

main().catch((err) => {
  console.error('Renderen mislukt:', err)
  process.exit(1)
})
