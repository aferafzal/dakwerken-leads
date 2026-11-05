import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { isBeheerder } from '@/lib/beheer-auth'
import { createClient } from '@/lib/supabase/server'
import { isVoorbeeld, leesAanvragen } from '@/lib/dashboard/gegevens'
import { bronVan } from '@/lib/dashboard/weergave'

export const metadata: Metadata = { title: 'Cijfers · Dashboard', robots: { index: false } }

// Funnelstappen zoals de anonieme teller ze registreert (zie migrations/004)
const FUNNEL_STAPPEN: { stap: string; label: string }[] = [
  { stap: 'adres', label: 'Funnel geopend' },
  { stap: 'scan', label: 'Adres gekozen' },
  { stap: 'werk', label: 'Dak bevestigd' },
  { stap: 'prijs', label: 'Prijs bekeken' },
  { stap: 'verfijnen', label: 'Prijs verfijnen gestart' },
  { stap: 'vraag_houtwerk', label: '· vraag: houtwerk' },
  { stap: 'vraag_materiaal', label: '· vraag: materiaal' },
  { stap: 'vraag_bouwjaar', label: '· vraag: bouwjaar' },
  { stap: 'vraag_isolatie', label: '· vraag: isolatie' },
  { stap: 'vraag_aansluitingen', label: '· vraag: dakramen en schoorsteen' },
  { stap: 'vraag_zonnepanelen', label: '· vraag: zonnepanelen' },
  { stap: 'vraag_woningtype', label: '· vraag: woningtype' },
  { stap: 'verfijnd', label: 'Prijs volledig verfijnd' },
  { stap: 'email', label: 'Bij de e-mailstap' },
  { stap: 'telefoon', label: 'Rapport aangevraagd' },
  { stap: 'klaar', label: 'Belafspraak gevraagd' },
  { stap: 'rapport_verfijnen', label: 'In het rapport: verfijnen geopend' },
  { stap: 'rapport_verfijnd', label: 'In het rapport: prijs verfijnd' },
]

export default async function CijfersPage() {
  if (!isBeheerder((await headers()).get('authorization'))) notFound()

  const { leads } = await leesAanvragen()
  let funnel: { label: string; aantal: number; pct: number }[] = []
  let funnelFout: string | null = null

  if (isVoorbeeld()) {
    funnelFout = 'In de voorbeeldmodus is er geen funneltelling.'
  } else {
    try {
      const supabase = await createClient()
      const sinds = new Date(Date.now() - 30 * 86_400_000).toISOString()
      const { data, error } = await supabase.from('funnel_events').select('session_id, stap').gte('created_at', sinds).limit(50_000)
      if (error) throw error
      const perStap = new Map<string, Set<string>>()
      for (const rij of data ?? []) {
        if (!perStap.has(rij.stap)) perStap.set(rij.stap, new Set())
        perStap.get(rij.stap)!.add(rij.session_id)
      }
      const basis = perStap.get('adres')?.size ?? 0
      funnel = FUNNEL_STAPPEN.map(({ stap, label }) => {
        const aantal = perStap.get(stap)?.size ?? 0
        return { label, aantal, pct: basis ? Math.round((aantal / basis) * 100) : 0 }
      })
    } catch {
      funnelFout = 'Nog geen funnelgegevens. Voer migrations/004_funnel_events.sql uit in de Supabase SQL-editor.'
    }
  }

  // Aanvragen per bron en per advertentie, laatste 30 dagen
  const recent = leads.filter((l) => Date.now() - new Date(l.created_at).getTime() < 30 * 86_400_000)
  const tel = (sleutel: (l: (typeof leads)[number]) => string) =>
    [...recent.reduce((m, l) => m.set(sleutel(l), (m.get(sleutel(l)) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1])
  const perBron = tel(bronVan)
  const perAdvertentie = tel((l) => l.herkomst?.utm_content ?? '(geen advertentie)')

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 pt-6 pb-16 sm:px-6">
      <h1 className="sr-only">Cijfers</h1>

      <section className="grid gap-4 sm:grid-cols-2">
        {[{ titel: 'Aanvragen per bron', rijen: perBron }, { titel: 'Aanvragen per advertentie', rijen: perAdvertentie }].map(({ titel, rijen }) => (
          <div key={titel} className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-base font-bold text-gray-900">{titel} <span className="font-normal text-gray-500">· laatste 30 dagen</span></h2>
            {rijen.length === 0 ? <p className="mt-3 text-sm text-gray-600">Nog geen aanvragen.</p> : (
              <ul className="mt-3 space-y-1.5 text-sm">
                {rijen.map(([naam, n]) => (
                  <li key={naam} className="flex justify-between gap-3"><span className="truncate text-gray-700">{naam}</span><span className="font-semibold tabular-nums text-gray-900">{n}</span></li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold text-gray-900">Funnel · laatste 30 dagen</h2>
        {funnelFout ? (
          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{funnelFout}</div>
        ) : (
          <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            {funnel.map((f) => (
              <div key={f.label} className="grid grid-cols-[9rem_1fr_5.5rem] items-center gap-3 text-sm sm:grid-cols-[180px_1fr_110px]">
                <span className="text-gray-700">{f.label}</span>
                <div className="h-3 rounded bg-gray-100"><div className="h-3 rounded bg-navy" style={{ width: `${f.pct}%` }} /></div>
                <span className="text-right tabular-nums text-gray-900">{f.aantal} <span className="text-gray-500">({f.pct}%)</span></span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
