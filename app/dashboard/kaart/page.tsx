import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { isBeheerder } from '@/lib/beheer-auth'
import { OPVOLGING } from '@/lib/opvolging'
import { leesAanvragen } from '@/lib/dashboard/gegevens'
import { filter, filterUrl, inTab, keuzes, leesFilters, TABS } from '@/lib/dashboard/filter'
import { coordVan, euro, opvolgingVan, prijsVan, werkenVan, wieVan } from '@/lib/dashboard/weergave'
import Werkbalk from '../Werkbalk'
import KaartLader from './KaartLader'
import { SPELD_KLEUR, type KaartPunt } from './AanvragenKaart'

export const metadata: Metadata = { title: 'Kaart · Dashboard', robots: { index: false } }

export default async function KaartPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!isBeheerder((await headers()).get('authorization'))) notFound()

  const sp = await searchParams
  // Op de kaart standaard alle lopende en nieuwe aanvragen (niet het archief)
  const f = leesFilters(sp, '/dashboard/kaart')
  const { leads, fout } = await leesAanvragen()
  const zichtbaar = filter(leads, f)
  const opties = keuzes(leads)

  const punten: KaartPunt[] = []
  let zonderLocatie = 0
  for (const l of zichtbaar) {
    const c = coordVan(l)
    if (!c) { zonderLocatie++; continue }
    const p = prijsVan(l)
    const status = opvolgingVan(l)
    punten.push({
      id: l.id, lat: c[0], lng: c[1], titel: wieVan(l), status,
      statusLabel: OPVOLGING.find((o) => o.waarde === status)?.label ?? status,
      regel: [[l.adres, l.gemeente].filter(Boolean).join(', '), werkenVan(l)[0], p ? `${euro(p.min)} – ${euro(p.max)}` : null].filter(Boolean).join(' · '),
    })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-3 px-4 pt-6 pb-16 sm:px-6">
      <h1 className="sr-only">Kaart van de aanvragen</h1>
      {fout && <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{fout}</div>}

      <nav aria-label="Filter op opvolging" className="flex gap-1 overflow-x-auto rounded-xl bg-gray-200/70 p-1">
        {TABS.map((t) => (
          <Link key={t.sleutel} href={filterUrl('/dashboard/kaart', f, { toon: t.sleutel, snel: '' })}
            aria-current={t.sleutel === f.toon ? 'page' : undefined}
            className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ${
              t.sleutel === f.toon ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            {t.label}<span className="tabular-nums text-gray-500">{leads.filter((l) => inTab(l, t.sleutel)).length}</span>
          </Link>
        ))}
      </nav>
      <Werkbalk filters={f} werken={opties.werken} bronnen={opties.bronnen} zonderSortering />

      <KaartLader punten={punten} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-700">
        {OPVOLGING.map((o) => (
          <span key={o.waarde} className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border-2 border-white shadow" style={{ background: SPELD_KLEUR[o.waarde] }} aria-hidden />{o.label}
          </span>
        ))}
        {zonderLocatie > 0 && <span className="text-gray-500">· {zonderLocatie} zonder locatie (niet op de kaart)</span>}
      </div>
    </div>
  )
}
