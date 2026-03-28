import { NextResponse } from 'next/server'
import { z } from 'zod'
import { GoogleGenAI } from '@google/genai'

const inputSchema = z.object({
  gemeente: z.string(),
  type: z.string(),   // 'daklekkage' | 'renovatie' | etc.
  phase: z.enum(['before', 'after'] as const),
})

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY niet geconfigureerd' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 })
  }

  const parsed = inputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validatiefout' }, { status: 422 })
  }

  const { gemeente, type, phase } = parsed.data

  const beforePrompt = `Realistic aerial photo of a Belgian residential roof in ${gemeente} with visible damage: missing tiles, moss growth, water stains, cracked flashings. Dutch house style, overcast Belgian sky. High quality photorealistic aerial view.`

  const afterPrompt = `Realistic aerial photo of a beautifully renovated Belgian residential roof in ${gemeente} after professional ${type} repair. New tiles, clean gutters, perfect condition. Dutch house style, clear sky. High quality photorealistic aerial view.`

  const prompt = phase === 'before' ? beforePrompt : afterPrompt

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp-image-generation',
      contents: prompt,
      config: {
        responseModalities: ['IMAGE'],
      },
    })

    // Haal de inline data uit het eerste candidate
    const parts = response.candidates?.[0]?.content?.parts
    const imagePart = parts?.find((p) => p.inlineData)
    if (!imagePart?.inlineData?.data) {
      return NextResponse.json({ error: 'Geen afbeelding gegenereerd' }, { status: 500 })
    }

    return NextResponse.json({
      data: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType ?? 'image/png',
    })
  } catch (err) {
    console.error('[generate-roof-image]', err)
    return NextResponse.json({ error: 'Generatie mislukt' }, { status: 500 })
  }
}
