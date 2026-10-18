'use client'

import { useActionState, useState } from 'react'
import { Check } from 'lucide-react'
import { OPVOLGING, type Opvolging } from '@/lib/opvolging'
import { bewaarOpvolging, type OpvolgResultaat } from './acties'

/**
 * Opvolgstatus (bewaart meteen bij het kiezen) en een notitie per aanvraag.
 * actief = false zolang migratie 009 niet uitgevoerd is: dan alleen tonen, niets bewaren.
 */
export default function LeadOpvolging({ id, opvolging, notitie, actief }: {
  id: string
  opvolging: Opvolging
  notitie: string | null
  actief: boolean
}) {
  const [resultaat, actie, bezig] = useActionState<OpvolgResultaat | null, FormData>(bewaarOpvolging, null)
  const [tekst, setTekst] = useState(notitie ?? '')
  const gewijzigd = tekst.trim() !== (notitie ?? '')

  return (
    <form action={actie} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <label className="block">
        <span className="sr-only">Opvolging</span>
        <select
          name="opvolging"
          defaultValue={opvolging}
          disabled={!actief || bezig}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 transition-colors hover:border-gray-400 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
        >
          {OPVOLGING.map((o) => <option key={o.waarde} value={o.waarde}>{o.label}</option>)}
        </select>
      </label>

      <label className="block">
        <span className="sr-only">Notitie</span>
        <textarea
          name="notitie"
          rows={2}
          maxLength={2000}
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          disabled={!actief}
          placeholder="Notitie, bv. teruggebeld op dinsdag"
          className="block w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 hover:border-gray-400 disabled:cursor-not-allowed disabled:bg-gray-50"
        />
      </label>

      <div className="flex items-center justify-between gap-3">
        <p aria-live="polite" className="text-xs">
          {bezig ? <span className="text-gray-600">Bewaren…</span>
            : resultaat?.ok === false ? <span className="text-red-700">{resultaat.fout}</span>
            : resultaat?.ok && !gewijzigd ? <span className="inline-flex items-center gap-1 text-gray-600"><Check className="h-3.5 w-3.5" aria-hidden />Bewaard</span>
            : null}
        </p>
        {actief && gewijzigd && (
          <button type="submit" disabled={bezig}
            className="h-9 rounded-lg bg-navy px-3 text-sm font-semibold text-white transition-[filter] hover:brightness-125 disabled:opacity-60">
            Notitie bewaren
          </button>
        )}
      </div>
    </form>
  )
}
