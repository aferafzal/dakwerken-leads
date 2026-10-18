'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { gekozenWerken, vragenVoor, type Antwoorden, type Werk } from '@/lib/prijsmodel'
import { Vragenstroom, WerkKeuze, type Maten } from '@/components/PrijsVerfijner'

/**
 * "Maak mijn prijs nauwkeuriger" in het rapport: voor wie het algemene rapport koos,
 * of zijn antwoorden wil aanpassen. Na de laatste vraag wordt het hele rapport bijgewerkt.
 * sessionId null = testrapport: niets bewaren, de antwoorden gaan via de link mee.
 */
export default function RapportVerfijner({ sessionId, maten, antwoorden: begin, verfijnd, nauwkeurigheid }: {
  sessionId: string | null
  maten: Maten
  antwoorden: Antwoorden
  verfijnd: boolean
  nauwkeurigheid: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [werken, setWerken] = useState<Werk[]>(begin.werken?.length ? begin.werken : gekozenWerken(maten, {}))
  const [antwoorden, setAntwoorden] = useState<Antwoorden>(begin)
  const [status, setStatus] = useState<'rust' | 'bewaren' | 'bijgewerkt' | 'fout'>('rust')
  const kader = useRef<HTMLDivElement>(null)
  const gelogd = useRef(new Set<string>())

  function log(stap: string) {
    if (!sessionId || gelogd.current.has(stap)) return
    gelogd.current.add(stap)
    try {
      navigator.sendBeacon?.('/api/funnel/event', new Blob([JSON.stringify({ sessionId, stap })], { type: 'application/json' }))
    } catch { /* statistiek is nooit kritiek */ }
  }

  async function bewaar(a: Antwoorden, klaar: boolean) {
    if (!sessionId) return true
    try {
      const res = await fetch(`/api/rapport/${sessionId}/antwoorden`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ antwoorden: a, verfijnd: klaar || undefined }),
      })
      return res.ok
    } catch {
      return false
    }
  }

  async function klaar() {
    const a = { ...antwoorden, werken }
    setStatus('bewaren')
    log('rapport_verfijnd')
    if (!sessionId) {
      router.push(`?antwoorden=${encodeURIComponent(JSON.stringify(a))}`, { scroll: false })
    } else if (!(await bewaar(a, true))) {
      setStatus('fout')
      return
    }
    router.refresh()
    setOpen(false)
    setStatus('bijgewerkt')
    requestAnimationFrame(() => kader.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
  }

  return (
    <div ref={kader} className="mt-6 scroll-mt-6 print:hidden">
      {status === 'bijgewerkt' && !open && (
        <p role="status" className="mb-3 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-navy">
          <Check className="h-4 w-4 flex-shrink-0 text-amber" aria-hidden />
          Uw rapport is bijgewerkt met uw antwoorden.
        </p>
      )}

      {!open ? (
        <div className="rounded-2xl border border-slate-200 p-5">
          {verfijnd ? (
            <>
              <p className="font-semibold text-navy">Deze prijs is berekend met uw antwoorden.</p>
              <button type="button" onClick={() => { setOpen(true); log('rapport_verfijnen') }}
                className="mt-2 min-h-11 text-sm font-semibold text-navy underline underline-offset-2">
                Antwoorden aanpassen
              </button>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-navy">Maak uw prijs nauwkeuriger</p>
              <p className="mt-1 text-sm text-slate-700">
                Uw prijs is nu op ±{nauwkeurigheid}% nauwkeurig. Beantwoord {vragenVoor(werken).length} korte vragen en zie meteen
                een scherpere prijs. Uw rapport wordt meteen bijgewerkt.
              </p>
              <button type="button" onClick={() => { setOpen(true); log('rapport_verfijnen') }}
                className="mt-4 min-h-12 w-full rounded-xl bg-amber px-5 font-bold text-navy transition-[filter] hover:brightness-95 sm:w-auto">
                Maak mijn prijs nauwkeuriger
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-5 rounded-2xl border border-slate-200 p-4 sm:p-6">
          <WerkKeuze gekozen={werken} beschikbaar={[
            ...(maten.hellend >= 5 ? (['dakbedekking', 'isolatie'] as Werk[]) : []),
            ...(maten.plat >= 5 ? (['plat_dak'] as Werk[]) : []),
            'goten', 'lekkage',
          ]} onChange={setWerken} />
          <Vragenstroom
            maten={maten}
            werken={werken}
            antwoorden={antwoorden}
            onAntwoord={(a) => {
              setAntwoorden(a)
              // Tussentijds bewaren: wie halverwege stopt, verliest zijn antwoorden niet
              void bewaar(a, false)
            }}
            onKlaar={() => void klaar()}
          />
          {status === 'bewaren' && <p role="status" className="text-sm text-slate-600">Uw rapport wordt bijgewerkt…</p>}
          {status === 'fout' && (
            <p role="alert" className="text-sm text-red-700">
              Uw antwoorden konden niet bewaard worden. Controleer uw internetverbinding en probeer het opnieuw.
            </p>
          )}
          <button type="button" onClick={() => setOpen(false)} className="min-h-11 text-sm text-slate-600 hover:text-navy">
            Sluiten
          </button>
        </div>
      )}
    </div>
  )
}
