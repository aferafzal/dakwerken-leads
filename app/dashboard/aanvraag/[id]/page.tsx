import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import {
  Archive, ArrowLeft, CalendarClock, CheckCircle2, ExternalLink, FileText, Mail, MapPin, MessageCircle, Phone, StickyNote, Tag, UserRound,
} from 'lucide-react'
import { isBeheerder } from '@/lib/beheer-auth'
import { LABEL, VRAAG } from '@/lib/notifications'
import { isVoorbeeld, leesAanvraag, leesBerichten, leesKlaar, leesTijdlijn } from '@/lib/dashboard/gegevens'
import { welkeAi } from '@/lib/ai/concept'
import type { MailSoort } from '@/lib/ai/mailsoorten'
import MailSchrijver from './MailSchrijver'
import {
  BOUWJAAR_LABEL, coordVan, euro, herkomstVan, interesse, kaartLinks, opvolgingVan, oppervlakteVan, prijsVan, START_LABEL,
  telVan, wachtLabel, wachttijd, wanneer, werkenVan, wieVan, type TijdlijnRegel,
} from '@/lib/dashboard/weergave'
import type { Antwoorden } from '@/lib/prijsmodel'
import LeadOpvolging from '../../LeadOpvolging'
import { STATUS_KLEUR } from '../../AanvraagLijst'
import { OPVOLGING } from '@/lib/opvolging'
import VolgendeActie from './VolgendeActie'
import AanvraagBeheer from './AanvraagBeheer'

export const metadata: Metadata = { title: 'Aanvraag · Dashboard', robots: { index: false } }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const TIJDLIJN_ICOON: Record<string, typeof Mail> = {
  aanvraag: FileText, rapport_verstuurd: Mail, terugbellen: Phone, mail_uit: Mail, mail_in: Mail, status: Tag,
  notitie: StickyNote, volgende_actie: CalendarClock, archief: Archive, herstel: CheckCircle2,
}
const DOOR: Record<TijdlijnRegel['door'], string> = { klant: 'Klant', systeem: 'Site', ai: 'AI', team: 'Jij' }

/** Luchtfoto rond het punt (Web Mercator: ±35 m op de grond bij 51° NB) */
function luchtfoto(lat: number, lng: number, b = 640, h = 400): string {
  const R = 6378137
  const x = (lng * Math.PI / 180) * R
  const y = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2)) * R
  const half = 35 / Math.cos(lat * Math.PI / 180)
  const bbox = [x - half, y - half * (h / b), x + half, y + half * (h / b)].map((n) => n.toFixed(1)).join(',')
  return `https://geo.api.vlaanderen.be/OMWRGBMRVL/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image/jpeg&LAYERS=Ortho&STYLES=&CRS=EPSG:3857&BBOX=${bbox}&WIDTH=${b}&HEIGHT=${h}`
}

function antwoordRegels(a: Antwoorden | undefined): [string, string][] {
  if (!a) return []
  const regels: [string, string][] = []
  if (a.start) regels.push(['Wil starten', START_LABEL[a.start] ?? a.start])
  for (const [k, label] of VRAAG) {
    if (k === 'start') continue
    const w = a[k as keyof Antwoorden]
    if (w != null) regels.push([label, LABEL[k]?.[String(w)] ?? String(w)])
  }
  if (a.zonnepanelen != null) regels.push(['Zonnepanelen', a.zonnepanelen === 0 ? 'geen' : String(a.zonnepanelen)])
  if (a.dakramen != null) regels.push(['Bestaande dakramen', String(a.dakramen)])
  if (a.schoorstenen != null) regels.push(['Schoorstenen', String(a.schoorstenen)])
  return regels
}

