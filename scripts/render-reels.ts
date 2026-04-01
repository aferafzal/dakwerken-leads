/**
 * Remotion: batch render before/after Reels (30s, 9:16)
 * Gebruik: npx ts-node scripts/render-reels.ts
 *
 * Vereisten:
 *   - npm install @remotion/bundler @remotion/renderer --save-dev
 *   - Foto's beschikbaar in /public/processed/ (voor + na paren)
 * Output: /public/reels/
 */

import fs from 'fs'
import path from 'path'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'

const PROCESSED_DIR = path.join(process.cwd(), 'public', 'processed')
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'reels')
const REEL_ENTRY = path.join(process.cwd(), 'remotion', 'BeforeAfterReel', 'index.tsx')

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })

function getBeforeAfterPairs(): Array<{ voor: string; na: string; basename: string }> {
  const files = fs.readdirSync(PROCESSED_DIR).filter((f) => /-voor-square\.(jpg|jpeg|png)$/i.test(f))
  return files.flatMap((voorFile) => {
    const naFile = voorFile.replace(/-voor-square\./, '-na-square.')
    if (!fs.existsSync(path.join(PROCESSED_DIR, naFile))) return []
    const basename = voorFile.replace(/-voor-square\..*/, '')
    return [{ voor: voorFile, na: naFile, basename }]
  })
}

async function renderReel(params: { voorPath: string; naPath: string; gemeente: string; type: string }, outputPath: string): Promise<void> {
  console.log(`\n🎬 Renderen: ${path.basename(outputPath)}`)

  const bundled = await bundle({
    entryPoint: REEL_ENTRY,
    webpackOverride: (config: object) => config,
  })

  const composition = await selectComposition({
    serveUrl: bundled,
    id: 'BeforeAfterReel',
    inputProps: params,
  })

  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: params,
    onProgress: ({ progress }: { progress: number }) => {
      process.stdout.write(`\r  ${Math.round(progress * 100)}%`)
    },
  })
  console.log('\n  ✅')
}

async function main() {
  console.log('🎥 Before/After Reels renderen...\n')

  if (!fs.existsSync(REEL_ENTRY)) {
    console.log('⚠️  remotion/BeforeAfterReel/index.tsx niet gevonden.')
    console.log('   Maak de compositie eerst aan of gebruik de SpotableExplainer als basis.')
    return
  }

  const pairs = getBeforeAfterPairs()
  if (pairs.length === 0) {
    console.log('⚠️  Geen voor/na paren gevonden in /public/processed/')
    console.log('   Verwacht bestanden als: gent-daklekkage-voor-square.jpg + gent-daklekkage-na-square.jpg')
    return
  }

  for (const pair of pairs) {
    const outputPath = path.join(OUTPUT_DIR, `${pair.basename}-reel.mp4`)
    if (fs.existsSync(outputPath)) {
      console.log(`⏭️  Overgeslagen: ${pair.basename}-reel.mp4`)
      continue
    }

    const [gemeente, type] = pair.basename.split('-')
    await renderReel(
      {
        voorPath: path.join(PROCESSED_DIR, pair.voor),
        naPath: path.join(PROCESSED_DIR, pair.na),
        gemeente: gemeente ?? 'Oost-Vlaanderen',
        type: type ?? 'dakwerken',
      },
      outputPath,
    )
  }

  console.log('\n✨ Alle Reels staan in /public/reels/')
}

main().catch(console.error)
