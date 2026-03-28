/**
 * Sharp pipeline: resize + logo overlay + before/after compositie
 * Gebruik: npx ts-node scripts/process-photos.ts
 *
 * Input:  /public/uploads/  (originele foto's, bijv. gent-dak-voor.jpg)
 * Output: /public/processed/
 */

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads')
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'processed')

// Zorg dat mappen bestaan
;[UPLOADS_DIR, OUTPUT_DIR].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
})

const FORMATS = [
  { name: 'square', width: 1080, height: 1080 },    // Instagram post
  { name: 'story', width: 1080, height: 1920 },      // Instagram story / Reels
  { name: 'landscape', width: 1280, height: 720 },   // Facebook / YouTube
]

// Logo overlay (wit tekst op donkere balk onderaan)
async function addLogoOverlay(image: sharp.Sharp, width: number, height: number): Promise<sharp.Sharp> {
  const balk = Buffer.from(`
    <svg width="${width}" height="60">
      <rect width="${width}" height="60" fill="rgba(0,0,0,0.65)" />
      <text x="20" y="38" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="white">Dakwerken Oost-Vlaanderen</text>
      <text x="${width - 20}" y="38" font-family="Arial, sans-serif" font-size="16" fill="#f59e0b" text-anchor="end">dakwerken-oostvlaanderen.be</text>
    </svg>
  `)

  return image.composite([
    { input: balk, top: height - 60, left: 0 },
  ])
}

// Before/after side-by-side compositie
async function makeBeforeAfter(beforePath: string, afterPath: string, outputPath: string): Promise<void> {
  const W = 1080
  const H = 720
  const half = W / 2

  const [beforeBuf, afterBuf] = await Promise.all([
    sharp(beforePath).resize(half, H, { fit: 'cover' }).toBuffer(),
    sharp(afterPath).resize(half, H, { fit: 'cover' }).toBuffer(),
  ])

  const labelBefore = Buffer.from(`<svg width="120" height="36"><rect rx="8" ry="8" width="120" height="36" fill="#ef4444"/><text x="60" y="24" font-family="Arial" font-size="16" font-weight="bold" fill="white" text-anchor="middle">VOOR</text></svg>`)
  const labelAfter = Buffer.from(`<svg width="120" height="36"><rect rx="8" ry="8" width="120" height="36" fill="#22c55e"/><text x="60" y="24" font-family="Arial" font-size="16" font-weight="bold" fill="white" text-anchor="middle">NA</text></svg>`)

  await sharp({
    create: { width: W, height: H, channels: 3, background: '#000000' },
  })
    .composite([
      { input: beforeBuf, left: 0, top: 0 },
      { input: afterBuf, left: half, top: 0 },
      { input: labelBefore, left: 16, top: 16 },
      { input: labelAfter, left: half + 16, top: 16 },
    ])
    .jpeg({ quality: 90 })
    .toFile(outputPath)
}

async function processPhoto(filePath: string): Promise<void> {
  const basename = path.basename(filePath, path.extname(filePath))
  console.log(`\n📸 Verwerken: ${basename}`)

  for (const fmt of FORMATS) {
    const outputPath = path.join(OUTPUT_DIR, `${basename}-${fmt.name}.jpg`)
    const img = sharp(filePath).resize(fmt.width, fmt.height, { fit: 'cover' })
    const withLogo = await addLogoOverlay(img, fmt.width, fmt.height)
    await withLogo.jpeg({ quality: 88 }).toFile(outputPath)
    console.log(`  ✅ ${fmt.name}: ${fmt.width}×${fmt.height}`)
  }
}

async function main() {
  console.log('🖼️  Sharp photo pipeline starten...\n')

  const files = fs.readdirSync(UPLOADS_DIR).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))

  if (files.length === 0) {
    console.log('⚠️  Geen foto\'s gevonden in /public/uploads/')
    console.log('   Voeg eigen voor/na foto\'s toe en herstart.')
    return
  }

  // Verwerk individuele foto's
  for (const file of files) {
    await processPhoto(path.join(UPLOADS_DIR, file))
  }

  // Voor/na paren: bestanden die eindigen op -voor en -na
  const voorFiles = files.filter((f) => /-voor\.(jpg|jpeg|png|webp)$/i.test(f))
  for (const voorFile of voorFiles) {
    const naFile = voorFile.replace(/-voor\./, '-na.')
    if (files.includes(naFile)) {
      const outputPath = path.join(OUTPUT_DIR, `${voorFile.replace(/-voor\..*/, '')}-before-after.jpg`)
      console.log(`\n⚡ Voor/na compositie: ${voorFile} + ${naFile}`)
      await makeBeforeAfter(
        path.join(UPLOADS_DIR, voorFile),
        path.join(UPLOADS_DIR, naFile),
        outputPath,
      )
      console.log('  ✅ Compositie aangemaakt')
    }
  }

  console.log('\n✨ Klaar! Bestanden staan in /public/processed/')
}

main().catch(console.error)
