'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Check, CircleCheck } from 'lucide-react'
import { dakMaten, erfgoedVan, hoofdGebouw } from '@/lib/dak'
import { DRIE_D_AAN } from '@/lib/instellingen'
import { berekenPrijs, gekozenWerken, inzichten, vragenVoor, type Antwoorden, type Vraag, type Werk } from '@/lib/prijsmodel'
import AdresZoeker from '@/components/AdresZoeker'
import { PrijsKaart, Vragenstroom, WerkKeuze } from '@/components/PrijsVerfijner'
import type { DakmetingResultaat } from '@/app/api/dakmeting/route'
import type { KaartFase, PerceelSelectie } from './DakKaart'
import { isGeldigTelefoon } from '@/lib/validations'

// Werken zoals ze in de databank staan (kolom type_werken)
const WERK_NAAR_TYPE: Record<Werk, 'pannen' | 'isolatie' | 'plat_dak' | 'dakgoten' | 'lekkage_onderzoek' | 'advies'> = {
  dakbedekking: 'pannen', isolatie: 'isolatie', plat_dak: 'plat_dak', goten: 'dakgoten', lekkage: 'lekkage_onderzoek', advies: 'advies',
}

const DakKaart = dynamic(() => import('./DakKaart'), { ssr: false })

type Stap = 'adres' | 'scan' | 'prijs' | 'verfijnen' | 'email' | 'telefoon' | 'klaar'

const STAP_LABELS: Record<Stap, string> = {
  adres:     'Adres',
  scan:      'Uw dak',
  prijs:     'Uw prijs',
  verfijnen: 'Uw prijs',
  email:     'Rapport',
  telefoon:  'Advies',
  klaar:     'Klaar',
}

// Wat de bezoeker als stappen ziet: 3 stappen tot het rapport (zoals op de homepage),
// het verfijnen van de prijs hoort bij stap 2; de telefoon is een optionele extra.
const HOOFDSTAP: Partial<Record<Stap, number>> = { adres: 1, scan: 2, prijs: 2, verfijnen: 2, email: 3 }
const AANTAL_HOOFDSTAPPEN = 3

const BELMOMENT: Record<'direct' | 'vandaag' | 'morgen', string> = {
  direct:  'Zo snel mogelijk',
  vandaag: 'Later vandaag',
  morgen:  'Morgen',
}

const OWNER_PHONE = process.env.NEXT_PUBLIC_OWNER_PHONE ?? ''

function genSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

interface Props {
  // false zolang de modal dicht is: dan tellen we nog geen stappen
  zichtbaar?: boolean
  // Adres dat al op de homepage gekozen werd: de funnel start dan meteen bij de kaart
  startVerzoek?: { adres: string; id: number } | null
}

