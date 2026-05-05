'use client'

import { useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { DakmetingResultaat } from '@/app/api/dakmeting/route'
import type { PerceelSelectie } from './DakKaart'
import {
  bouwjaarLabels,
  dakwerkenLabels,
  lekkageLabels,
  type FunnelStapVragenlijst,
} from '@/lib/validations'

const DakKaart = dynamic(() => import('./DakKaart'), { ssr: false })

type Stap = 'adres' | 'scan' | 'preview' | 'email' | 'vragenlijst' | 'telefoon' | 'klaar'

const STAP_LABELS: Record<Stap, string> = {
  adres:       'Adres',
  scan:        'Scan',
  preview:     'Resultaat',
  email:       'Rapport',
  vragenlijst: 'Verfijn',
  telefoon:    'Advies',
  klaar:       'Klaar',
}

const VOORTGANG: Stap[] = ['adres', 'scan', 'preview', 'email', 'vragenlijst', 'telefoon', 'klaar']

function genSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function DakRapportFunnel() {
  const [stap, setStap] = useState<Stap>('adres')
  const [sessionId] = useState(genSessionId)

  // Adres + scan-data
  const [adresWaarde, setAdresWaarde] = useState('')
  const [suggesties, setSuggesties] = useState<string[]>([])
  const [toonDropdown, setToonDropdown] = useState(false)
  const [meting, setMeting] = useState<DakmetingResultaat | null>(null)
  const [metingBezig, setMetingBezig] = useState(false)
  const [perceelSelectie, setPerceelSelectie] = useState<PerceelSelectie | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Email-stap
  const [email, setEmail] = useState('')
  const [gdpr, setGdpr] = useState(false)
  const [emailFout, setEmailFout] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)

  // Vragenlijst-stap
  const [bouwjaar, setBouwjaar] = useState<FunnelStapVragenlijst['bouwjaar']>(undefined)
  const [laatsteWerken, setLaatsteWerken] = useState<FunnelStapVragenlijst['laatste_dakwerken']>(undefined)
  const [lekkage, setLekkage] = useState<FunnelStapVragenlijst['lekkage_recent']>(undefined)

  // Telefoon-stap
  const [naam, setNaam] = useState('')
  const [telefoon, setTelefoon] = useState('')
  const [besteTijd, setBesteTijd] = useState<'direct' | 'vandaag' | 'morgen'>('direct')
  const [telefoonFout, setTelefoonFout] = useState<string | null>(null)

  const totaalDak =
    perceelSelectie?.gebouwen?.reduce((s, g) => s + (g.dakOppervlak ?? g.oppervlakte ?? 0), 0)
    ?? meting?.dakOppervlak
    ?? meting?.oppervlakte
    ?? null

  const aantalGebouwen = perceelSelectie?.gebouwen?.length ?? (meting?.oppervlakte ? 1 : 0)
  const nokhoogte = perceelSelectie?.gebouwen?.[0]?.hoogte3d?.nokhoogte ?? meting?.hoogte3d?.nokhoogte ?? null
  const daktype = perceelSelectie?.gebouwen?.[0]?.hoogte3d?.gebouwType ?? meting?.hoogte3d?.gebouwType ?? null

  // ── Adres autocomplete ──────────────────────────────────────────
  function onAdresInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setAdresWaarde(q)
    setMeting(null)
    setPerceelSelectie(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 4) {
      setSuggesties([])
      setToonDropdown(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/dakmeting?q=${encodeURIComponent(q)}`)
        if (!res.ok) return
        const data = await res.json()
        setSuggesties(data.suggesties ?? [])
        setToonDropdown(true)
      } catch { /* stil falen */ }
    }, 300)
  }

  async function selecteerAdres(adres: string) {
    setAdresWaarde(adres)
    setSuggesties([])
    setToonDropdown(false)
    setMetingBezig(true)
    setStap('scan')
    try {
      const res = await fetch(`/api/dakmeting?adres=${encodeURIComponent(adres)}`)
      if (res.ok) setMeting(await res.json())
    } catch { /* stil falen */ }
    setMetingBezig(false)
  }

  // ── Stap-overgangen ─────────────────────────────────────────────
  function onPerceelSelect(data: PerceelSelectie) {
    setPerceelSelectie(data)
  }

  function naarPreview() {
    setStap('preview')
  }

  // ── API: Email-stap (status='warm') ─────────────────────────────
  async function submitEmail(e: React.FormEvent) {
    e.preventDefault()
    setEmailFout(null)
    if (!email.includes('@')) { setEmailFout('Ongeldig e-mailadres'); return }
    if (!gdpr) { setEmailFout('Akkoord met privacy is verplicht'); return }
    setBezig(true)
    try {
      const res = await fetch('/api/funnel/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stap: 'email',
          sessionId,
          data: {
            email,
            gdpr_consent: true,
            adres: adresWaarde,
            gemeente: meting?.gemeente ?? perceelSelectie?.gemeente ?? undefined,
            dakOppervlakte: totaalDak ?? undefined,
            dak_data: {
              capakey: perceelSelectie?.capakey ?? meting?.capakey,
              perceelnummer: perceelSelectie?.perceelnummer ?? meting?.perceelnummer,
              oppervlakte: totaalDak,
              nokhoogte,
              daktype,
              aantalGebouwen,
            },
          },
        }),
      })
      if (!res.ok) throw new Error('Submit mislukt')
      setStap('vragenlijst')
    } catch {
      setEmailFout('Er ging iets mis. Probeer opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  // ── API: Vragenlijst-stap (status='engaged') ────────────────────
  async function submitVragenlijst() {
    setBezig(true)
    try {
      await fetch('/api/funnel/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stap: 'vragenlijst',
          sessionId,
          data: { bouwjaar, laatste_dakwerken: laatsteWerken, lekkage_recent: lekkage },
        }),
      })
    } catch { /* niet kritiek */ }
    setBezig(false)
    setStap('telefoon')
  }

  function slaVragenlijstOver() {
    setStap('telefoon')
  }

  // ── API: Telefoon-stap (status='hot') ───────────────────────────
  async function submitTelefoon(e: React.FormEvent) {
    e.preventDefault()
    setTelefoonFout(null)
    if (naam.trim().length < 2) { setTelefoonFout('Vul uw naam in'); return }
    if (!/^[0-9+\s()-]{9,15}$/.test(telefoon)) { setTelefoonFout('Ongeldig telefoonnummer'); return }
    setBezig(true)
    try {
      const res = await fetch('/api/funnel/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stap: 'telefoon',
          sessionId,
          data: { naam, telefoon, beste_tijd: besteTijd, followup_consent: false },
        }),
      })
      if (!res.ok) throw new Error('Submit mislukt')
      setStap('klaar')
    } catch {
      setTelefoonFout('Er ging iets mis. Probeer opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  // ── UI ──────────────────────────────────────────────────────────
  const stapIndex = VOORTGANG.indexOf(stap)
  const voortgang = ((stapIndex + 1) / VOORTGANG.length) * 100

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
      {/* Voortgangsbalk */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-100">
        <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
          <span>Stap {stapIndex + 1} van {VOORTGANG.length}</span>
          <span className="text-green-700">{STAP_LABELS[stap]}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-600 transition-all duration-500 ease-out"
            style={{ width: `${voortgang}%` }}
          />
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {/* ─── Stap 1 — Adres ─── */}
        {stap === 'adres' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Ontdek alles over uw eigen dak
              </h2>
              <p className="text-sm text-gray-600">
                Vul uw adres in om uw gratis dakrapport te starten. Geen verplichtingen.
              </p>
            </div>

            <div className="relative">
              <label htmlFor="adres" className="block text-sm font-medium text-gray-700 mb-1">
                Adres van uw woning
              </label>
              <div className="relative">
                <input
                  id="adres"
                  type="text"
                  autoComplete="off"
                  placeholder="Begin met typen…"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 pr-9 text-base text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                  value={adresWaarde}
                  onChange={onAdresInput}
                  onBlur={() => setTimeout(() => setToonDropdown(false), 150)}
                  onFocus={() => suggesties.length > 0 && setToonDropdown(true)}
                />
                {metingBezig ? (
                  <span className="absolute right-3 top-3.5 h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                ) : (
                  <svg className="absolute right-3 top-3.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </div>

              {toonDropdown && suggesties.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                  {suggesties.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        className="w-full px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-green-50 hover:text-green-800 transition-colors"
                        onMouseDown={() => selecteerAdres(s)}
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <ul className="text-xs text-gray-500 space-y-1 pt-2">
              <li>✓ Direct resultaat op kaart</li>
              <li>✓ Officiële Vlaamse overheidsdata</li>
              <li>✓ Volledig gratis, geen account nodig</li>
            </ul>
          </div>
        )}

        {/* ─── Stap 2 — Scan + kaartselectie ─── */}
        {stap === 'scan' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Klik op uw woning</h2>
              <p className="text-sm text-gray-600">
                Selecteer het juiste perceel op de kaart voor de meest accurate meting.
              </p>
            </div>

            {meting && meting.lat && meting.lng ? (
              <DakKaart
                key={`${meting.lat}-${meting.lng}`}
                lat={meting.lat}
                lng={meting.lng}
                initieleSelectie={meting.oppervlakte || meting.perceelnummer ? {
                  capakey: meting.capakey,
                  perceelnummer: meting.perceelnummer,
                  afdeling: meting.afdeling,
                  aantalAdressen: meting.aantalAdressen,
                  gemeente: meting.gemeente,
                  perceelGrenzen: null,
                  gebouwen: meting.oppervlakte ? [{
                    oppervlakte: meting.oppervlakte,
                    dakOppervlak: meting.dakOppervlak,
                    grenzen: [],
                    hoogte3d: meting.hoogte3d,
                  }] : [],
                } : null}
                onPerceelSelect={onPerceelSelect}
              />
            ) : (
              <div className="h-64 rounded-xl bg-gray-50 flex items-center justify-center text-sm text-gray-500">
                {metingBezig ? 'Uw dak wordt opgezocht…' : 'Geen kaartgegevens'}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStap('adres')}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                ← Ander adres
              </button>
              <button
                onClick={naarPreview}
                disabled={!totaalDak}
                className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {totaalDak ? `Bekijk resultaat (±${totaalDak} m²) →` : 'Selecteer eerst uw perceel'}
              </button>
            </div>
          </div>
        )}

        {/* ─── Stap 3 — Preview ─── */}
        {stap === 'preview' && (
          <div className="space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full mb-3">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                Dakscan voltooid
              </div>
              <h2 className="text-xl font-bold text-gray-900">Uw dak in cijfers</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-green-700 text-white p-4">
                <p className="text-[10px] uppercase tracking-wider opacity-75 mb-1">Dakoppervlakte</p>
                <p className="text-2xl font-bold">±{totaalDak} m²</p>
                {aantalGebouwen > 1 && (
                  <p className="text-[10px] opacity-75 mt-0.5">{aantalGebouwen} gebouwen</p>
                )}
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Daktype</p>
                <p className="text-lg font-bold text-gray-900 capitalize">{daktype ?? 'Onbekend'}</p>
                {nokhoogte && (
                  <p className="text-xs text-gray-500 mt-0.5">Nokhoogte {nokhoogte} m</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900 mb-1">📄 Dit is een voorproef</p>
              <p className="text-xs text-amber-800">
                Uw volledige rapport bevat: kostenindicatie, mogelijke premies, checklist voor uw dak en een vergelijking met de straat.
              </p>
            </div>

            <button
              onClick={() => setStap('email')}
              className="w-full rounded-lg bg-green-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
            >
              📧 Stuur mijn volledig rapport
            </button>

            <button
              onClick={() => setStap('scan')}
              className="w-full text-xs text-gray-500 hover:text-gray-700"
            >
              ← Ander perceel selecteren
            </button>
          </div>
        )}

        {/* ─── Stap 4 — Email ─── */}
        {stap === 'email' && (
          <form onSubmit={submitEmail} className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Waar mogen we uw rapport sturen?</h2>
              <p className="text-sm text-gray-600">
                U ontvangt het volledige dakrapport binnen 2 minuten in uw inbox.
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                E-mailadres
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="naam@voorbeeld.be"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="mt-0.5 accent-green-600"
                checked={gdpr}
                onChange={(e) => setGdpr(e.target.checked)}
              />
              <span>
                Ik ga akkoord met de <a href="/privacy" className="text-green-700 underline">privacyverklaring</a>.
              </span>
            </label>

            {emailFout && <p className="text-xs text-red-600">{emailFout}</p>}

            <button
              type="submit"
              disabled={bezig}
              className="w-full rounded-lg bg-green-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              {bezig ? 'Bezig…' : 'Stuur mijn rapport →'}
            </button>

            <p className="text-center text-xs text-gray-400">
              ⏱ Uw rapport komt binnen 2 minuten in uw inbox
            </p>
          </form>
        )}

        {/* ─── Stap 5 — Vragenlijst (optioneel) ─── */}
        {stap === 'vragenlijst' && (
          <div className="space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full mb-3">
                ✓ Rapport verstuurd
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Maak uw rapport persoonlijker</h2>
              <p className="text-sm text-gray-600">
                3 korte vragen voor specifiek advies. Helemaal optioneel.
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Wanneer is uw woning gebouwd?</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(bouwjaarLabels).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setBouwjaar(val as FunnelStapVragenlijst['bouwjaar'])}
                    className={`text-sm py-2.5 px-3 rounded-lg border transition-colors ${
                      bouwjaar === val
                        ? 'border-green-600 bg-green-50 text-green-700 font-semibold'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Wanneer zijn de laatste dakwerken?</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(dakwerkenLabels).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setLaatsteWerken(val as FunnelStapVragenlijst['laatste_dakwerken'])}
                    className={`text-sm py-2.5 px-3 rounded-lg border transition-colors ${
                      laatsteWerken === val
                        ? 'border-green-600 bg-green-50 text-green-700 font-semibold'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Recente lekkage of vochtproblemen?</p>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(lekkageLabels).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setLekkage(val as FunnelStapVragenlijst['lekkage_recent'])}
                    className={`text-sm py-2.5 px-3 rounded-lg border transition-colors ${
                      lekkage === val
                        ? 'border-green-600 bg-green-50 text-green-700 font-semibold'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={slaVragenlijstOver}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Sla over
              </button>
              <button
                onClick={submitVragenlijst}
                disabled={bezig}
                className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                {bezig ? 'Bezig…' : 'Verfijn rapport →'}
              </button>
            </div>
          </div>
        )}

        {/* ─── Stap 6 — Telefoon ─── */}
        {stap === 'telefoon' && (
          <form onSubmit={submitTelefoon} className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">📞 Gratis expertadvies?</h2>
              <p className="text-sm text-gray-600">
                Onze dakexpert bekijkt uw rapport gratis en belt u binnen 30 minuten met persoonlijk advies.
              </p>
            </div>

            <ul className="text-xs text-gray-500 space-y-0.5">
              <li>✓ Geen kosten</li>
              <li>✓ Geen verplichting</li>
              <li>✓ Wij bellen binnen 30 min tijdens werkuren</li>
            </ul>

            <div>
              <label htmlFor="naam" className="block text-sm font-medium text-gray-700 mb-1">Uw naam</label>
              <input
                id="naam"
                type="text"
                autoComplete="name"
                required
                placeholder="Jan Janssen"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="telefoon" className="block text-sm font-medium text-gray-700 mb-1">Telefoonnummer</label>
              <input
                id="telefoon"
                type="tel"
                autoComplete="tel"
                required
                placeholder="0470 12 34 56"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                value={telefoon}
                onChange={(e) => setTelefoon(e.target.value)}
              />
            </div>

            <div>
              <p className="block text-sm font-medium text-gray-700 mb-2">Beste tijd om te bellen?</p>
              <div className="grid grid-cols-3 gap-2">
                {(['direct', 'vandaag', 'morgen'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setBesteTijd(t)}
                    className={`text-sm py-2.5 px-3 rounded-lg border capitalize transition-colors ${
                      besteTijd === t
                        ? 'border-green-600 bg-green-50 text-green-700 font-semibold'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {telefoonFout && <p className="text-xs text-red-600">{telefoonFout}</p>}

            <button
              type="submit"
              disabled={bezig}
              className="w-full rounded-lg bg-green-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              {bezig ? 'Bezig…' : '📞 Bel mij gratis'}
            </button>

            <p className="text-center text-xs text-gray-400">
              Geen verplichting · uw nummer wordt niet gedeeld
            </p>
          </form>
        )}

        {/* ─── Stap 7 — Klaar ─── */}
        {stap === 'klaar' && (
          <div className="text-center space-y-4 py-4">
            <div className="text-5xl">🎉</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Bedankt, {naam}!</h2>
              <p className="text-sm text-gray-600 mt-2">
                Onze dakexpert belt u binnen <strong>30 minuten</strong> op {telefoon}.
              </p>
            </div>

            <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-green-800 mb-1">📧 Inbox check</p>
              <p className="text-sm text-green-900">
                Uw volledige dakrapport is verstuurd naar <strong>{email}</strong>. Niet ontvangen? Check uw spam-map.
              </p>
            </div>

            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_OWNER_WHATSAPP ?? '32470000000'}?text=Hallo%2C%20ik%20heb%20zojuist%20mijn%20dakrapport%20aangevraagd%20en%20heb%20een%20vraag.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1da851] transition-colors"
            >
              💬 Liever direct via WhatsApp?
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
