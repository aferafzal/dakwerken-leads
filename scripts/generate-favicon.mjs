#!/usr/bin/env node
/**
 * Genereer favicon + apple-icon via Gemini API.
 *
 * Usage:  node scripts/generate-favicon.mjs
 *
 * Vereist GEMINI_API_KEY in .env.local of in shell env.
 * Schrijft:
 *   - app/icon.png          (32×32 — browser tab)
 *   - app/apple-icon.png    (180×180 — iOS home screen)
 *   - public/favicon-source.png (1024×1024 — origineel, voor latere refs)
 */
import { GoogleGenAI } from '@google/genai'
import sharp from 'sharp'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// Laad GEMINI_API_KEY uit .env.local als hij niet in process.env staat
if (!process.env.GEMINI_API_KEY) {
  const envPath = resolve(root, '.env.local')
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8')
    const match = content.match(/^GEMINI_API_KEY=(.+)$/m)
    if (match) process.env.GEMINI_API_KEY = match[1].trim()
  }
}

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.error('❌ GEMINI_API_KEY niet gevonden in .env.local of shell')
  process.exit(1)
}

const PROMPT = `Minimalist flat vector app icon design.

Subject: A bold stylized house with a prominent triangular pitched roof, viewed from the front.
Style: 2D flat vector illustration. Solid colors only — no shadows, no gradients, no textures.
Composition: Single house silhouette centered on a square canvas with comfortable padding around it.
Colors:
 - The house roof: warm dark red-orange (terracotta tile color, like #c0392b)
 - The house walls: cream white (#f8f5ed)
 - The background: deep professional green (#15803d)
Details: Maybe one small dark window on the wall. Maybe a single small chimney on the roof.
Strict requirements: No text whatsoever. No people. No trees. No sky. No clouds. No extra decorations.
The design must be ultra-clean, strong silhouette, instantly recognizable at very small sizes (16×16 pixels).
Square 1:1 aspect ratio. Like a premium iOS app icon.`

async function generate() {
  console.log('🎨 Gemini API aanroepen…')
  const ai = new GoogleGenAI({ apiKey })

  let imageData = null

  // Probeer eerst Imagen 4 Ultra (hoogste kwaliteit voor design)
  try {
    const imgResp = await ai.models.generateImages({
      model: 'imagen-4.0-ultra-generate-001',
      prompt: PROMPT,
      config: { numberOfImages: 1, aspectRatio: '1:1' },
    })
    const bytes = imgResp.generatedImages?.[0]?.image?.imageBytes
    if (bytes) {
      imageData = bytes
      console.log('   ✓ Imagen 4 Ultra geslaagd')
    }
  } catch (err) {
    console.log(`   Imagen 4 Ultra niet beschikbaar (${err.message?.slice(0, 80)}…)`)
  }

  if (!imageData) {
    try {
      const imgResp = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: PROMPT,
        config: { numberOfImages: 1, aspectRatio: '1:1' },
      })
      const bytes = imgResp.generatedImages?.[0]?.image?.imageBytes
      if (bytes) {
        imageData = bytes
        console.log('   ✓ Imagen 4 standard geslaagd')
      }
    } catch (err) {
      console.log(`   Imagen 4 standard niet beschikbaar (${err.message?.slice(0, 80)}…)`)
    }
  }

  if (!imageData) {
    const resp = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: PROMPT,
      config: { responseModalities: ['IMAGE'] },
    })
    const part = resp.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)
    imageData = part?.inlineData?.data
    if (imageData) console.log('   ✓ Gemini 3.1 Flash Image geslaagd')
  }

  if (!imageData) {
    console.error('❌ Geen afbeelding ontvangen van Gemini')
    process.exit(1)
  }

  const buf = Buffer.from(imageData, 'base64')

  // Sla origineel op
  const sourcePath = resolve(root, 'public/favicon-source.png')
  writeFileSync(sourcePath, buf)
  console.log(`💾 Origineel: ${sourcePath} (${(buf.length / 1024).toFixed(1)} KB)`)

  // Downscale met scherpe filter
  const iconPath = resolve(root, 'app/icon.png')
  await sharp(buf).resize(32, 32, { kernel: 'lanczos3', fit: 'cover' }).png().toFile(iconPath)
  console.log(`🟢 ${iconPath} (32×32)`)

  const applePath = resolve(root, 'app/apple-icon.png')
  await sharp(buf).resize(180, 180, { kernel: 'lanczos3', fit: 'cover' }).png().toFile(applePath)
  console.log(`🟢 ${applePath} (180×180)`)

  console.log('\n✅ Klaar! Verwijder nu de .tsx versies:')
  console.log('   rm app/icon.tsx app/apple-icon.tsx')
}

generate().catch((err) => {
  console.error('❌ Fout:', err)
  process.exit(1)
})
