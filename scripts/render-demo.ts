/**
 * Render de demovideo (remotion/DakRapportDemo) naar public/demo.mp4 en public/demo-poster.jpg.
 * Gebruik: npx tsx scripts/render-demo.ts
 * Neem eerst de beelden op met: npx tsx scripts/demo-opname.ts
 */

import path from 'path'
import { bundle } from '@remotion/bundler'
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer'

async function main() {
  const cwd = process.cwd()
  const entryPoint = path.join(cwd, 'remotion', 'DakRapportDemo', 'index.tsx')
  const video = path.join(cwd, 'public', 'demo.mp4')
  const poster = path.join(cwd, 'public', 'demo-poster.jpg')

  console.log('Bundelen…')
  const serveUrl = await bundle({
    entryPoint,
    // staticFile() leest uit de bronbeelden, niet uit public/
    publicDir: path.join(cwd, 'remotion', 'DakRapportDemo', 'beelden'),
    webpackOverride: (config) => config,
  })

  const composition = await selectComposition({ serveUrl, id: 'DakRapportDemo' })

  console.log(`Renderen naar ${video}…`)
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    crf: 30,            // klein bestand voor de website (< 3 MB)
    scale: 2 / 3,       // 1280×720: scherp genoeg op de site, veel lichter
    outputLocation: video,
    onProgress: ({ progress }) => process.stdout.write(`\r  ${Math.round(progress * 100)}%`),
  })

  // Poster: het midden van de kaartscène
  await renderStill({
    composition,
    serveUrl,
    output: poster,
    frame: 165 + 75,
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
