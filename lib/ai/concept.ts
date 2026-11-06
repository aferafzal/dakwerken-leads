// Conceptmail voor een klant, geschreven door een AI. Het concept wordt nooit zelf verstuurd:
// Afer leest het na, past het aan en klikt op Versturen.
//
// De AI hangt af van de sleutel in de omgeving (eerste die er is):
//   OPENAI_API_KEY → OpenAI (ChatGPT-modellen; OPENAI_MODEL, anders gpt-4.1-mini, gpt-4o-mini, gpt-4o)
//   ANTHROPIC_API_KEY → Claude (ANTHROPIC_MODEL, standaard claude-sonnet-5-5)
//   GEMINI_API_KEY → Gemini (GEMINI_MODEL, standaard gemini-2.5-flash)
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'

import { MAIL_SOORTEN, type MailSoort } from './mailsoorten'
export { MAIL_SOORTEN, isMailSoort, type MailSoort } from './mailsoorten'

export type ConceptInvoer = {
  soort: MailSoort
  instructie: string
  afzender: string                 // voornaam van wie ondertekent
  telefoon: string                 // gsm van het bedrijf
  klant: {
    voornaam: string | null
    voornaamUitEmail: string | null   // vermoedelijke voornaam uit het e-mailadres (bv. jan.peeters@ → Jan)
    gemeente: string | null
    adres: string | null
    werken: string[]
    prijs: { min: number; max: number; btwInbegrepen: boolean } | null
    oppervlakte: number | null
    start: string | null
    wilGebeldWorden: boolean
    status: string
  }
  eerdereMails: { onderwerp: string | null; inhoud: string; datum: string }[]
}

export type Concept = { onderwerp: string; tekst: string; bron: string }

const euro = (n: number) => `€${Math.round(n).toLocaleString('nl-BE')}`

const REGELS = `Je schrijft e-mails voor Dakwerken Oost-Vlaanderen, een dienst die daken in Oost-Vlaanderen opmeet met publieke gegevens
van de Vlaamse overheid, een prijsindicatie geeft en de klant in contact brengt met een gecontroleerde dakwerker uit de regio.
Een dakwerker maakt pas na een plaatsbezoek een definitieve offerte.

Schrijf zoals een Vlaamse vakman die vriendelijk en duidelijk is:
- Nederlands zoals in Vlaanderen, met "u". Geen Nederlandse uitdrukkingen ("hartelijk dank voor uw mail" mag, "fijn weekend" mag; geen "hoi", geen "groetjes").
- Kort: 60 tot 140 woorden. Korte zinnen. Geen opsommingstekens, geen vetjes, geen emoji.
- Eén duidelijke vraag of volgende stap aan het einde.
- Spreek de klant persoonlijk aan met "Beste [voornaam],". Is er geen opgegeven voornaam maar wel een voornaam uit het e-mailadres, gebruik die dan, maar alleen als het duidelijk een gewone voornaam is (Jan, Els, Mohamed, Sofie). Twijfel je (een bijnaam, een afkorting, een bedrijfsnaam), schrijf dan "Beste,". Gebruik nooit een achternaam of het e-mailadres zelf.
- Sluit af met "Met vriendelijke groeten," en op de volgende regel alleen de voornaam van de afzender. Geen handtekening, geen telefoonnummer of adres eronder: die komen er automatisch bij.

Strikte regels (nooit overtreden):
- Noem geen andere bedragen dan de prijsindicatie die je krijgt. Verzin geen prijzen, kortingen of premiebedragen.
- Beloof geen data, termijnen, garanties of resultaten, tenzij ze letterlijk in de instructie van de afzender staan.
- Zeg niet dat je zelf de werken uitvoert; de werken doet een gecontroleerde dakwerker uit ons netwerk.
- Geen claims over aantallen klanten, jaren ervaring, keurmerken of "de beste/goedkoopste".
- Een prijsindicatie is altijd "indicatief"; de definitieve prijs volgt na een plaatsbezoek.
- Volg de instructie van de afzender, behalve als ze een regel hierboven breekt.

Antwoord uitsluitend met JSON: {"onderwerp": "...", "tekst": "..."}. Het onderwerp is kort (max. 60 tekens), zonder "Re:".
In "tekst" gebruik je \\n voor nieuwe regels en een lege regel tussen alinea's.`

