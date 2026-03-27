import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Dashboard — Leads Overzicht',
  robots: { index: false },
}

const statusKleuren: Record<string, string> = {
  nieuw: 'bg-blue-100 text-blue-800',
  gebeld: 'bg-yellow-100 text-yellow-800',
  offerte: 'bg-purple-100 text-purple-800',
  gewonnen: 'bg-green-100 text-green-800',
  verloren: 'bg-gray-100 text-gray-600',
}

export default async function DashboardPage() {
  let leads: Record<string, unknown>[] = []
  let fout: string | null = null

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    leads = data ?? []
  } catch (err) {
    fout =
      err instanceof Error
        ? err.message
        : 'Supabase niet geconfigureerd. Stel SUPABASE_SERVICE_ROLE_KEY in.'
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
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
                <th className="px-4 py-3">Gemeente</th>
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
                    <a
                      href={`tel:${lead.telefoon}`}
                      className="text-green-700 hover:underline font-medium"
                    >
                      {String(lead.telefoon)}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{String(lead.gemeente)}</td>
                  <td className="px-4 py-3 text-gray-600">{String(lead.probleem)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold">{String(lead.urgentie)}</span>
                    <span className="text-gray-400">/5</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusKleuren[String(lead.status)] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {String(lead.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(String(lead.created_at)).toLocaleDateString('nl-BE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
