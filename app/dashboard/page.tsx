import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { CalendarClock, Clock } from 'lucide-react'
import { isBeheerder } from '@/lib/beheer-auth'
import { leesAanvragen } from '@/lib/dashboard/gegevens'
import { filter, filterUrl, kerncijfers, keuzes, leesFilters, TABS, vandaagTeDoen, inTab } from '@/lib/dashboard/filter'
import { wachtLabel, wachttijd, wanneer, wieVan, werkenVan } from '@/lib/dashboard/weergave'
import Werkbalk from './Werkbalk'
import AanvraagLijst from './AanvraagLijst'

export const metadata: Metadata = {
  title: 'Aanvragen · Dashboard',
  robots: { index: false },
}

const LEGE_TEKST: Record<string, string> = {
  te_doen: 'Niets te doen: elke aanvraag is opgevolgd.',
  lopend: 'Geen lopende aanvragen.',
  afgerond: 'Nog niets afgerond.',
  alle: 'Nog geen aanvragen. Zodra iemand een rapport aanvraagt, verschijnt die hier.',
  archief: 'Het archief is leeg.',
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Tweede controle naast proxy.ts: zonder geldige login geen persoonsgegevens
  if (!isBeheerder((await headers()).get('authorization'))) notFound()

  const f = leesFilters(await searchParams)
  const { leads, fout, opvolgingKlaar, controlekamerKlaar } = await leesAanvragen()
  const zichtbaar = filter(leads, f)
  const cijfers = kerncijfers(leads)
  const { gepland, wachtend } = vandaagTeDoen(leads)
  const opties = keuzes(leads)
  const standaard = !f.q && !f.snel && !f.werk && !f.bron && !f.tel && f.toon === 'te_doen'

  const CIJFERS = [
    { snel: '', label: 'Te doen', waarde: cijfers.teDoen, url: filterUrl('/dashboard', f, { snel: '', toon: 'te_doen' }), actief: !f.snel && f.toon === 'te_doen' },
    { snel: 'wacht', label: 'Wacht > 2 werkuren', waarde: cijfers.wacht, alarm: cijfers.wacht > 0 },
    { snel: 'vandaag', label: 'Vandaag binnen', waarde: cijfers.vandaag },
    { snel: 'week', label: 'Laatste 7 dagen', waarde: cijfers.week },
    { snel: 'gecontacteerd', label: 'Lopend', waarde: cijfers.gecontacteerd },
    { snel: 'gewonnen', label: 'Gewonnen deze maand', waarde: cijfers.gewonnen },
  ].map((c) => ({ ...c, url: c.url ?? filterUrl('/dashboard', f, { snel: f.snel === c.snel ? '' : c.snel }), actief: c.actief ?? f.snel === c.snel }))

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pt-6 pb-16 sm:px-6">
      <h1 className="sr-only">Aanvragen</h1>

      {fout && (
        <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
          <strong>De aanvragen konden niet geladen worden:</strong> {fout}
        </div>
      )}
      {!fout && !controlekamerKlaar && (
        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
          Archief, volgende actie en tijdlijn werken nog niet. Voer <code className="font-mono text-[13px]">migrations/021_controlekamer.sql</code> uit
          in de Supabase SQL-editor en herlaad deze pagina.
          {!opvolgingKlaar && <> Voer eerst <code className="font-mono text-[13px]">migrations/009_opvolging.sql</code> uit.</>}
        </div>
      )}

      {/* ── Kerncijfers: een klik filtert de lijst ── */}
      <section aria-label="Kerncijfers" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {CIJFERS.map((c) => (
          <Link
            key={c.label}
            href={c.url}
            aria-current={c.actief ? 'true' : undefined}
            className={`rounded-xl border px-4 py-3 transition-colors ${
              c.actief ? 'border-navy bg-navy text-white' : 'border-gray-200 bg-white hover:border-gray-400'}`}
          >
            <span className={`block text-2xl font-bold tabular-nums ${!c.actief && c.alarm ? 'text-red-700' : ''}`}>{c.waarde}</span>
            <span className={`block text-xs font-medium ${c.actief ? 'text-white/80' : 'text-gray-600'}`}>{c.label}</span>
          </Link>
        ))}
      </section>

      {/* ── Vandaag ── */}
      {standaard && (gepland.length > 0 || wachtend.length > 0) && (
        <section aria-labelledby="vandaag-titel" className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <h2 id="vandaag-titel" className="text-base font-bold text-gray-900">Vandaag</h2>
          <ul className="mt-3 divide-y divide-gray-100">
            {gepland.map((l) => {
              const te_laat = new Date(l.volgende_actie_op!).getTime() < Date.now()
              return (
                <li key={l.id}>
                  <Link href={`/dashboard/aanvraag/${l.id}`} className="flex items-center gap-3 py-2.5 text-sm hover:bg-gray-50">
                    <CalendarClock className={`h-4 w-4 shrink-0 ${te_laat ? 'text-red-700' : 'text-gray-500'}`} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">
                      <strong className="font-semibold text-gray-900">{l.volgende_actie}</strong>
                      <span className="text-gray-700"> · {wieVan(l)}{l.gemeente ? `, ${l.gemeente}` : ''}</span>
                    </span>
                    <span className={`shrink-0 text-xs font-semibold ${te_laat ? 'text-red-700' : 'text-gray-600'}`}>
                      {te_laat ? 'te laat · ' : ''}{wanneer(l.volgende_actie_op!)}
                    </span>
                  </Link>
                </li>
              )
            })}
            {wachtend.slice(0, 8).map((l) => (
              <li key={l.id}>
                <Link href={`/dashboard/aanvraag/${l.id}`} className="flex items-center gap-3 py-2.5 text-sm hover:bg-gray-50">
                  <Clock className={`h-4 w-4 shrink-0 ${(wachttijd(l) ?? 0) >= 2 ? 'text-red-700' : 'text-gray-500'}`} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">
                    <strong className="font-semibold text-gray-900">{l.telefoon ? 'Terugbellen' : 'Eerste reactie'}</strong>
                    <span className="text-gray-700"> · {wieVan(l)}{l.gemeente ? `, ${l.gemeente}` : ''}{werkenVan(l)[0] ? ` · ${werkenVan(l)[0]}` : ''}</span>
                  </span>
                  <span className={`shrink-0 text-xs font-semibold ${(wachttijd(l) ?? 0) >= 2 ? 'text-red-700' : 'text-gray-600'}`}>{wachtLabel(wachttijd(l)!)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Lijst ── */}
      <section aria-label="Lijst van aanvragen" className="space-y-3">
        <nav aria-label="Filter op opvolging" className="flex gap-1 overflow-x-auto rounded-xl bg-gray-200/70 p-1">
          {TABS.map((t) => {
            const actief = !f.snel && t.sleutel === f.toon
            const aantal = leads.filter((l) => inTab(l, t.sleutel)).length
            return (
              <Link
                key={t.sleutel}
                href={filterUrl('/dashboard', f, { toon: t.sleutel, snel: '' })}
                aria-current={actief ? 'page' : undefined}
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors ${
                  actief ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {t.label}
                <span className={`tabular-nums ${actief ? 'text-gray-600' : 'text-gray-500'}`}>{aantal}</span>
              </Link>
            )
          })}
        </nav>

        <Werkbalk filters={f} werken={opties.werken} bronnen={opties.bronnen} />

        {f.snel && (
          <p className="text-sm text-gray-700">
            {zichtbaar.length} aanvra{zichtbaar.length === 1 ? 'ag' : 'gen'} · {CIJFERS.find((c) => c.snel === f.snel)?.label}.{' '}
            <Link href={filterUrl('/dashboard', f, { snel: '' })} className="font-semibold text-gray-900 underline underline-offset-2">Filter wissen</Link>
          </p>
        )}

        {!fout && zichtbaar.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-600">
            <p>{f.q || f.werk || f.bron || f.tel || f.snel ? 'Geen aanvragen die aan deze filters voldoen.' : LEGE_TEKST[f.toon]}</p>
            {f.toon !== 'alle' && leads.length > 0 && (
              <Link href="/dashboard?toon=alle" className="mt-2 inline-block font-semibold text-gray-900 underline underline-offset-2">
                Toon alle aanvragen
              </Link>
            )}
          </div>
        ) : (
          <AanvraagLijst leads={zichtbaar} archief={f.toon === 'archief' && !f.snel} actief={opvolgingKlaar} controlekamer={controlekamerKlaar} />
        )}
      </section>
    </div>
  )
}
