/**
 * Claude API: genereer Instagram captions + alt-teksten voor dakwerkfoto's
 * Gebruik: npx ts-node scripts/generate-captions.ts
 *
 * Vereiste env var: ANTHROPIC_API_KEY
 * Input:  /public/processed/ (naam bevat gemeente + type, bijv. gent-daklekkage-voor-square.jpg)
 * Output: /public/processed/captions.json
 */

import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'

const API_KEY = process.env.ANTHROPIC_API_KEY
if (!API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY niet ingesteld')
  process.exit(1)
}

const PROCESSED_DIR = path.join(process.cwd(), 'public', 'processed')
const OUTPUT_FILE = path.join(PROCESSED_DIR, 'captions.json')

type Caption = {
  filename: string
  instagram: string
  facebook: string
  alt: string
  hashtags: string
}

function extractMeta(filename: string): { gemeente: string; type: string; phase: string } {
  const parts = filename.replace(/\.(jpg|jpeg|png)$/i, '').split('-')
  return {
    gemeente: parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Oost-Vlaanderen',
    type: parts[1] ?? 'dakwerken',
    phase: parts[2] ?? '',
  }
}

async function generateCaption(client: Anthropic, filename: string): Promise<Caption> {
  const { gemeente, type, phase } = extractMeta(filename)
  const phaseLabel = phase === 'voor' || phase === 'before' ? 'voor de renovatie' : phase === 'na' || phase === 'after' ? 'na de renovatie' : ''

  const prompt = `Je bent een social media expert voor een dakwerken bedrijf in Oost-Vlaanderen.
Genereer content voor een foto van ${type} ${phaseLabel} in ${gemeente}.

Geef terug als JSON met deze velden:
- instagram: korte, pakkende Instagram caption (max 150 tekens, met 1-2 emoji's)
- facebook: uitgebreidere Facebook post (2-3 zinnen)
- alt: beschrijvende alt-tekst voor SEO (max 100 tekens)
- hashtags: 5-8 relevante Nederlandstalige hashtags als string

Antwoord ALLEEN met geldige JSON.`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const parsed = JSON.parse(text)
  return { filename, ...parsed }
}

async function main() {
  console.log('✍️  Claude API captions genereren...\n')

  const client = new Anthropic({ apiKey: API_KEY })
  const files = fs.readdirSync(PROCESSED_DIR).filter((f) => /\.(jpg|jpeg|png)$/i.test(f))

  if (files.length === 0) {
    console.log('⚠️  Geen foto\'s gevonden in /public/processed/. Voer eerst process-photos.ts uit.')
    return
  }

  // Laad bestaande captions
  const existing: Record<string, Caption> = fs.existsSync(OUTPUT_FILE)
    ? JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'))
    : {}

  for (const file of files) {
    if (existing[file]) {
      console.log(`⏭️  Overgeslagen: ${file}`)
      continue
    }
    process.stdout.write(`⏳ ${file} ... `)
    try {
      const caption = await generateCaption(client, file)
      existing[file] = caption
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existing, null, 2))
      console.log('✅')
    } catch (err) {
      console.log('❌', err instanceof Error ? err.message : err)
    }
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log(`\n✨ Captions opgeslagen in /public/processed/captions.json`)
}

main().catch(console.error)
