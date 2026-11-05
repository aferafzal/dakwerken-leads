'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { filterUrl, SORTERINGEN, type Filters } from '@/lib/dashboard/filter'

/** Zoeken, sorteren en filteren. Alles komt in de URL: terug en vernieuwen werken gewoon. */
export default function Werkbalk({ filters, werken, bronnen, zonderSortering = false }: {
  filters: Filters
  werken: string[]
  bronnen: string[]
  zonderSortering?: boolean
}) {
  const router = useRouter()
  const pad = usePathname()
  const [bezig, start] = useTransition()
  const [q, setQ] = useState(filters.q)
  const vorige = useRef(filters.q)

  // Typen: na een korte pauze de lijst bijwerken (zonder een nieuwe stap in de geschiedenis per letter)
  useEffect(() => {
    if (q.trim() === vorige.current) return
    const t = setTimeout(() => {
      vorige.current = q.trim()
      start(() => router.replace(filterUrl(pad, filters, { q: q.trim() }), { scroll: false }))
    }, 250)
    return () => clearTimeout(t)
  }, [q, filters, pad, router])

  const zet = (w: Partial<Filters>) => start(() => router.push(filterUrl(pad, filters, w), { scroll: false }))
  const veld = 'h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 hover:border-gray-400'

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={bezig}>
      <label className="relative min-w-0 flex-[1_1_16rem]">
        <span className="sr-only">Zoeken</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden />
        <input
          id="zoek"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Zoek op naam, e-mail, telefoon, gemeente of adres"
          className={`${veld} w-full pl-9 pr-9`}
        />
        {q && (
          <button type="button" onClick={() => setQ('')} aria-label="Zoekterm wissen"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-gray-900">
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </label>

      {!zonderSortering && (
        <label>
          <span className="sr-only">Sorteren</span>
          <select id="sorteer" value={filters.sorteer} onChange={(e) => zet({ sorteer: e.target.value as Filters['sorteer'] })} className={veld}>
            {SORTERINGEN.map((s) => <option key={s.sleutel} value={s.sleutel}>{s.label}</option>)}
          </select>
        </label>
      )}

      {werken.length > 1 && (
        <label>
          <span className="sr-only">Werk</span>
          <select id="werk" value={filters.werk} onChange={(e) => zet({ werk: e.target.value })} className={`${veld} max-w-[12rem]`}>
            <option value="">Alle werken</option>
            {werken.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </label>
      )}

      {bronnen.length > 1 && (
        <label>
          <span className="sr-only">Bron</span>
          <select id="bron" value={filters.bron} onChange={(e) => zet({ bron: e.target.value })} className={`${veld} max-w-[12rem]`}>
            <option value="">Alle bronnen</option>
            {bronnen.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
      )}

      <label className="flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 hover:border-gray-400">
        <input id="tel" type="checkbox" checked={filters.tel} onChange={(e) => zet({ tel: e.target.checked })} className="h-4 w-4 accent-[var(--color-navy)]" />
        Met telefoon
      </label>
    </div>
  )
}
