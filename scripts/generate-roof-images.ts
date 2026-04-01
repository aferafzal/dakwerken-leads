/**
 * Batch script: genereer AI before/after dakbeelden via Gemini
 * Gebruik: npx ts-node scripts/generate-roof-images.ts
 *
 * Vereiste env var: GEMINI_API_KEY
 * Output: /public/generated/roof-{gemeente}-{type}-{phase}.png
 */

import * as fs from 'fs'
import * as path from 'path'
import { GoogleGenAI } from '@google/genai'

const API_KEY = process.env.GEMINI_API_KEY
if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY niet ingesteld in .env.local')
  process.exit(1)
}

const outputDir = path.join(process.cwd(), 'public', 'generated')
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

const beelden = [
  { gemeente: 'Gent', type: 'daklekkage' },
  { gemeente: 'Aalst', type: 'renovatie' },
  { gemeente: 'Sint-Niklaas', type: 'isolatie' },
  { gemeente: 'Dendermonde', type: 'nieuw_dak' },
]

async function generateImage(gemeente: string, type: string, phase: 'before' | 'after'): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: API_KEY! })

  const beforePrompt = `Realistic aerial photo of a damaged Belgian residential roof in ${gemeente} needing ${type} repair: missing tiles, moss, water damage. Dutch house style, overcast sky. Photorealistic.`
  const afterPrompt = `Realistic aerial photo of a perfectly renovated Belgian residential roof in ${gemeente} after ${type}. New tiles, pristine condition. Dutch house style, bright sky. Photorealistic.`

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: phase === 'before' ? beforePrompt : afterPrompt,
    config: {
      responseModalities: ['IMAGE'],
    },
  })

  const parts = response.candidates?.[0]?.content?.parts
  const imagePart = parts?.find((p: { inlineData?: { data?: string; mimeType?: string } }) => p.inlineData)
  if (!imagePart?.inlineData?.data) throw new Error('Geen afbeelding ontvangen')
  return imagePart.inlineData.data
}

async function main() {
  console.log('🛰️ Gemini AI dakbeelden genereren...\n')

  for (const { gemeente, type } of beelden) {
    for (const phase of ['before', 'after'] as const) {
      const filename = `roof-${gemeente.toLowerCase().replace(/\s/g, '-')}-${type}-${phase}.png`
      const outputPath = path.join(outputDir, filename)

      if (fs.existsSync(outputPath)) {
        console.log(`⏭️  Overgeslagen (bestaat al): ${filename}`)
        continue
      }

      process.stdout.write(`⏳ Genereren: ${filename} ... `)
      try {
        const base64 = await generateImage(gemeente, type, phase)
        fs.writeFileSync(outputPath, Buffer.from(base64, 'base64'))
        console.log('✅')
      } catch (err) {
        console.log('❌', err instanceof Error ? err.message : err)
      }

      // Wacht 2s tussen requests (rate limit)
      await new Promise((r) => setTimeout(r, 2000))
    }
  }

  console.log('\n✨ Klaar! Bestanden staan in /public/generated/')
}

main().catch(console.error)
