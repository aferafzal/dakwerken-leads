'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { wisDefinitief } from './acties'

/** Definitief wissen: enkel na het intypen van WISSEN. Wist ook de tijdlijn en de mails. */
export default function WisDialoog({ ids, open, onSluit, onGewist }: {
  ids: string[]
  open: boolean
  onSluit: () => void
  onGewist: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [tekst, setTekst] = useState('')
  const [fout, setFout] = useState<string | null>(null)
  const [bezig, start] = useTransition()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) { setTekst(''); setFout(null); d.showModal() }
    if (!open && d.open) d.close()
  }, [open])

  const wis = () => start(async () => {
    const r = await wisDefinitief(ids, tekst)
    if (r.ok) onGewist()
    else setFout(r.fout)
  })

  const n = ids.length
  return (
    <dialog ref={ref} onClose={onSluit} aria-labelledby="wis-titel"
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl p-0 backdrop:bg-black/40">
      <form method="dialog" onSubmit={(e) => { e.preventDefault(); wis() }} className="space-y-4 p-6">
        <h2 id="wis-titel" className="text-lg font-bold text-gray-900">
          {n === 1 ? 'Deze aanvraag' : `${n} aanvragen`} definitief wissen?
        </h2>
        <p className="text-sm leading-relaxed text-gray-700">
          De aanvraag, het rapport, de tijdlijn en de verstuurde mails worden gewist. Dat kan niet ongedaan gemaakt worden.
          Wil je ze alleen uit de lijst halen, archiveer ze dan.
        </p>
        <label className="block text-sm font-semibold text-gray-900">
          Typ <span className="font-mono">WISSEN</span> om te bevestigen
          <input
            id="wis-bevestiging"
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            autoComplete="off"
            className="mt-1.5 block h-10 w-full rounded-lg border border-gray-300 px-3 font-mono text-sm uppercase"
          />
        </label>
        {fout && <p role="alert" className="text-sm text-red-700">{fout}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onSluit} className="h-10 rounded-lg px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100">
            Annuleren
          </button>
          <button type="submit" disabled={bezig || tekst.trim().toUpperCase() !== 'WISSEN'}
            className="h-10 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-40">
            {bezig ? 'Wissen…' : 'Definitief wissen'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
