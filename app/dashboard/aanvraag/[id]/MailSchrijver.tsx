'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Send, Sparkles } from 'lucide-react'
import { MAIL_SOORTEN, type MailSoort } from '@/lib/ai/mailsoorten'
import { maakConcept, verstuurMail } from '../../acties'

/**
 * Mail schrijven: kies een soort, laat de AI een concept maken, pas het aan en verstuur.
 * Versturen vraagt altijd eerst een bevestiging; de AI verstuurt nooit zelf.
 */
export default function MailSchrijver({ id, aan, standaard, ai, voorbeeld }: {
  id: string
  aan: string
  standaard: MailSoort
  ai: string | null
  voorbeeld: boolean
}) {
  const router = useRouter()
  const [soort, setSoort] = useState<MailSoort>(standaard)
  const [instructie, setInstructie] = useState('')
  const [onderwerp, setOnderwerp] = useState('')
  const [tekst, setTekst] = useState('')
  const [metAi, setMetAi] = useState(false)
  const [bron, setBron] = useState<string | null>(null)
  const [bevestigen, setBevestigen] = useState(false)
  const [melding, setMelding] = useState<{ soort: 'fout' | 'ok'; tekst: string } | null>(null)
  const [denkt, startDenken] = useTransition()
  const [verstuurt, startVersturen] = useTransition()

  const concept = () => startDenken(async () => {
    setMelding(null); setBevestigen(false)
    const r = await maakConcept(id, soort, instructie)
    if (r.ok) { setOnderwerp(r.onderwerp); setTekst(r.tekst); setMetAi(true); setBron(r.bron) }
    else setMelding({ soort: 'fout', tekst: r.fout })
  })

  const verstuur = () => startVersturen(async () => {
    setMelding(null)
    const r = await verstuurMail(id, onderwerp, tekst, soort, metAi)
    setBevestigen(false)
    if (r.ok) {
      setOnderwerp(''); setTekst(''); setInstructie(''); setMetAi(false); setBron(null)
      setMelding({ soort: 'ok', tekst: voorbeeld ? 'Verstuurd naar het testadres van Resend (voorbeeldmodus).' : `Verstuurd naar ${aan}. Een kopie staat in info@.` })
      router.refresh()
    } else setMelding({ soort: 'fout', tekst: r.fout })
  })

  const klaar = onderwerp.trim().length > 0 && tekst.trim().length >= 10
  const veld = 'block w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 hover:border-gray-400'

  return (
    <div className="space-y-4">
      {/* 1. Soort en instructie voor de AI */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Soort mail">
          {MAIL_SOORTEN.map((m) => (
            <button key={m.sleutel} type="button" role="radio" aria-checked={soort === m.sleutel} onClick={() => setSoort(m.sleutel)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                soort === m.sleutel ? 'border-navy bg-navy text-white' : 'border-gray-300 text-gray-700 hover:border-gray-500'}`}>
              {m.label}
            </button>
          ))}
        </div>
        <label className="block text-sm">
          <span className="font-medium text-gray-900">Wat moet erin? <span className="font-normal text-gray-600">(optioneel)</span></span>
          <textarea id="mail-instructie" rows={2} value={instructie} onChange={(e) => setInstructie(e.target.value)} maxLength={1000}
            placeholder="bv. ik kan dinsdag of donderdag in de voormiddag langskomen"
            className={`${veld} mt-1 py-2`} />
        </label>
        <button type="button" onClick={concept} disabled={denkt || !ai}
          className="flex h-10 items-center gap-2 rounded-lg bg-amber px-4 text-sm font-bold text-navy hover:bg-amber-hover hover:text-white disabled:opacity-60">
          <Sparkles className="h-4 w-4" aria-hidden />
          {denkt ? 'AI schrijft…' : tekst ? 'Nieuw AI-concept' : 'AI-concept schrijven'}
        </button>
        {!ai && <p className="text-xs text-gray-600">Geen AI-sleutel ingesteld: schrijf de mail zelf.</p>}
      </div>

      {/* 2. De mail zelf: altijd bewerkbaar */}
      <div className="space-y-2">
        <label className="block text-sm">
          <span className="font-medium text-gray-900">Onderwerp</span>
          <input id="mail-onderwerp" value={onderwerp} onChange={(e) => setOnderwerp(e.target.value)} maxLength={160}
            className={`${veld} mt-1 h-10`} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-900">Mail</span>
          <textarea id="mail-tekst" rows={11} value={tekst} onChange={(e) => { setTekst(e.target.value) }} maxLength={8000}
            placeholder={`Beste,\n\n…\n\nMet vriendelijke groeten,`}
            className={`${veld} mt-1 py-2 leading-relaxed`} />
        </label>
        <p className="text-xs text-gray-600">
          Je handtekening met gsm-nummer en de bedrijfsgegevens komen er automatisch onder.
          {bron && <> · Concept van {bron}: lees het na voor je verstuurt.</>}
        </p>
      </div>

      {/* 3. Versturen, met bevestiging */}
      {!bevestigen ? (
        <button type="button" onClick={() => setBevestigen(true)} disabled={!klaar || verstuurt}
          className="flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-semibold text-white hover:brightness-125 disabled:opacity-40">
          <Send className="h-4 w-4" aria-hidden />Versturen…
        </button>
      ) : (
        <div role="group" aria-label="Bevestig versturen" className="space-y-2 rounded-lg border border-navy/30 bg-navy/5 p-3">
          <p className="text-sm text-gray-900">
            Versturen naar <strong className="font-semibold [overflow-wrap:anywhere]">{voorbeeld ? 'delivered@resend.dev (voorbeeldmodus)' : aan}</strong>, vanaf info@dakwerken-oostvlaanderen.be?
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={verstuur} disabled={verstuurt}
              className="flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-semibold text-white hover:brightness-125 disabled:opacity-60">
              <Send className="h-4 w-4" aria-hidden />{verstuurt ? 'Versturen…' : 'Ja, versturen'}
            </button>
            <button type="button" onClick={() => setBevestigen(false)} className="h-10 rounded-lg px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100">
              Annuleren
            </button>
          </div>
        </div>
      )}

      {melding && (
        <p role={melding.soort === 'fout' ? 'alert' : 'status'}
          className={`flex items-center gap-1.5 text-sm ${melding.soort === 'fout' ? 'text-red-700' : 'font-medium text-emerald-800'}`}>
          {melding.soort === 'ok' && <Check className="h-4 w-4" aria-hidden />}{melding.tekst}
        </p>
      )}
    </div>
  )
}