export default async function AanvraagPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isBeheerder((await headers()).get('authorization'))) notFound()
  const { id } = await params
  if (!UUID.test(id)) notFound()

  const [l, tijdlijn, berichten, { opvolgingKlaar, controlekamerKlaar }] = await Promise.all([
    leesAanvraag(id), leesTijdlijn(id), leesBerichten(id), leesKlaar(),
  ])
  if (!l) notFound()
  // Welke mail ligt voor de hand: eerste contact, offerte opvolgen, bedanking, anders een herinnering
  const st = opvolgingVan(l)
  const standaardSoort: MailSoort = !berichten.some((b) => b.richting === 'uit') && (st === 'nieuw' || st === 'gecontacteerd')
    ? 'eerste_contact' : st === 'offerte' ? 'offerte_opvolgen' : st === 'gewonnen' ? 'bedanking' : 'herinnering'

  const wie = interesse(l)
  const prijs = prijsVan(l)
  const werken = werkenVan(l)
  const m2 = oppervlakteVan(l)
  const c = coordVan(l)
  const links = kaartLinks(l)
  const t = l.telefoon ? telVan(l.telefoon) : null
  const wacht = wachttijd(l)
  const status = opvolgingVan(l)
  const bouwjaar = l.dak_data?.antwoorden?.bouwjaar ?? l.bouwjaar
  const antwoorden = antwoordRegels(l.dak_data?.antwoorden)
  const mailto = l.email ? `mailto:${l.email}?subject=${encodeURIComponent(`Uw dak${l.adres ? ` aan de ${l.adres}` : ''}`)}` : null
  const knop = 'flex h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition-colors'

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pt-6 pb-16 sm:px-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" aria-hidden />Alle aanvragen
      </Link>

      {/* ── Kop: wie en hoe bereiken ── */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_KLEUR[status]}`}>{OPVOLGING.find((o) => o.waarde === status)?.label}</span>
          {wie.sterk && <span className="rounded-full bg-orange-100 px-2 py-0.5 font-semibold text-orange-900">Wil gebeld worden</span>}
          {wacht != null && <span className={`rounded-full px-2 py-0.5 font-semibold ${wacht >= 2 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>{wachtLabel(wacht)}</span>}
          {l.gearchiveerd_op && <span className="rounded-full bg-gray-200 px-2 py-0.5 font-semibold text-gray-700">Gearchiveerd</span>}
          <span className="text-gray-600">Binnen {wanneer(l.created_at).toLowerCase()}{herkomstVan(l) ? ` · via ${herkomstVan(l)}` : ''}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 [overflow-wrap:anywhere]">{wieVan(l)}</h1>
        <div className="flex flex-wrap gap-2">
          {t && <a href={`tel:${t.tel}`} className={`${knop} bg-navy text-white hover:brightness-125`}><Phone className="h-4 w-4" aria-hidden />{l.telefoon}</a>}
          {t && <a href={`https://wa.me/${t.whatsapp}`} target="_blank" rel="noopener noreferrer" className={`${knop} border border-gray-300 bg-white text-gray-900 hover:border-gray-500`}><MessageCircle className="h-4 w-4" aria-hidden />WhatsApp</a>}
          {l.email && <a href="#mail" className={`${knop} ${t ? 'border border-gray-300 bg-white text-gray-900 hover:border-gray-500' : 'bg-navy text-white hover:brightness-125'}`}><Mail className="h-4 w-4" aria-hidden />Mail</a>}
          {l.session_id && <a href={`/rapport/${l.session_id}`} target="_blank" rel="noopener noreferrer" className={`${knop} border border-gray-300 bg-white text-gray-900 hover:border-gray-500`}><ExternalLink className="h-4 w-4" aria-hidden />Rapport<span className="sr-only"> (opent in een nieuw tabblad)</span></a>}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* ── Links: het dak en de aanvraag ── */}
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="dak-titel" className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {c && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={luchtfoto(c[0], c[1])} alt={`Luchtfoto van ${l.adres ?? 'het dak'}`} width={640} height={400} className="aspect-[16/10] w-full bg-gray-200 object-cover" />
            )}
            <div className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="dak-titel" className="flex items-center gap-1.5 font-semibold text-gray-900"><MapPin className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />{[l.adres, l.gemeente].filter(Boolean).join(', ') || 'Geen adres'}</h2>
                  <p className="mt-0.5 text-sm text-gray-600">{[m2 ? `±${Math.round(m2)} m² dak` : null, bouwjaar ? BOUWJAAR_LABEL[bouwjaar] : null].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="flex gap-3 text-sm font-semibold">
                  <a href={links.maps} target="_blank" rel="noopener noreferrer" className="text-gray-900 underline underline-offset-2">Google Maps</a>
                  {links.streetview && <a href={links.streetview} target="_blank" rel="noopener noreferrer" className="text-gray-900 underline underline-offset-2">Street View</a>}
                </div>
              </div>

              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                {werken.length > 0 && <div><dt className="text-gray-600">Wil laten doen</dt><dd className="font-semibold text-gray-900">{werken.join(' · ')}</dd></div>}
                {prijs && (
                  <div><dt className="text-gray-600">Prijsindicatie (excl. btw)</dt>
                    <dd className="font-semibold tabular-nums text-gray-900">{euro(prijs.min)} – {euro(prijs.max)} <span className="font-normal text-gray-600">· ±{prijs.nauwkeurigheid}%{l.dak_data?.verfijnd ? ' · met antwoorden' : ''}</span></dd></div>
                )}
                {antwoorden.map(([k, v]) => <div key={k}><dt className="text-gray-600">{k}</dt><dd className="text-gray-900">{v}</dd></div>)}
                {l.probleem && <div className="sm:col-span-2"><dt className="text-gray-600">Probleem</dt><dd className="text-gray-900">{l.probleem}{l.urgentie ? ` · dringendheid ${l.urgentie}/5` : ''}</dd></div>}
                {l.email && <div className="min-w-0"><dt className="text-gray-600">E-mail</dt><dd className="truncate text-gray-900">{l.email}</dd></div>}
              </dl>
            </div>
          </section>

          {/* ── Mail ── */}
          <section id="mail" aria-labelledby="mail-titel" className="scroll-mt-4 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="mail-titel" className="font-semibold text-gray-900">Mail sturen</h2>
              {mailto && <a href={mailto} className="text-sm font-semibold text-gray-700 underline underline-offset-2 hover:text-gray-900">Liever in je mailapp</a>}
            </div>
            {l.email ? (
              controlekamerKlaar ? (
                <div className="mt-3">
                  <MailSchrijver id={l.id} aan={l.email} standaard={standaardSoort} ai={welkeAi()} voorbeeld={isVoorbeeld()} />
                </div>
              ) : <p className="mt-1 text-sm text-gray-600">Mail schrijven vanuit het dashboard werkt na migratie 021.</p>
            ) : <p className="mt-1 text-sm text-gray-600">Geen e-mailadres bij deze aanvraag.</p>}
          </section>

          {berichten.length > 0 && (
            <section aria-labelledby="verstuurd-titel" className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
              <h2 id="verstuurd-titel" className="font-semibold text-gray-900">Verstuurde mails <span className="font-normal text-gray-500">{berichten.length}</span></h2>
              <ul className="mt-3 space-y-2">
                {berichten.map((b) => (
                  <li key={b.id}>
                    <details className="group rounded-lg border border-gray-200">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm">
                        <span className="min-w-0 truncate font-medium text-gray-900">{b.onderwerp ?? '(geen onderwerp)'}</span>
                        <span className="shrink-0 text-xs text-gray-600">{b.verstuurd_door === 'ai' ? 'AI-concept · ' : ''}{wanneer(b.created_at)}</span>
                      </summary>
                      <p className="whitespace-pre-line border-t border-gray-100 px-3 py-3 text-sm leading-relaxed text-gray-800">{b.inhoud}</p>
                    </details>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ── Rechts: opvolging en tijdlijn ── */}
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="opvolging-titel" className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <h2 id="opvolging-titel" className="font-semibold text-gray-900">Opvolging</h2>
            <LeadOpvolging id={l.id} opvolging={status} notitie={l.notitie ?? null} actief={opvolgingKlaar} />
          </section>

          <section aria-labelledby="actie-titel" className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <h2 id="actie-titel" className="font-semibold text-gray-900">Volgende actie</h2>
            <VolgendeActie id={l.id} actie={l.volgende_actie ?? null} op={l.volgende_actie_op ?? null} actief={controlekamerKlaar} />
          </section>

          <section aria-labelledby="tijdlijn-titel" className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <h2 id="tijdlijn-titel" className="font-semibold text-gray-900">Tijdlijn</h2>
            {tijdlijn.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">
                {controlekamerKlaar ? 'Nog niets geregistreerd. Wat je hier doet, komt in de tijdlijn.' : 'De tijdlijn werkt na migratie 021.'}
              </p>
            ) : (
              <ol className="mt-3 space-y-3">
                {tijdlijn.map((r) => {
                  const Icoon = TIJDLIJN_ICOON[r.soort] ?? UserRound
                  return (
                    <li key={r.id} className="flex gap-3 text-sm">
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-700"><Icoon className="h-3.5 w-3.5" aria-hidden /></span>
                      <div className="min-w-0">
                        <p className="text-gray-900 [overflow-wrap:anywhere]">{r.samenvatting ?? r.soort}</p>
                        <p className="text-xs text-gray-600">{DOOR[r.door]} · {wanneer(r.created_at)}</p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>

          <section aria-label="Beheer" className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <AanvraagBeheer id={l.id} gearchiveerd={!!l.gearchiveerd_op} controlekamer={controlekamerKlaar} />
          </section>
        </div>
      </div>
    </div>
  )
}
