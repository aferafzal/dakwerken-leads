/**
 * Render de Spotable Explainer video naar /public/explainer.mp4
 * Gebruik: npx ts-node scripts/render-explainer.ts
 *
 * Vereisten:
 *   - Chrome/Chromium geïnstalleerd (Remotion gebruikt headless Chrome)
 *   - npx remotion lambda install --bundle (voor cloud rendering)
 *     OF lokaal renderen (zie hieronder)
 */

// Run: npm install @remotion/bundler @remotion/renderer --save-dev
// Then: npx ts-node scripts/render-explainer.ts

import path from 'path'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { bundle } = require('@remotion/bundler') as typeof import('@remotion/bundler')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderMedia, selectComposition } = require('@remotion/renderer') as typeof import('@remotion/renderer')

async function main() {
  console.log('🎬 Remotion explainer video renderen...\n')

  const outputPath = path.join(process.cwd(), 'public', 'explainer.mp4')
  const entryPoint = path.join(process.cwd(), 'remotion', 'SpotableExplainer', 'index.tsx')

  // Stap 1: Bundle de Remotion compositie
  console.log('📦 Bundelen...')
  const bundleLocation = await bundle({
    entryPoint,
    webpackOverride: (config: object) => config,
  })

  // Stap 2: Selecteer de compositie
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'SpotableExplainer',
  })

  // Stap 3: Render naar MP4
  console.log(`⏳ Renderen naar ${outputPath} ...`)
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    onProgress: ({ progress }) => {
      process.stdout.write(`\r  Voortgang: ${Math.round(progress * 100)}%`)
    },
  })

  console.log('\n✅ Video gerenderd naar /public/explainer.mp4')
}

main().catch((err) => {
  console.error('❌ Rendering mislukt:', err)
  process.exit(1)
})
