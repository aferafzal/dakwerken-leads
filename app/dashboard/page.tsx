import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { ExternalLink, Mail, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { isBeheerder } from '@/lib/beheer-auth'
import { berekenPrijs, WERK_LABEL, type Antwoorden, type DakMaten } from '@/lib/prijsmodel'
import { isOpvolging, OPVOLG_GROEPEN, type Opvolging } from '@/lib/opvolging'
import LeadOpvolging from './LeadOpvolging'

export const metadata: Metadata = {
  title: 'Dashboard — Aanvragen',
  robots: { index: false },
}

// Funnelstappen zoals de anonieme teller ze registreert (zie migrations/004)
const FUNNEL_STAPPEN: { stap: string; label: string }[] = [
  { stap: 'adres',              label: 'Funnel geopend' },
  { stap: 'scan',               label: 'Adres gekozen' },
  { stap: 'prijs',              label: 'Prijs bekeken' },
  { stap: 'verfijnen',          label: 'Prijs verfijnen gestart' },
  { stap: 'vraag_materiaal',    label: '· vraag: materiaal' },
  { stap: 'vraag_bouwjaar',     label: '· vraag: bouwjaar' },
  { stap: 'vraag_isolatie',     label: '· vraag: isolatie' },
  { stap: 'vraag_aansluitingen', label: '· vraag: dakramen en schoorsteen' },
  { stap: 'vraag_zonnepanelen', label: '· vraag: zonnepanelen' },
  { stap: 'vraag_woningtype',   label: '· vraag: woningtype' },
  { stap: 'verfijnd',           label: 'Prijs volledig verfijnd' },
  { stap: 'email',              label: 'Bij de e-mailstap' },
  { stap: 'telefoon',           label: 'Rapport aangevraagd' },
  { stap: 'klaar',              label: 'Belafspraak gevraagd' },
  { stap: 'rapport_verfijnen',  label: 'In het rapport: verfijnen geopend' },
  { stap: 'rapport_verfijnd',   label: 'In het rapport: prijs verfijnd' },
]

type DakData = {
  antwoorden?: Antwoorden
  verfijnd?: boolean
  maten?: DakMaten
  prijs?: { min: number; max: number; nauwkeurigheid: number }
  oppervlakte?: number | null
}

type Lead = {
  id: string
  created_at: string
  email: string | null
  naam: string | null
  telefoon: string | null
  adres: string | null
  gemeente: string | null
  status: string | null
  session_id: string | null
  probleem: string | null
  urgentie: number | null
  bouwjaar: string | null
  type_werken: string[] | null
  dak_oppervlakte?: number | null
  dak_data: DakData | null
  opvolging?: string | null
  notitie?: string | null
  opvolging_op?: string | null
}

// type_werken van oudere aanvragen (vóór de werkkeuze in de funnel)
const TYPE_LABEL: Record<string, string> = {
  pannen: 'Dakbedekking vernieuwen', isolatie: 'Dak isoleren', plat_dak: 'Plat dak vernieuwen', dakgoten: 'Dakgoten',
  lekkage_onderzoek: 'Lekkage', totaalrenovatie: 'Totaalrenovatie', advies: 'Advies',
}
const START_LABEL: Record<string, string> = {
  zo_snel_mogelijk: 'zo snel mogelijk', binnen_3_maanden: 'binnen drie maanden', dit_jaar: 'later dit jaar', orienterend: 'oriënteert zich nog',
}
const BOUWJAAR_LABEL: Record<string, string> = {
  voor_1980: 'gebouwd vóór 1980', '1980_2000': 'gebouwd 1980–2000', '2000_2015': 'gebouwd 2000–2015', na_2015: 'gebouwd na 2015',
}

const TZ = 'Europe/Brussels'
const euro = (n: number) => `€${Math.round(n).toLocaleString('nl-BE')}`

function wanneer(iso: string): string {
  const d = new Date(iso)
  const dag = (x: Date) => x.toLocaleDateString('en-CA', { timeZone: TZ })
  const nu = new Date()
  const uur = d.toLocaleTimeString('nl-BE', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  if (dag(d) === dag(nu)) return `Vandaag ${uur}`
  if (dag(d) === dag(new Date(nu.getTime() - 86_400_000))) return `Gisteren ${uur}`
  const zelfdeJaar = d.toLocaleDateString('nl-BE', { timeZone: TZ, year: 'numeric' }) === nu.toLocaleDateString('nl-BE', { timeZone: TZ, year: 'numeric' })
  return `${d.toLocaleDateString('nl-BE', { timeZone: TZ, day: 'numeric', month: 'short', ...(zelfdeJaar ? {} : { year: 'numeric' }) })} ${uur}`
}

// Wat de bezoeker deed: telefoon > prijs verfijnd > rapport
function interesse(l: Lead): { label: string; sterk: boolean } {
  if (l.telefoon) return { label: 'Wil gebeld worden', sterk: true }
  if (!l.session_id) return { label: 'Offerteformulier', sterk: false }
  if (l.dak_data?.verfijnd || l.status === 'engaged') return { label: 'Prijs verfijnd', sterk: false }
  return { label: 'Rapport aangevraagd', sterk: false }
}

// Prijs zoals het rapport ze nu toont: herberekend uit de maten en de laatste antwoorden
function prijsVan(l: Lead): { min: number; max: number; nauwkeurigheid: number } | null {
  const d = l.dak_data
  if (!d) return null
  if (d.maten) {
    const p = berekenPrijs(d.maten, d.antwoorden ?? {})
    return p.max > 0 ? p : null
  }
  return d.prijs && d.prijs.max > 0 ? d.prijs : null
}

function werkenVan(l: Lead): string[] {
  const w = l.dak_data?.antwoorden?.werken
  if (w?.length) return w.map((x) => WERK_LABEL[x])
  return (l.type_werken ?? []).map((t) => TYPE_LABEL[t] ?? t)
}

const LEGE_TEKST: Record<string, string> = {
  te_doen: 'Niets te doen: elke aanvraag is opgevolgd.',
  lopend: 'Geen lopende aanvragen.',
  afgerond: 'Nog niets afgerond.',
  alle: 'Nog geen aanvragen. Zodra iemand een rapport aanvraagt, verschijnt die hier.',
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ toon?: string }> }) {
  // Tweede controle naast proxy.ts: zonder geldige login geen persoonsgegevens
  if (!isBeheerder((await headers()).get('authorization'))) notFound()

  const { toon } = await searchParams
  const groep = OPVOLG_GROEPEN.find((g) => g.sleutel === toon) ?? OPVOLG_GROEPEN[0]

  let leads: Lead[] = []
  let conversations: Record<string, unknown>[] = []
  let fout: string | null = null
  let opvolgingKlaar = true
  let funnel: { label: string; aantal: number; pct: number }[] = []
  let funnelFout: string | null = null

  try {
    const supabase = await createClient()
    const [leadsRes, convsRes, kolomRes] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('conversations').select('*').order('created_at', { ascending: false }),
      supabase.from('leads').select('opvolging').limit(1),
    ])
    if (leadsRes.error) throw leadsRes.error
    leads = (leadsRes.data ?? []) as Lead[]
    conversations = convsRes.data ?? []
    opvolgingKlaar = !kolomRes.error
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

  const opvolgingVan = (l: Lead): Opvolging => (isOpvolging(l.opvolging) ? l.opvolging : 'nieuw')
  const inGroep = (g: (typeof OPVOLG_GROEPEN)[number], l: Lead) => (g.waarden as readonly string[]).includes(opvolgingVan(l))
  const zichtbaar = leads.filter((l) => inGroep(groep, l))

  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 pt-28 pb-16">
      {/* ── Aanvragen ── */}
      <section aria-labelledby="aanvragen-titel">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h1 id="aanvragen-titel" className="text-2xl font-bold text-gray-900">Aanvragen</h1>
            <p className="mt-1 text-sm text-gray-600">
              Prijzen excl. btw, berekend met de huidige prijstabel en de laatste antwoorden van de klant.
            </p>
          </div>
          <nav aria-label="Filter op opvolging" className="grid w-full grid-cols-4 gap-1 rounded-xl bg-gray-100 p-1 sm:flex sm:w-auto">
            {OPVOLG_GROEPEN.map((g) => {
              const actief = g.sleutel === groep.sleutel
              const aantal = leads.filter((l) => inGroep(g, l)).length
              return (
                <Link
                  key={g.sleutel}
                  href={g.sleutel === 'te_doen' ? '/dashboard' : `/dashboard?toon=${g.sleutel}`}
                  aria-current={actief ? 'page' : undefined}
                  className={`flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold transition-colors sm:px-3 sm:text-sm ${
                    actief ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  {g.label}
                  <span className={`tabular-nums ${actief ? 'text-gray-600' : 'text-gray-500'}`}>{aantal}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {fout && (
          <div role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            <strong>De aanvragen konden niet geladen worden:</strong> {fout}
          </div>
        )}

        {!fout && !opvolgingKlaar && (
          <div className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
            De opvolging en notities kunnen nog niet bewaard worden. Voer <code className="font-mono text-[13px]">migrations/009_opvolging.sql</code> uit
            in de Supabase SQL-editor en herlaad deze pagina.
          </div>
        )}

        {!fout && zichtbaar.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-gray-600">
            <p>{LEGE_TEKST[groep.sleutel]}</p>
            {groep.sleutel !== 'alle' && leads.length > 0 && (
              <Link href="/dashboard?toon=alle" className="mt-2 inline-block font-semibold text-gray-900 underline underline-offset-2">
                Toon alle aanvragen
              </Link>
            )}
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {zichtbaar.map((l) => {
              const wie = interesse(l)
              const prijs = prijsVan(l)
              const werken = werkenVan(l)
              const antwoorden = l.dak_data?.antwoorden
              const oppervlakte = l.dak_data?.oppervlakte ?? l.dak_oppervlakte ?? null
              const bouwjaar = antwoorden?.bouwjaar ?? l.bouwjaar
              const naam = l.naam?.trim() || null
              const mail = l.email
                ? `mailto:${l.email}?subject=${encodeURIComponent(`Uw dakrapport${l.adres ? ` voor ${l.adres}` : ''}`)}`
                : null
              const woning = [
                oppervlakte ? `±${Math.round(oppervlakte)} m² dak` : null,
                bouwjaar ? BOUWJAAR_LABEL[bouwjaar] : null,
              ].filter(Boolean).join(' · ')

              return (
                <li key={l.id} className="grid gap-x-6 gap-y-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)]">
                  {/* Wie en hoe bereiken */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                        wie.sterk ? 'bg-orange-100 text-orange-900' : 'bg-gray-100 text-gray-700'}`}>
                        {wie.sterk && <Phone className="h-3 w-3" aria-hidden />}
                        {wie.label}
                      </span>
                      <time dateTime={l.created_at} className="text-gray-600">{wanneer(l.created_at)}</time>
                    </div>
                    {naam ? (
                      <p className="mt-2 truncate font-semibold text-gray-900">{naam}</p>
                    ) : null}
                    <div className={`${naam ? 'mt-1' : 'mt-2'} flex flex-col items-start gap-1 text-sm`}>
                      {l.telefoon && (
                        <a href={`tel:${l.telefoon.replace(/\s+/g, '')}`} className="inline-flex items-center gap-1.5 font-semibold text-gray-900 underline-offset-2 hover:underline">
                          <Phone className="h-3.5 w-3.5 flex-shrink-0 text-gray-500" aria-hidden />{l.telefoon}
                        </a>
                      )}
                      {mail && (
                        <a href={mail} className={`inline-flex max-w-full items-center gap-1.5 underline-offset-2 hover:underline ${
                          naam || l.telefoon ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
                          <Mail className="h-3.5 w-3.5 flex-shrink-0 text-gray-500" aria-hidden />
                          <span className="truncate">{l.email}</span>
                        </a>
                      )}
                      {!l.telefoon && !mail && <span className="text-gray-600">Geen contactgegevens</span>}
                    </div>
                  </div>

                  {/* Woning */}
                  <div className="min-w-0 text-sm">
                    <p className="font-medium text-gray-900">{l.adres || l.gemeente || 'Geen adres'}</p>
                    {woning && <p className="mt-0.5 text-gray-600">{woning}</p>}
                  </div>

                  {/* Werk en prijs */}
                  <div className="min-w-0 text-sm">
                    {werken.length > 0 && <p className="text-gray-900">{werken.join(' · ')}</p>}
                    {prijs && (
                      <p className="mt-0.5">
                        <span className="font-semibold tabular-nums text-gray-900">{euro(prijs.min)} – {euro(prijs.max)}</span>
                        <span className="text-gray-600"> · ±{prijs.nauwkeurigheid}%{l.dak_data?.verfijnd ? ' · met antwoorden' : ''}</span>
                      </p>
                    )}
                    {antwoorden?.start && <p className="mt-0.5 text-gray-600">Wil starten: {START_LABEL[antwoorden.start]}</p>}
                    {l.probleem && (
                      <p className="mt-0.5 text-gray-600">
                        Probleem: {l.probleem}{l.urgentie ? ` · dringendheid ${l.urgentie}/5` : ''}
                      </p>
                    )}
                    {l.session_id && (
                      <a href={`/rapport/${l.session_id}`} target="_blank" rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 font-semibold text-gray-900 underline underline-offset-2 hover:text-navy">
                        Rapport bekijken <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        <span className="sr-only">(opent in een nieuw tabblad)</span>
                      </a>
                    )}
                  </div>

                  {/* Opvolging */}
                  <div className="min-w-0">
                    <LeadOpvolging
                      id={l.id}
                      opvolging={opvolgingVan(l)}
                      notitie={l.notitie ?? null}
                      actief={opvolgingKlaar}
                    />
                    {l.opvolging_op && <p className="mt-1 text-xs text-gray-600">Bijgewerkt {wanneer(l.opvolging_op).toLowerCase()}</p>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ── Funnel ── */}
      <section>
        <h2 className="mb-6 text-xl font-bold text-gray-900">Funnel · laatste 30 dagen</h2>
        {funnelFout ? (
          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{funnelFout}</div>
        ) : (
          <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            {funnel.map((f) => (
              <div key={f.label} className="grid grid-cols-[9rem_1fr_5.5rem] items-center gap-3 text-sm sm:grid-cols-[180px_1fr_110px]">
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
                    <td className="px-4 py-3 text-gray-500">{wanneer(String(conv.created_at))}</td>
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