function opdrachtVoor(i: ConceptInvoer): string {
  const s = MAIL_SOORTEN.find((m) => m.sleutel === i.soort)!
  const k = i.klant
  const feiten = [
    k.voornaam ? `Voornaam klant (zelf opgegeven): ${k.voornaam}` : k.voornaamUitEmail ? `Voornaam klant: niet opgegeven; uit het e-mailadres afgeleid: ${k.voornaamUitEmail}` : 'Voornaam klant: onbekend',
    k.adres || k.gemeente ? `Woning: ${[k.adres, k.gemeente].filter(Boolean).join(', ')}` : null,
    k.werken.length ? `Wil laten doen: ${k.werken.join(', ')}` : null,
    k.oppervlakte ? `Dakoppervlakte volgens de meting: ongeveer ${Math.round(k.oppervlakte)} m²` : null,
    k.prijs ? `Prijsindicatie uit het rapport: ${euro(k.prijs.min)} tot ${euro(k.prijs.max)} ${k.prijs.btwInbegrepen ? 'incl.' : 'excl.'} btw (indicatief)` : 'Geen prijsindicatie bekend: noem geen bedrag.',
    k.start ? `Wil starten: ${k.start}` : null,
    k.wilGebeldWorden ? 'De klant vroeg om teruggebeld te worden.' : null,
    `Stand van de opvolging: ${k.status}`,
  ].filter(Boolean).join('\n')
  const eerder = i.eerdereMails.length
    ? i.eerdereMails.slice(0, 3).map((m) => `--- ${m.datum}: ${m.onderwerp ?? ''}\n${m.inhoud.slice(0, 1200)}`).join('\n')
    : '(nog geen mails gestuurd)'
  return `Soort mail: ${s.label}. ${s.opdracht}

Wat we weten over de aanvraag:
${feiten}

Eerdere mails van ons aan deze klant (niet herhalen):
${eerder}

Instructie van de afzender: ${i.instructie.trim() || '(geen)'}
Afzender (voornaam voor de ondertekening): ${i.afzender}
Telefoonnummer om te bellen, als je het wil noemen: ${i.telefoon}`
}

function leesJson(ruw: string): { onderwerp: string; tekst: string } {
  const json = ruw.slice(ruw.indexOf('{'), ruw.lastIndexOf('}') + 1)
  const d = JSON.parse(json) as { onderwerp?: unknown; tekst?: unknown }
  if (typeof d.onderwerp !== 'string' || typeof d.tekst !== 'string' || !d.tekst.trim()) throw new Error('Onvolledig antwoord van de AI')
  return { onderwerp: d.onderwerp.trim().slice(0, 120), tekst: d.tekst.replace(/\r\n/g, '\n').trim() }
}

export function welkeAi(): string | null {
  if (process.env.OPENAI_API_KEY) return 'OpenAI'
  if (process.env.ANTHROPIC_API_KEY) return 'Claude'
  if (process.env.GEMINI_API_KEY) return 'Gemini'
  return null
}

export async function maakConceptTekst(i: ConceptInvoer): Promise<Concept> {
  const vraag = opdrachtVoor(i)

  if (process.env.OPENAI_API_KEY) {
    // Niet elk account heeft elk model: bij "model niet gevonden" (404) het volgende proberen
    const modellen = [...new Set([process.env.OPENAI_MODEL, 'gpt-4.1-mini', 'gpt-4o-mini', 'gpt-4o'].filter(Boolean) as string[])]
    let laatste = ''
    for (const model of modellen) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: REGELS }, { role: 'user', content: vraag }] }),
        signal: AbortSignal.timeout(45_000),
      })
      if (res.ok) {
        const d = await res.json() as { choices?: { message?: { content?: string } }[] }
        return { ...leesJson(d.choices?.[0]?.message?.content ?? ''), bron: `OpenAI ${model}` }
      }
      // De foutboodschap van OpenAI (code en uitleg, nooit de sleutel) voor de logboeken
      const fout = await res.json().catch(() => null) as { error?: { code?: string; type?: string; message?: string } } | null
      laatste = `OpenAI gaf ${res.status} voor ${model}: ${fout?.error?.code ?? fout?.error?.type ?? ''} ${fout?.error?.message?.slice(0, 200) ?? ''}`
      console.warn('[ai/concept]', laatste)
      if (res.status !== 404) break
    }
    throw new Error(laatste)
  }

  if (process.env.ANTHROPIC_API_KEY) {
    const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5-5'
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const r = await client.messages.create({
      model, max_tokens: 1200, system: REGELS, messages: [{ role: 'user', content: vraag }],
    }, { timeout: 45_000 })
    const tekst = r.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
    return { ...leesJson(tekst), bron: `Claude ${model}` }
  }

  if (process.env.GEMINI_API_KEY) {
    const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const r = await ai.models.generateContent({
      model,
      contents: vraag,
      config: { systemInstruction: REGELS, responseMimeType: 'application/json', temperature: 0.6 },
    })
    return { ...leesJson(r.text ?? ''), bron: `Gemini ${model}` }
  }

  throw new Error('Geen AI-sleutel ingesteld (OPENAI_API_KEY, ANTHROPIC_API_KEY of GEMINI_API_KEY).')
}
