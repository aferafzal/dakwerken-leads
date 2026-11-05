import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { isBeheerder } from '@/lib/beheer-auth'
import { createClient } from '@/lib/supabase/server'
import { isVoorbeeld } from '@/lib/dashboard/gegevens'
import { wanneer } from '@/lib/dashboard/weergave'

export const metadata: Metadata = { title: 'Chat · Dashboard', robots: { index: false } }

export default async function ChatPage() {
  if (!isBeheerder((await headers()).get('authorization'))) notFound()

  let gesprekken: Record<string, unknown>[] = []
  if (!isVoorbeeld()) {
    try {
      const supabase = await createClient()
      const { data } = await supabase.from('conversations').select('*').order('created_at', { ascending: false })
      gesprekken = data ?? []
    } catch { /* geen chat-tabel: lege lijst */ }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Chatgesprekken</h1>
        <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-900">{gesprekken.length} gesprekken</span>
      </div>
      {gesprekken.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-600">Nog geen chatgesprekken ontvangen.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
              <tr><th className="px-4 py-3">Naam</th><th className="px-4 py-3">E-mail</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Datum</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gesprekken.map((c) => (
                <tr key={String(c.id)} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{String(c.naam ?? '—')}</td>
                  <td className="px-4 py-3 text-gray-700">{c.email ? String(c.email) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.status === 'open' ? 'bg-sky-100 text-sky-900' : 'bg-gray-100 text-gray-700'}`}>{String(c.status)}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{wanneer(String(c.created_at))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
