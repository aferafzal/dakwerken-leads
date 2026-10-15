'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Check, CircleCheck } from 'lucide-react'
import type { DakmetingResultaat } from '@/app/api/dakmeting/route'
import type { PerceelSelectie } from './DakKaart'
import {
  bouwjaarLabels,
  dakwerkenLabels,
  lekkageLabels,
  typeWerkenLabels,
  isGeldigTelefoon,
  type FunnelStapVragenlijst,
} from '@/lib/validations'

type TypeWerk = NonNullable<FunnelStapVragenlijst['type_werken']>[number]

const DakKaart = dynamic(() => import('./DakKaart'), { ssr: false })

type Stap = 'adres' | 'scan' | 'preview' | 'email' | 'vragenlijst' | 'telefoon' | 'klaar'

const STAP_LABELS: Record<Stap, string> = {
  adres:       'Adres',
  scan:        'Uw dak',
  preview:     'Uw dak',
  email:       'Rapport',
  vragenlijst: 'Rapport aanvullen',
  telefoon:    'Advies',
  klaar:       'Klaar',
}

const VOORTGANG: Stap[] = ['adres', 'scan', 'preview', 'email', 'vragenlijst', 'telefoon', 'klaar']

// Wat de bezoeker als stappen ziet: 3 stappen tot het rapport (zoals op de homepage),
// daarna zijn vragenlijst en telefoon optionele extra's.
const HOOFDSTAP: Partial<Record<Stap, number>> = { adres: 1, scan: 2, preview: 2, email: 3 }
const AANTAL_HOOFDSTAPPEN = 3

const BELMOMENT: Record<'direct' | 'vandaag' | 'morgen', string> = {
  direct:  'Zo snel mogelijk',
  vandaag: 'Later vandaag',
  morgen:  'Morgen',
}

const OWNER_PHONE = process.env.NEXT_PUBLIC_OWNER_PHONE ?? ''

