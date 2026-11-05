'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, Check } from 'lucide-react'
import { VOLGENDE_ACTIES, wanneer } from '@/lib/dashboard/weergave'
import { zetVolgendeActie } from '../../acties'

// Datum en uur voor <input type="datetime-local">, in de tijd van de browser
function lokaal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
function snelMoment(soort: 'straks' | 'morgen' | 'week'): string {
  const d = new Date()
  if (soort === 'straks') d.setHours(d.getHours() + 2, 0, 0, 0)
  if (soort === 'morgen') { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0) }
  if (soort === 'week') { d.setDate(d.getDate() + 7); d.setHours(9, 0, 0, 0) }
  return lokaal(d)
}

/** Wat er als volgende moet gebeuren, met datum en uur. Verschijnt in "Vandaag" op het overzicht. */
export default function VolgendeActie({ id, actie, op, actief }: { id: string; actie: string | null; op: string | null; actief: boolean }) {
  const router = useRouter()
  const [bewerken, setBewerken] = useState(!actie)
  const [soort, setSoort] = useState(actie ?? VOLGENDE_ACTIES[0])
  const [moment, setMoment] = useState(op ? lokaal(new Date(op)) : snelMoment('morgen'))
  const [fout, setFout] = useState<string | null>(null)
  const [bezig, start] = useTransition()

  const bewaar = (wis = false) => start(async () => {
    setFout(null)
    const r = await zetVolgendeActie(id, wis ? null : soort, wis ? null : new Date(moment).toISOString())
    if (r.ok) { setBewerken(wis); router.refresh() } else setFout(r.fout)
  })

  if (!actief) return <p className="text-sm text-gray-600">Voer migratie 021 uit om een volgende actie te plannen.</p>

  if (actie && op && !bewerken) {
    const laat = new Date(op).getTime() < Date.now()
    return (
      <div className="space-y-3">
        <p className={`flex items-start gap-2 text-sm ${laat ? 'text-red-800' : 'text-gray-900'}`}>
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span><strong className="font-semibold">{actie}</strong> · {wanneer(op)}{laat ? ' (te laat)' : ''}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={bezig} onClick={() => bewaar(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-navy px-3 text-sm font-semibold text-white hover:brightness-125 disabled:opacity-60">
            <Check className="h-4 w-4" aria-hidden />Gedaan
          </button>
          <button type="button" onClick={() => setBewerken(true)} className="h-9 rounded-lg px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100">
            Verplaatsen
          </button>
        </div>
        {fout && <p role="alert" className="text-sm text-red-700">{fout}</p>}
      </div>
    )
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); bewaar() }} className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm">
          <span className="sr-only">Actie</span>
          <select id="volgende-actie" value={soort} onChange={(e) => setSoort(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900">
            {VOLGENDE_ACTIES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="sr-only">Wanneer</span>
          <input id="volgende-moment" type="datetime-local" value={moment} onChange={(e) => setMoment(e.target.value)} required
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {([['straks', 'Over 2 uur'], ['morgen', 'Morgen 9u'], ['week', 'Over een week']] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setMoment(snelMoment(k))}
            className="rounded-full border border-gray-300 px-2.5 py-1 font-medium text-gray-700 hover:border-gray-500">{l}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={bezig} className="h-9 rounded-lg bg-navy px-3 text-sm font-semibold text-white hover:brightness-125 disabled:opacity-60">
          {bezig ? 'Bewaren…' : 'Plannen'}
        </button>
        {actie && <button type="button" onClick={() => setBewerken(false)} className="h-9 rounded-lg px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100">Annuleren</button>}
      </div>
      {fout && <p role="alert" className="text-sm text-red-700">{fout}</p>}
    </form>
  )
}