export default function DakRapportFunnel({ zichtbaar = true, startVerzoek = null }: Props) {
  const [stap, setStap] = useState<Stap>('adres')
  const [sessionId] = useState(genSessionId)

  // Anonieme stapstatistiek: één keer per stap (of vraag) per sessie, enkel als de funnel open is
  const gelogd = useRef<Set<string>>(new Set())
  function log(naam: string) {
    if (gelogd.current.has(naam)) return
    gelogd.current.add(naam)
    const payload = JSON.stringify({ sessionId, stap: naam })
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/funnel/event', new Blob([payload], { type: 'application/json' }))
      } else {
        void fetch('/api/funnel/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true })
      }
    } catch { /* statistiek is nooit kritiek */ }
  }
  useEffect(() => {
    if (zichtbaar) log(stap)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stap, zichtbaar])

  // Adres + scan-data
  const [adresWaarde, setAdresWaarde] = useState('')
  const [meting, setMeting] = useState<DakmetingResultaat | null>(null)
  const [metingBezig, setMetingBezig] = useState(false)
  const [perceelSelectie, setPerceelSelectie] = useState<PerceelSelectie | null>(null)

  // Email-stap
  const [email, setEmail] = useState('')
  const [gdpr, setGdpr] = useState(false)
  const [emailFout, setEmailFout] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)

  // Bij een nieuwe stap bovenaan beginnen
  const paneelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (stap !== 'adres') paneelRef.current?.scrollIntoView({ block: 'start' })
  }, [stap])

  // Prijs verfijnen: antwoorden van de bezoeker (alles optioneel)
  const [antwoorden, setAntwoorden] = useState<Antwoorden>({})
  const [werkKeuze, setWerkKeuze] = useState<Werk[] | null>(null)
  const [verfijnd, setVerfijnd] = useState(false)

  // Telefoon-stap
  const [naam, setNaam] = useState('')
  const [telefoon, setTelefoon] = useState('')
  const [besteTijd, setBesteTijd] = useState<'direct' | 'vandaag' | 'morgen'>('direct')
  const [telefoonFout, setTelefoonFout] = useState<string | null>(null)

  // Enkel de gebouwen die meetellen (standaard het aangeduide gebouw)
  const meetellend = perceelSelectie?.gebouwen?.filter((g) => g.meetellen !== false)
  const totaalDak =
    (meetellend && meetellend.length > 0
      ? meetellend.reduce((s, g) => s + (g.dakOppervlak ?? g.oppervlakte ?? 0), 0)
      : null)
    ?? meting?.dakOppervlak
    ?? meting?.oppervlakte
    ?? null

  const aantalGebouwen = meetellend?.length ?? (meting?.oppervlakte ? 1 : 0)
  const [kaartFase, setKaartFase] = useState<KaartFase>('zoeken')
  const scanKlaar = kaartFase === 'klaar' && !!totaalDak
  const hoofd = hoofdGebouw(perceelSelectie?.gebouwen)
  const nokhoogte = (hoofd?.scan?.meetbaar ? hoofd.scan.nokhoogte : null) ?? hoofd?.hoogte3d?.nokhoogte ?? meting?.hoogte3d?.nokhoogte ?? null
  const daktype = hoofd?.hoogte3d?.gebouwType ?? meting?.hoogte3d?.gebouwType ?? null

  // Prijsmodel: maten uit de dakscan, werken (keuze of standaard per dakvorm) en antwoorden
  const maten = meetellend?.length
    ? dakMaten(meetellend)
    : { hellend: totaalDak ?? 0, plat: 0, nokhoogte, gootlengte: null, zonM2: 0 }
  const werken = werkKeuze ?? gekozenWerken(maten, {})
  const prijs = berekenPrijs(maten, { ...antwoorden, werken })
  const beschikbareWerken: Werk[] = [
    ...(maten.hellend >= 5 ? (['dakbedekking', 'isolatie'] as Werk[]) : []),
    ...(maten.plat >= 5 ? (['plat_dak'] as Werk[]) : []),
    'goten', 'lekkage',
  ]

  async function selecteerAdres(adres: string) {
    setAdresWaarde(adres)
    setMeting(null)
    setPerceelSelectie(null)
    setAntwoorden({})
    setWerkKeuze(null)
    setVerfijnd(false)
    setMetingBezig(true)
    setStap('scan')
    try {
      const res = await fetch(`/api/dakmeting?adres=${encodeURIComponent(adres)}&snel=1`)
      if (res.ok) setMeting(await res.json())
    } catch { /* stil falen */ }
    setMetingBezig(false)
  }

  // Adres gekozen op de homepage: meteen naar de kaart
  const laatsteStart = useRef<number | null>(null)
  useEffect(() => {
    if (!startVerzoek || laatsteStart.current === startVerzoek.id) return
    laatsteStart.current = startVerzoek.id
    void selecteerAdres(startVerzoek.adres)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startVerzoek])

  // ── Stap-overgangen ─────────────────────────────────────────────
  function onPerceelSelect(data: PerceelSelectie) {
    setPerceelSelectie(data)
  }

  function naarPrijs() {
    setStap('prijs')
    if (!DRIE_D_AAN) return

    // 3D staat uit (lib/instellingen.ts). Aan: het 3D-model wordt op de achtergrond gemaakt voor het rapport.
    // In de funnel tonen we het niet: de 2D-meting is sneller en betrouwbaarder.
    const capakey = perceelSelectie?.capakey ?? meting?.capakey
    const gebouwenPayload = (perceelSelectie?.gebouwen ?? [])
      .filter((g) => g.grenzen && g.grenzen.length >= 3)
      .map((g) => ({
        footprint_wgs84: g.grenzen,
        nokhoogte: g.hoogte3d?.nokhoogte ?? null,
        gebouwType: g.hoogte3d?.gebouwType ?? null,
      }))
    if (!capakey || gebouwenPayload.length === 0) return

    void fetch('/api/lod2/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capakey, gebouwen: gebouwenPayload }),
    }).catch(() => { /* rapport valt terug op 2D */ })
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
            bouwjaar: antwoorden.bouwjaar,
            type_werken: werken.map((w) => WERK_NAAR_TYPE[w]),
            lekkage_recent: werken.includes('lekkage') ? 'ja' : undefined,
            dak_data: {
              antwoorden: { ...antwoorden, werken },
              verfijnd,
              prijs: { min: prijs.min, max: prijs.max, nauwkeurigheid: prijs.nauwkeurigheid, regels: prijs.regels.map((r) => ({ werk: r.werk, naam: r.naam, min: r.min, max: r.max })) },
              capakey: perceelSelectie?.capakey ?? meting?.capakey,
              perceelnummer: perceelSelectie?.perceelnummer ?? meting?.perceelnummer,
              oppervlakte: totaalDak,
              nokhoogte,
              daktype,
              aantalGebouwen,
              gebouwen: (meetellend ?? []).map((g) => ({
                id: g.id,
                woning: !!g.aangeduid,
                grondOppervlak: g.oppervlakte,
                dakOppervlak: g.dakOppervlak ?? g.oppervlakte,
                dakvorm: g.scan?.meetbaar ? g.scan.dakvorm : null,
              })),
              erfgoed: erfgoedVan(perceelSelectie?.gebouwen ?? []),
              dakscan: hoofd?.scan?.meetbaar ? {
                dakvorm: hoofd.scan.dakvorm,
                helling: hoofd.scan.helling,
                nokhoogte: hoofd.scan.nokhoogte,
                vlakken: hoofd.scan.vlakken.map((v) => ({ richting: v.richting, helling: v.helling, dakOppervlak: v.dakOppervlak })),
                bron: hoofd.scan.bron,
              } : null,
              lat: meting?.lat ?? null,
              lng: meting?.lng ?? null,
            },
          },
        }),
      })
      if (!res.ok) throw new Error('Submit mislukt')
      setStap('telefoon')
    } catch {
      setEmailFout('Uw rapport kon niet verstuurd worden. Controleer uw internetverbinding en probeer het opnieuw.')
    } finally {
      setBezig(false)
    }
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
  const hoofdstap = HOOFDSTAP[stap]
  const voortgang = hoofdstap ? (hoofdstap / AANTAL_HOOFDSTAPPEN) * 100 : 100
  const voortgangLabel = hoofdstap
    ? `Stap ${hoofdstap} van ${AANTAL_HOOFDSTAPPEN}`
    : stap === 'klaar' ? 'Klaar' : 'Extra · optioneel'

  // Terug-knop. Na het versturen van het rapport (telefoon, klaar) niet meer terug naar het formulier.
  const VORIGE: Partial<Record<Stap, Stap>> = { scan: 'adres', prijs: 'scan', verfijnen: 'prijs', email: verfijnd ? 'verfijnen' : 'prijs' }
  const vorigeStap: Stap | null = VORIGE[stap] ?? null

  function gaTerug() {
    if (vorigeStap) setStap(vorigeStap)
  }


  return (
    <div ref={paneelRef} className="w-full max-w-2xl mx-auto scroll-mt-8 bg-white rounded-2xl shadow-2xl">
      {/* Voortgangsbalk + terug-knop */}
      <div className="pl-5 pr-14 pt-5 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
          <div className="flex items-center gap-2">
            {vorigeStap && (
              <button
                type="button"
                onClick={gaTerug}
                className="text-gray-500 hover:text-navy transition-colors"
                aria-label="Vorige stap"
              >
                ← Vorige
              </button>
            )}
            <span>{voortgangLabel}</span>
          </div>
          {stap !== 'klaar' && <span className="text-navy">{STAP_LABELS[stap]}</span>}
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-navy transition-all duration-500 ease-out"
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
                Waar staat uw woning?
              </h2>
              <p className="text-sm text-gray-600">
                Vul uw adres in. U ziet meteen de luchtfoto van uw perceel.
              </p>
            </div>

            <AdresZoeker label="Adres van uw woning" onKies={(adres) => void selecteerAdres(adres)} />

            <ul className="text-xs text-gray-600 space-y-1 pt-2">
              {['Meteen zichtbaar op de kaart', 'Gegevens van de Vlaamse overheid', 'Gratis, zonder account'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 flex-shrink-0 text-navy" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ─── Stap 2 — Dakscan op de kaart ─── */}
        {stap === 'scan' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-navy mb-1">
                {kaartFase === 'klaar' ? 'Is dit uw woning?' : kaartFase === 'leeg' ? 'Tik op uw woning' : 'We meten uw dak'}
              </h2>
              <p className="text-sm text-slate-600">
                {kaartFase === 'klaar'
                  ? (perceelSelectie?.gebouwen.length ?? 0) > 1
                    ? 'Garage of bijgebouw meetellen? Tik erop of vink het aan. Verkeerde woning? Tik op het juiste dak.'
                    : 'Staat de verkeerde woning aangeduid? Tik dan op de kaart op het juiste dak.'
                  : kaartFase === 'leeg'
                    ? 'Tik op de kaart op het dak van uw woning.'
                    : 'Met de luchtfoto en de laserhoogtemeting van de Vlaamse overheid.'}
              </p>
            </div>

            {meting && meting.lat && meting.lng ? (
              <DakKaart
                key={`${meting.lat}-${meting.lng}`}
                lat={meting.lat}
                lng={meting.lng}
                onPerceelSelect={onPerceelSelect}
                onFase={setKaartFase}
              />
            ) : (
              <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-600">
                {metingBezig ? 'Uw adres wordt opgezocht…' : 'Voor dit adres vonden we geen kaartgegevens. Probeer een ander adres.'}
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
                onClick={naarPrijs}
                disabled={!scanKlaar}
                className="flex-1 rounded-lg bg-amber px-4 py-3 text-sm font-bold text-navy hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition-[filter]"
              >
                {scanKlaar ? 'Bekijk wat het kost →' : kaartFase === 'leeg' ? 'Tik eerst op uw dak' : 'Uw dak wordt gemeten…'}
              </button>
            </div>
          </div>
        )}

        {/* ─── Stap 3 — Prijs ─── */}
        {stap === 'prijs' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-navy">Wat kost uw dak?</h2>
              <p className="mt-1 text-sm text-slate-600">
                Berekend uit uw gemeten dak ({totaalDak ? `±${totaalDak.toLocaleString('nl-BE')} m²` : 'oppervlakte'}) en gangbare prijzen.
              </p>
            </div>

            <WerkKeuze gekozen={werken} beschikbaar={beschikbareWerken} onChange={setWerkKeuze} />

            <PrijsKaart prijs={prijs} titel={werken.length > 1 ? 'Samen, indicatief' : `${prijs.regels[0]?.naam ?? 'Uw dak'}, indicatief`} metRegels />

            <div className="space-y-2">
              <button
                onClick={() => setStap('verfijnen')}
                className="w-full rounded-xl bg-amber px-4 py-3.5 font-bold text-navy transition-[filter] hover:brightness-95"
              >
                Maak mijn prijs nauwkeuriger
                <span className="block text-xs font-semibold text-navy/75">{`${vragenVoor(werken).length} korte vragen · ±1 minuut`}</span>
              </button>
              <button
                onClick={() => setStap('email')}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-navy transition-colors hover:border-navy"
              >
                Stuur mij het algemene rapport
              </button>
            </div>
          </div>
        )}

        {/* ─── Stap 3b — Prijs verfijnen (optioneel, vóór het e-mailadres) ─── */}
        {stap === 'verfijnen' && (
          <Vragenstroom
            maten={maten}
            werken={werken}
            antwoorden={antwoorden}
            onAntwoord={setAntwoorden}
            onVraag={(v: Vraag) => log(`vraag_${v}`)}
            onKlaar={() => { setVerfijnd(true); log('verfijnd'); setStap('email') }}
          />
        )}

        {/* ─── Stap 4 — Email ─── */}
        {stap === 'email' && (
          <form onSubmit={submitEmail} className="space-y-4">
            <PrijsKaart prijs={prijs} titel={verfijnd ? 'Uw persoonlijke prijs' : 'Uw prijsindicatie'} compact />

            <div>
              <h2 className="text-xl font-bold text-navy mb-1">
                {verfijnd ? 'Bewaar uw prijs en ontvang uw rapport' : 'Waar mogen we uw rapport sturen?'}
              </h2>
              <p className="text-sm text-slate-600">
                U krijgt meteen een e-mail met de link naar uw rapport{verfijnd ? ', met uw persoonlijke prijs en alle details' : ''}.
              </p>
            </div>

            {verfijnd && inzichten(maten, { ...antwoorden, werken }, prijs).length > 0 && (
              <ul className="space-y-1.5 text-sm text-navy">
                {inzichten(maten, { ...antwoorden, werken }, prijs).map((i) => (
                  <li key={i.titel} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber" aria-hidden />
                    {i.titel}
                  </li>
                ))}
              </ul>
            )}

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
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-gray-900 outline-none focus:border-navy focus:ring-2 focus:ring-navy/25"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="mt-0.5 accent-navy"
                checked={gdpr}
                onChange={(e) => setGdpr(e.target.checked)}
              />
              <span>
                Ik ga akkoord met de <a href="/privacy" className="text-navy underline">privacyverklaring</a>.
              </span>
            </label>

            {emailFout && <p role="alert" className="text-sm text-red-700">{emailFout}</p>}

            <button
              type="submit"
              disabled={bezig}
              className="w-full rounded-lg bg-amber px-4 py-3.5 text-sm font-bold text-navy hover:brightness-95 disabled:opacity-60 transition-[filter]"
            >
              {bezig ? 'Bezig…' : 'Stuur mijn rapport →'}
            </button>

          </form>
        )}

        {/* ─── Stap 6 — Telefoon ─── */}
        {stap === 'telefoon' && (
          <form onSubmit={submitTelefoon} className="space-y-4">
            <p role="status" className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-navy">
              <Check className="h-4 w-4 flex-shrink-0 text-amber" aria-hidden />
              Uw rapport is onderweg naar {email}.
            </p>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Uw rapport bespreken met een dakwerker?</h2>
              <p className="text-sm text-gray-600">
                Een gecertificeerde dakwerker uit ons netwerk overloopt uw rapport met u aan de telefoon.
              </p>
            </div>

            <ul className="text-xs text-gray-600 space-y-1">
              {['Geen kosten', 'Geen verplichting', 'U kiest zelf wanneer u gebeld wordt'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 flex-shrink-0 text-navy" aria-hidden />
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
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-gray-900 outline-none focus:border-navy focus:ring-2 focus:ring-navy/25"
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
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-gray-900 outline-none focus:border-navy focus:ring-2 focus:ring-navy/25"
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
                        ? 'border-amber bg-orange-50 text-navy font-semibold'
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
              className="w-full rounded-lg bg-amber px-4 py-3.5 text-sm font-bold text-navy hover:brightness-95 disabled:opacity-60 transition-[filter]"
            >
              {bezig ? 'Bezig…' : 'Bel mij gratis terug'}
            </button>

            <p className="text-center text-xs text-gray-600">
              We geven uw naam en nummer door aan een dakwerker uit ons netwerk, zodat die u kan bellen.
              Meer daarover in de <a href="/privacy" className="underline underline-offset-2">privacyverklaring</a>.
            </p>

            <a
              href={`/rapport/${sessionId}`}
              target="_blank"
              rel="noopener"
              className="block min-h-11 text-center text-sm font-semibold text-navy underline underline-offset-2"
            >
              Liever niet gebeld? Bekijk meteen uw rapport
            </a>
          </form>
        )}

        {/* ─── Stap 7 — Klaar ─── */}
        {stap === 'klaar' && (
          <div className="text-center space-y-4 py-4">
            <CircleCheck className="mx-auto h-12 w-12 text-navy" aria-hidden />
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
              className="inline-flex items-center gap-2 rounded-lg bg-amber px-5 py-3 text-sm font-bold text-navy hover:brightness-95 transition-[filter]"
            >
              Bekijk uw dakrapport
            </a>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Rapport verstuurd</p>
              <p className="text-sm text-navy">
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