// Steppen waar 3D-model als compacte preview blijft staan (na de eerste keer)
const TOON_3D_PREVIEW: Stap[] = ['email', 'vragenlijst', 'telefoon']

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
  const [actief, setActief] = useState(-1)
  const [adresMelding, setAdresMelding] = useState<string | null>(null)
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
  const [typeWerken, setTypeWerken] = useState<TypeWerk[]>([])

  function toggleTypeWerk(t: TypeWerk) {
    setTypeWerken((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])
  }

  // LOD2 3D-model
  const [lod2Status, setLod2Status] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [lod2Url, setLod2Url] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

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
    setAdresMelding(null)
    setActief(-1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 4) {
      setSuggesties([])
      setToonDropdown(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/dakmeting?q=${encodeURIComponent(q)}`)
        if (!res.ok) throw new Error('Adres opzoeken mislukt')
        const data = await res.json()
        const lijst: string[] = data.suggesties ?? []
        setSuggesties(lijst)
        setActief(-1)
        setToonDropdown(lijst.length > 0)
        setAdresMelding(lijst.length > 0 ? null
          : 'Geen adres gevonden. Typ straat, huisnummer en gemeente, bijvoorbeeld: Korenmarkt 10, Gent.')
      } catch {
        setAdresMelding('Adressen opzoeken lukt nu even niet. Probeer het zo meteen opnieuw.')
      }
    }, 300)
  }

  // Pijltjes, Enter en Escape in de adreslijst
  function onAdresToets(e: React.KeyboardEvent<HTMLInputElement>) {
    const lijstOpen = toonDropdown && suggesties.length > 0
    if (e.key === 'ArrowDown') {
      if (suggesties.length === 0) return
      e.preventDefault()
      setToonDropdown(true)
      setActief((i) => (i + 1) % suggesties.length)
    } else if (e.key === 'ArrowUp') {
      if (!lijstOpen) return
      e.preventDefault()
      setActief((i) => (i <= 0 ? suggesties.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      if (!lijstOpen) return
      e.preventDefault()
      selecteerAdres(suggesties[actief >= 0 ? actief : 0])
    } else if (e.key === 'Escape') {
      if (!lijstOpen) return
      // Sluit alleen de lijst, niet de modal (die luistert ook op document)
      e.preventDefault()
      e.nativeEvent.stopImmediatePropagation()
      setToonDropdown(false)
      setActief(-1)
    }
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

  async function naarPreview() {
    setStap('preview')

    const capakey = perceelSelectie?.capakey ?? meting?.capakey
    const allGebouwen = perceelSelectie?.gebouwen ?? []
    if (!capakey || allGebouwen.length === 0) return

    setLod2Status('loading')
    setLod2Url(null)

    const gebouwenPayload = allGebouwen
      .filter((g) => g.grenzen && g.grenzen.length >= 3)
      .map((g) => ({
        footprint_wgs84: g.grenzen,
        nokhoogte: g.hoogte3d?.nokhoogte ?? null,
        gebouwType: g.hoogte3d?.gebouwType ?? null,
      }))

    if (gebouwenPayload.length === 0) {
      setLod2Status('error')
      return
    }

    try {
      const res = await fetch('/api/lod2/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capakey, gebouwen: gebouwenPayload }),
      })
      const data = await res.json()

      if (data.status === 'done' && data.url) {
        setLod2Url(data.url)
        setLod2Status('done')
        return
      }
    } catch {
      setLod2Status('error')
      return
    }

    // Polling elke 10s totdat Blob klaar is
    const safe = (perceelSelectie?.capakey ?? meting?.capakey ?? '').replace(/\//g, '_')
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`/api/lod2/status/${encodeURIComponent(safe)}`)
        const d = await r.json()
        if (d.status === 'done' && d.url) {
          setLod2Url(d.url)
          setLod2Status('done')
          clearInterval(interval)
          pollRef.current = null
        }
      } catch { /* stil falen */ }
    }, 10_000)
    pollRef.current = interval

    // Geef op na 5 minuten
    setTimeout(() => {
      if (pollRef.current === interval) {
        clearInterval(interval)
        pollRef.current = null
        setLod2Status((s) => (s === 'loading' ? 'error' : s))
      }
    }, 300_000)
  }

  // ── API: Email-stap (status='warm') ─────────────────────────────
  async function submitEmail(e: React.FormEvent) {
    e.preventDefault()
    setEmailFout(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailFout('Dit e-mailadres klopt niet. Bijvoorbeeld: naam@voorbeeld.be')
      return
    }
    if (!gdpr) { setEmailFout('Vink het vakje aan om akkoord te gaan met de privacyverklaring.'); return }
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
              lat: meting?.lat ?? null,
              lng: meting?.lng ?? null,
            },
          },
        }),
      })
      if (!res.ok) throw new Error('Submit mislukt')
      setStap('vragenlijst')
    } catch {
      setEmailFout('Uw rapport kon niet verstuurd worden. Controleer uw internetverbinding en probeer het opnieuw.')
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
          data: { bouwjaar, laatste_dakwerken: laatsteWerken, lekkage_recent: lekkage, type_werken: typeWerken.length ? typeWerken : undefined },
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
    if (!isGeldigTelefoon(telefoon)) {
      setTelefoonFout('Dit telefoonnummer klopt niet. Bijvoorbeeld: 0470 12 34 56 of +32 470 12 34 56')
      return
    }
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
      setTelefoonFout(
        `Uw aanvraag kon niet verstuurd worden. Probeer het opnieuw${OWNER_PHONE ? ` of bel ons op ${OWNER_PHONE}` : ''}.`
      )
    } finally {
      setBezig(false)
    }
  }

  // ── UI ──────────────────────────────────────────────────────────
  const stapIndex = VOORTGANG.indexOf(stap)
  const hoofdstap = HOOFDSTAP[stap]
  const voortgang = hoofdstap ? (hoofdstap / AANTAL_HOOFDSTAPPEN) * 100 : 100
  const voortgangLabel = hoofdstap
    ? `Stap ${hoofdstap} van ${AANTAL_HOOFDSTAPPEN}`
    : stap === 'klaar' ? 'Klaar' : 'Extra · optioneel'

  // Terug-knop: gaat één stap terug, behalve op 'adres' en 'klaar'
  const vorigeStap: Stap | null =
    stap === 'adres' || stap === 'klaar' ? null : VOORTGANG[stapIndex - 1] ?? null

  function gaTerug() {
    if (vorigeStap) setStap(vorigeStap)
  }

  const toonCompactePreview =
    TOON_3D_PREVIEW.includes(stap) && lod2Status === 'done' && lod2Url

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl">
      {/* Voortgangsbalk + terug-knop */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
          <div className="flex items-center gap-2">
            {vorigeStap && (
              <button
                type="button"
                onClick={gaTerug}
                className="text-gray-500 hover:text-green-700 transition-colors"
                aria-label="Vorige stap"
              >
                ← Vorige
              </button>
            )}
            <span>{voortgangLabel}</span>
          </div>
          {stap !== 'klaar' && <span className="text-green-700">{STAP_LABELS[stap]}</span>}
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-700 transition-all duration-500 ease-out"
            style={{ width: `${voortgang}%` }}
          />
        </div>
      </div>

      {/* Compact 3D-preview die meereist door de funnel */}
      {toonCompactePreview && (
        <div className="px-5 pt-3">
          <div className="rounded-lg overflow-hidden bg-gray-900 border border-gray-200" style={{ height: 140 }}>
            <iframe
              src={`/lod2-viewer.html?glb=${encodeURIComponent(lod2Url!)}&lat=${meting?.lat ?? ''}&lng=${meting?.lng ?? ''}`}
              className="w-full h-full border-0"
              title="3D Dakmodel"
              loading="lazy"
            />
          </div>
        </div>
      )}

      <div className="p-6 sm:p-8">
        {/* ─── Stap 1 — Adres ─── */}
        {stap === 'adres' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Waar staat uw woning?
              </h2>
              <p className="text-sm text-gray-600">
                Vul uw adres in. U ziet meteen de luchtfoto van uw perceel.
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
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={toonDropdown && suggesties.length > 0}
                  aria-controls="adres-suggesties"
                  aria-activedescendant={actief >= 0 ? `adres-optie-${actief}` : undefined}
                  placeholder="Straat, huisnummer, gemeente"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 pr-9 text-base text-gray-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/25"
                  value={adresWaarde}
                  onChange={onAdresInput}
                  onKeyDown={onAdresToets}
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
                <ul
                  id="adres-suggesties"
                  role="listbox"
                  aria-label="Gevonden adressen"
                  className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
                >
                  {suggesties.map((s, i) => (
                    <li
                      key={s}
                      id={`adres-optie-${i}`}
                      role="option"
                      aria-selected={i === actief}
                      className={`cursor-pointer px-3 py-3 text-sm transition-colors ${
                        i === actief ? 'bg-green-50 text-green-900' : 'text-gray-800'
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        selecteerAdres(s)
                      }}
                      onMouseEnter={() => setActief(i)}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}

              {adresMelding && (
                <p role="status" className="mt-2 text-sm text-gray-700">{adresMelding}</p>
              )}
            </div>

            <ul className="text-xs text-gray-600 space-y-1 pt-2">
              {['Meteen zichtbaar op de kaart', 'Gegevens van de Vlaamse overheid', 'Gratis, zonder account'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 flex-shrink-0 text-green-700" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ─── Stap 2 — Scan + kaartselectie ─── */}
        {stap === 'scan' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {totaalDak ? 'Is dit uw woning?' : 'Klik op uw woning'}
              </h2>
              <p className="text-sm text-gray-600">
                {totaalDak
                  ? 'Staat de verkeerde woning aangeduid? Klik dan op de kaart op het juiste dak.'
                  : 'Klik op de kaart op het dak van uw woning.'}
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
                {metingBezig ? 'Uw dak wordt opgezocht…' : 'Voor dit adres vonden we geen kaartgegevens. Probeer een ander adres.'}
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
                className="flex-1 rounded-lg bg-green-700 px-4 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {totaalDak ? `Bekijk resultaat (±${totaalDak} m²) →` : 'Klik eerst op uw dak'}
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

            {/* ─── 3D viewer ─── */}
            {lod2Status !== 'idle' && (
              <div className="w-full rounded-xl overflow-hidden bg-gray-900" style={{ height: 280 }}>
                {lod2Status === 'loading' && (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-white text-sm">
                    <span className="inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>3D dakmodel wordt berekend…</span>
                    <span className="text-xs opacity-50">30–90 seconden</span>
                  </div>
                )}
                {lod2Status === 'done' && lod2Url && (
                  <iframe
                    src={`/lod2-viewer.html?glb=${encodeURIComponent(lod2Url)}&lat=${meting?.lat ?? ''}&lng=${meting?.lng ?? ''}`}
                    className="w-full h-full border-0"
                    title="3D Dakmodel"
                    loading="lazy"
                  />
                )}
                {lod2Status === 'error' && (
                  <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                    3D model kon niet worden geladen
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-green-700 text-white p-4">
                <p className="text-xs uppercase tracking-wider opacity-75 mb-1">Dakoppervlakte</p>
                <p className="text-2xl font-bold">±{totaalDak} m²</p>
                {aantalGebouwen > 1 && (
                  <p className="text-xs opacity-75 mt-0.5">{aantalGebouwen} gebouwen</p>
                )}
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Nokhoogte</p>
                <p className="text-2xl font-bold text-gray-900">{nokhoogte ? `${Number(nokhoogte).toLocaleString('nl-BE')} m` : 'Onbekend'}</p>
              </div>
            </div>

            <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900 mb-1">In uw volledige rapport</p>
              <p className="text-xs text-amber-800">
                Een kostenindicatie, mogelijke premies, aandachtspunten voor uw dak en een vergelijking met de buurt.
                We sturen het naar uw e-mailadres, zodat u het later terugvindt.
              </p>
            </div>

            <button
              onClick={() => setStap('email')}
              className="w-full rounded-lg bg-green-700 px-4 py-3.5 text-sm font-semibold text-white hover:bg-green-800 transition-colors"
            >
              Stuur mij het volledige rapport
            </button>

            <button
              onClick={() => setStap('scan')}
              className="w-full text-xs text-gray-500 hover:text-gray-700"
            >
              ← Andere woning kiezen
            </button>
          </div>
        )}

        {/* ─── Stap 4 — Email ─── */}
        {stap === 'email' && (
          <form onSubmit={submitEmail} className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Waar mogen we uw rapport sturen?</h2>
              <p className="text-sm text-gray-600">
                U krijgt meteen een e-mail met de link naar uw rapport.
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
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-gray-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/25"
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

            {emailFout && <p role="alert" className="text-sm text-red-700">{emailFout}</p>}

            <button
              type="submit"
              disabled={bezig}
              className="w-full rounded-lg bg-green-700 px-4 py-3.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60 transition-colors"
            >
              {bezig ? 'Bezig…' : 'Stuur mijn rapport →'}
            </button>

          </form>
        )}

        {/* ─── Stap 5 — Vragenlijst (optioneel) ─── */}
        {stap === 'vragenlijst' && (
          <div className="space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full mb-3">
                <Check className="h-3.5 w-3.5" aria-hidden />
                Rapport verstuurd
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Maak uw rapport persoonlijker</h2>
              <p className="text-sm text-gray-600">
                Vier korte vragen. Uw rapport krijgt dan aandachtspunten voor uw woning. Helemaal optioneel.
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

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Welke werken overweegt u?</p>
              <p className="text-xs text-gray-500 mb-2">Meerdere mogelijk — helpt ons het juiste advies te geven.</p>
              <div className="grid grid-cols-1 gap-2">
                {(Object.entries(typeWerkenLabels) as [TypeWerk, string][]).map(([val, label]) => {
                  const checked = typeWerken.includes(val)
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => toggleTypeWerk(val)}
                      className={`text-sm py-2.5 px-3 rounded-lg border text-left transition-colors flex items-center gap-2 ${
                        checked
                          ? 'border-green-600 bg-green-50 text-green-800 font-semibold'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className={`inline-block w-4 h-4 rounded border-2 flex-shrink-0 ${checked ? 'bg-green-700 border-green-600' : 'border-gray-300'}`}>
                        {checked && (
                          <svg viewBox="0 0 20 20" fill="white" className="w-full h-full"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                        )}
                      </span>
                      {label}
                    </button>
                  )
                })}
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
                className="flex-1 rounded-lg bg-green-700 px-4 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60 transition-colors"
              >
                {bezig ? 'Bezig…' : 'Vul mijn rapport aan →'}
              </button>
            </div>
          </div>
        )}

        {/* ─── Stap 6 — Telefoon ─── */}
        {stap === 'telefoon' && (
          <form onSubmit={submitTelefoon} className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Uw rapport bespreken met een dakwerker?</h2>
              <p className="text-sm text-gray-600">
                Een gecertificeerde dakwerker uit ons netwerk overloopt uw rapport met u aan de telefoon.
              </p>
            </div>

            <ul className="text-xs text-gray-600 space-y-1">
              {['Geen kosten', 'Geen verplichting', 'U kiest zelf wanneer u gebeld wordt'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 flex-shrink-0 text-green-700" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>

            <div>
              <label htmlFor="naam" className="block text-sm font-medium text-gray-700 mb-1">Uw naam</label>
              <input
                id="naam"
                type="text"
                autoComplete="name"
                required
                placeholder="Jan Janssen"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-gray-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/25"
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
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-gray-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/25"
                value={telefoon}
                onChange={(e) => setTelefoon(e.target.value)}
              />
            </div>

            <div>
              <p className="block text-sm font-medium text-gray-700 mb-2">Wanneer mogen we u bellen?</p>
              <div className="grid grid-cols-3 gap-2">
                {(['direct', 'vandaag', 'morgen'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setBesteTijd(t)}
                    className={`text-sm py-2.5 px-3 rounded-lg border transition-colors ${
                      besteTijd === t
                        ? 'border-green-600 bg-green-50 text-green-700 font-semibold'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {BELMOMENT[t]}
                  </button>
                ))}
              </div>
            </div>

            {telefoonFout && <p role="alert" className="text-sm text-red-700">{telefoonFout}</p>}

            <button
              type="submit"
              disabled={bezig}
              className="w-full rounded-lg bg-green-700 px-4 py-3.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60 transition-colors"
            >
              {bezig ? 'Bezig…' : 'Bel mij gratis terug'}
            </button>

            <p className="text-center text-xs text-gray-600">
              We geven uw naam en nummer door aan een dakwerker uit ons netwerk, zodat die u kan bellen.
              Meer daarover in de <a href="/privacy" className="underline underline-offset-2">privacyverklaring</a>.
            </p>
          </form>
        )}

        {/* ─── Stap 7 — Klaar ─── */}
        {stap === 'klaar' && (
          <div className="text-center space-y-4 py-4">
            <CircleCheck className="mx-auto h-12 w-12 text-green-600" aria-hidden />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Bedankt, {naam}!</h2>
              <p className="text-sm text-gray-600 mt-2">
                {besteTijd === 'direct'
                  ? <>U wordt zo snel mogelijk gebeld op {telefoon}. Op werkdagen is dat <strong>binnen 2 uur</strong>.</>
                  : <>U wordt <strong>{BELMOMENT[besteTijd].toLowerCase()}</strong> gebeld op {telefoon}.</>}
              </p>
            </div>

            <a
              href={`/rapport/${sessionId}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800 transition-colors"
            >
              Bekijk uw dakrapport
            </a>

            <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-green-800 mb-1">Rapport verstuurd</p>
              <p className="text-sm text-green-900">
                Uw dakrapport is verstuurd naar <strong>{email}</strong>. Niet ontvangen? Kijk ook bij uw ongewenste e-mail.
              </p>
            </div>

            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_OWNER_WHATSAPP ?? '32470000000'}?text=Hallo%2C%20ik%20heb%20zojuist%20mijn%20dakrapport%20aangevraagd%20en%20heb%20een%20vraag.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1da851] transition-colors"
            >
              Nog een vraag? Stuur ons een WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
