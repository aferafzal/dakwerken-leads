'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, CalendarClock, ChevronRight, Mail, MessageCircle, Phone, Trash2 } from 'lucide-react'
import { OPVOLGING } from '@/lib/opvolging'
import {
  euro, interesse, opvolgingVan, oppervlakteVan, prijsVan, telVan, wachtLabel, wachttijd, wanneer, werkenVan, wieVan, type Lead,
} from '@/lib/dashboard/weergave'
import { archiveer, zetStatus } from './acties'
import WisDialoog from './WisDialoog'

export const STATUS_KLEUR: Record<string, string> = {
  nieuw: 'bg-amber/15 text-orange-900',
  gecontacteerd: 'bg-sky-100 text-sky-900',
  doorgestuurd: 'bg-indigo-100 text-indigo-900',
  offerte: 'bg-violet-100 text-violet-900',
  gewonnen: 'bg-emerald-100 text-emerald-900',
  verloren: 'bg-gray-200 text-gray-700',
}
const statusLabel = (w: string) => OPVOLGING.find((o) => o.waarde === w)?.label ?? w

export default function AanvraagLijst({ leads, archief, actief, controlekamer }: {
  leads: Lead[]
  archief: boolean
  actief: boolean
  controlekamer: boolean
}) {
  const router = useRouter()
  const [gekozen, setGekozen] = useState<Set<string>>(new Set())
  const [fout, setFout] = useState<string | null>(null)
  const [wisOpen, setWisOpen] = useState(false)
  const [bezig, start] = useTransition()

  const ids = leads.map((l) => l.id).filter((id) => gekozen.has(id))
  const alles = ids.length === leads.length && leads.length > 0
  const wissel = (id: string) => setGekozen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const doe = (actie: () => Promise<{ ok: boolean; fout?: string }>) => start(async () => {
    setFout(null)
    const r = await actie()
    if (r.ok) { setGekozen(new Set()); router.refresh() } else setFout(r.fout ?? 'Er ging iets mis.')
  })

  return (
    <div className="space-y-2">
      {/* Balk voor wat aangevinkt is */}
      <div className={`sticky top-[env(safe-area-inset-top,0px)] z-20 flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
        ids.length ? 'bg-navy text-white shadow-lg' : 'bg-transparent text-gray-600'}`}>
        <label className="flex items-center gap-2 font-medium">
          <input type="checkbox" checked={alles} onChange={() => setGekozen(alles ? new Set() : new Set(leads.map((l) => l.id)))}
            className="h-4 w-4 accent-[var(--color-amber)]" aria-label="Alles aanvinken" />
          {ids.length ? `${ids.length} gekozen` : `${leads.length} aanvra${leads.length === 1 ? 'ag' : 'gen'}`}
        </label>
        {ids.length > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {actief && !archief && (
              <label>
                <span className="sr-only">Status zetten</span>
                <select defaultValue="" disabled={bezig}
                  onChange={(e) => { const v = e.target.value; e.target.value = ''; if (v) doe(() => zetStatus(ids, v)) }}
                  className="h-9 rounded-lg border-0 bg-white/15 px-2 text-sm font-semibold text-white [&>option]:text-gray-900">
                  <option value="">Status zetten…</option>
                  {OPVOLGING.map((o) => <option key={o.waarde} value={o.waarde}>{o.label}</option>)}
                </select>
              </label>
            )}
            {controlekamer && (
              <button type="button" disabled={bezig} onClick={() => doe(() => archiveer(ids, archief))}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-white/15 px-3 font-semibold hover:bg-white/25">
                {archief ? <ArchiveRestore className="h-4 w-4" aria-hidden /> : <Archive className="h-4 w-4" aria-hidden />}
                {archief ? 'Terugzetten' : 'Archiveren'}
              </button>
            )}
            <button type="button" disabled={bezig} onClick={() => setWisOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-red-700 px-3 font-semibold hover:bg-red-800">
              <Trash2 className="h-4 w-4" aria-hidden />Wissen
            </button>
          </div>
        )}
      </div>
      {fout && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{fout}</p>}

      <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {leads.map((l) => {
          const wie = interesse(l)
          const prijs = prijsVan(l)
          const werken = werkenVan(l)
          const wacht = wachttijd(l)
          const status = opvolgingVan(l)
          const m2 = oppervlakteVan(l)
          const t = l.telefoon ? telVan(l.telefoon) : null
          const geplandLaat = l.volgende_actie_op && new Date(l.volgende_actie_op).getTime() < Date.now()
          return (
            <li key={l.id} className={`flex gap-3 p-3 sm:p-4 ${gekozen.has(l.id) ? 'bg-amber/5' : ''}`}>
              <input type="checkbox" checked={gekozen.has(l.id)} onChange={() => wissel(l.id)}
                aria-label={`${wieVan(l)} aanvinken`} className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-navy)]" />

              <Link href={`/dashboard/aanvraag/${l.id}`} className="group grid min-w-0 flex-1 gap-x-6 gap-y-1 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_KLEUR[status]}`}>{statusLabel(status)}</span>
                    {wie.sterk && <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 font-semibold text-orange-900"><Phone className="h-3 w-3" aria-hidden />Wil gebeld worden</span>}
                    {wacht != null && (
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${wacht >= 2 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>{wachtLabel(wacht)}</span>
                    )}
                    <time dateTime={l.created_at} className="text-gray-600">{wanneer(l.created_at)}</time>
                  </div>
                  <p className="mt-1 truncate font-semibold text-gray-900 group-hover:underline">{wieVan(l)}</p>
                  <p className="truncate text-sm text-gray-600">{[l.adres, l.gemeente].filter(Boolean).join(', ') || 'Geen adres'}</p>
                </div>

                <div className="min-w-0 text-sm">
                  {werken.length > 0 && <p className="truncate text-gray-900">{werken.join(' · ')}</p>}
                  <p className="text-gray-600">
                    {prijs && <span className="font-semibold tabular-nums text-gray-900">{euro(prijs.min)} – {euro(prijs.max)}</span>}
                    {m2 ? <span>{prijs ? ' · ' : ''}±{Math.round(m2)} m²</span> : null}
                  </p>
                  {l.volgende_actie && l.volgende_actie_op && (
                    <p className={`mt-0.5 inline-flex items-center gap-1 text-xs font-semibold ${geplandLaat ? 'text-red-700' : 'text-gray-700'}`}>
                      <CalendarClock className="h-3.5 w-3.5" aria-hidden />{l.volgende_actie} · {wanneer(l.volgende_actie_op)}
                    </p>
                  )}
                </div>

                <ChevronRight className="hidden h-5 w-5 self-center text-gray-400 group-hover:text-gray-900 sm:block" aria-hidden />
              </Link>

              {/* Snelknoppen: bellen, WhatsApp, mail */}
              <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center">
                {t && (
                  <a href={`tel:${t.tel}`} aria-label={`Bel ${wieVan(l)}`} title="Bellen"
                    className="grid h-9 w-9 place-items-center rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900">
                    <Phone className="h-4 w-4" aria-hidden />
                  </a>
                )}
                {t && (
                  <a href={`https://wa.me/${t.whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp naar ${wieVan(l)}`} title="WhatsApp"
                    className="grid h-9 w-9 place-items-center rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900">
                    <MessageCircle className="h-4 w-4" aria-hidden />
                  </a>
                )}
                {l.email && (
                  <Link href={`/dashboard/aanvraag/${l.id}#mail`} aria-label={`Mail naar ${wieVan(l)}`} title="Mail schrijven"
                    className="grid h-9 w-9 place-items-center rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900">
                    <Mail className="h-4 w-4" aria-hidden />
                  </Link>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <WisDialoog ids={ids} open={wisOpen} onSluit={() => setWisOpen(false)}
        onGewist={() => { setWisOpen(false); setGekozen(new Set()); router.refresh() }} />
    </div>
  )
}
