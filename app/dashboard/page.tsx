import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isBeheerder } from '@/lib/beheer-auth'

export const metadata: Metadata = {
  title: 'Dashboard — Leads Overzicht',
  robots: { index: false },
}

// Funnelstappen zoals de anonieme teller ze registreert (zie migrations/004)
const FUNNEL_STAPPEN: { stap: string; label: string }[] = [
  { stap: 'adres',       label: 'Funnel geopend' },
  { stap: 'scan',        label: 'Adres gekozen' },
  { stap: 'preview',     label: 'Dak bekeken' },
  { stap: 'email',       label: 'Bij de e-mailstap' },
  { stap: 'vragenlijst', label: 'Rapport aangevraagd' },
  { stap: 'telefoon',    label: 'Bij de telefoonstap' },
  { stap: 'klaar',       label: 'Belafspraak gevraagd' },
]

const statusKleuren: Record<string, string> = {
  nieuw: 'bg-blue-100 text-blue-800',
  gebeld: 'bg-yellow-100 text-yellow-800',
  offerte: 'bg-purple-100 text-purple-800',
  gewonnen: 'bg-green-100 text-green-800',
  verloren: 'bg-gray-100 text-gray-600',
}

export default async function DashboardPage() {
  // Tweede controle naast proxy.ts: zonder geldige login geen persoonsgegevens
  if (!isBeheerder((await headers()).get('authorization'))) notFound()

  let leads: Record<string, unknown>[] = []
  let conversations: Record<string, unknown>[] = []
  let fout: string | null = null
  let funnel: { label: string; aantal: number; pct: number }[] = []
  let funnelFout: string | null = null

  try {
    const supabase = await createClient()
    const [leadsRes, convsRes] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('conversations').select('*').order('created_at', { ascending: false }),
    ])
    if (leadsRes.error) throw leadsRes.error
    leads = leadsRes.data ?? []
    conversations = convsRes.data ?? []
  } catch (err) {
    fout =
      err instanceof Error
        ? err.message
        : 'Supabase niet geconfigureerd. Stel SUPABASE_SERVICE_ROLE_KEY in.'
  }

  // Funnel: unieke sessies per stap, laatste 30 dagen
  try {
    const supabase = await createClient()
    const sinds = new Date(Date.now() - 30 * 86_400_000).toISOString()
    const { data, error } = await supabase
      .from('funnel_events')
      .select('session_id, stap')
      .gte('created_at', sinds)
      .limit(50_000)
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

  return (
    <div className="mx-auto max-w-6xl px-4 pt-28 pb-10 space-y-12">
      {/* ── Funnel ── */}
      <section>
        <h2 className="mb-6 text-xl font-bold text-gray-900">Funnel · laatste 30 dagen</h2>
        {funnelFout ? (
          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{funnelFout}</div>
        ) : (
          <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            {funnel.map((f) => (
              <div key={f.label} className="grid grid-cols-[180px_1fr_110px] items-center gap-3 text-sm">
                <span className="text-gray-700">{f.label}</span>
                <div className="h-3 rounded bg-gray-100">
                  <div className="h-3 rounded bg-navy" style={{ width: `${f.pct}%` }} />
                </div>
                <span className="text-right tabular-nums text-gray-900">
                  {f.aantal} <span className="text-gray-500">({f.pct}%)</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Leads ── */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Leads Dashboard</h1>
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
            {leads.length} leads
          </span>
        </div>

        {fout && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            <strong>Fout:</strong> {fout}
          </div>
        )}

        {leads.length === 0 && !fout ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
            Nog geen leads ontvangen.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Naam</th>
                  <th className="px-4 py-3">Telefoon</th>
                  <th className="px-4 py-3">Adres</th>
                  <th className="px-4 py-3">Probleem</th>
                  <th className="px-4 py-3">Urgentie</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Datum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead) => (
                  <tr key={String(lead.id)} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{String(lead.naam)}</td>
                    <td className="px-4 py-3">
                      <a href={`tel:${lead.telefoon}`} className="text-green-700 hover:underline font-medium">
                        {String(lead.telefoon)}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-[180px] truncate">
                      {lead.adres ? String(lead.adres) : String(lead.gemeente)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{String(lead.probleem)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold">{String(lead.urgentie)}</span>
                      <span className="text-gray-400">/5</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusKleuren[String(lead.status)] ?? 'bg-gray-100 text-gray-600'}`}>
                        {String(lead.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(String(lead.created_at)).toLocaleDateString('nl-BE', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Gesprekken (chat widget) ── */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Chat Gesprekken</h2>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
            {conversations.length} gesprekken
          </span>
        </div>

        {conversations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
            Nog geen chat gesprekken ontvangen.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Naam</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Datum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {conversations.map((conv) => (
                  <tr key={String(conv.id)} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{String(conv.naam)}</td>
                    <td className="px-4 py-3 text-gray-600">{conv.email ? String(conv.email) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${conv.status === 'open' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                        {String(conv.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(String(conv.created_at)).toLocaleDateString('nl-BE', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
