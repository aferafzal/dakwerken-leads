'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, HelpCircle, Info, Minus, Plus } from 'lucide-react'
import {
  berekenPrijs,
  inzichten,
  vragenVoor,
  type Antwoorden,
  type DakMaten,
  type Inzicht,
  type Materiaal,
  type Prijsresultaat,
  type Vraag,
  type Werk,
} from '@/lib/prijsmodel'
import DakDoorsnede from '@/components/DakDoorsnede'

export type Maten = DakMaten & { zonM2: number }

const euro = (n: number) => `€${Math.round(n).toLocaleString('nl-BE')}`

// Getallen die zichtbaar naar hun nieuwe waarde tellen (niet bij "minder beweging")
function useTelOp(doel: number, duur = 550): number {
  const [waarde, setWaarde] = useState(doel)
  const vorige = useRef(doel)
  useEffect(() => {
    const van = vorige.current
    vorige.current = doel
    if (van === doel || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setWaarde(doel)
      return
    }
    const start = performance.now()
    let frame = 0
    const stap = (nu: number) => {
      const t = Math.min(1, (nu - start) / duur)
      const e = 1 - Math.pow(1 - t, 3)
      setWaarde(van + (doel - van) * e)
      if (t < 1) frame = requestAnimationFrame(stap)
    }
    frame = requestAnimationFrame(stap)
    return () => cancelAnimationFrame(frame)
  }, [doel, duur])
  return waarde
}

// ─── Prijs met nauwkeurigheidsmeter ────────────────────────────────

export function PrijsKaart({ prijs, titel, metRegels = false, winst = 0, compact = false }: {
  prijs: Prijsresultaat
  titel: string
  metRegels?: boolean
  winst?: number
  compact?: boolean
}) {
  const min = useTelOp(prijs.min)
  const max = useTelOp(prijs.max)
  const zekerheid = useTelOp(prijs.zekerheid)
  return (
    <div className={`rounded-2xl bg-navy text-white ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
      <p className="text-sm text-white/75">{titel}</p>
      <p className={`mt-0.5 font-black tabular-nums tracking-tight ${compact ? 'text-2xl' : 'text-3xl sm:text-4xl'}`}>
        {euro(Math.round(min / 100) * 100)} – {euro(Math.round(max / 100) * 100)}
      </p>
      <p className="text-xs text-white/60">{prijs.btwInbegrepen ? 'incl. btw' : 'excl. btw'} · indicatief</p>

      <div className="mt-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">Nauwkeurigheid</span>
          <span className="flex items-baseline gap-2 tabular-nums">
            {winst > 0 && (
              <span key={prijs.nauwkeurigheid} className="meter-winst rounded-full bg-amber px-2 py-0.5 text-xs font-bold text-navy">
                +{winst}%
              </span>
            )}
            <span className="font-bold">±{Math.round(100 - zekerheid)}%</span>
          </span>
        </div>
        <div
          role="meter"
          aria-label="Nauwkeurigheid van de prijs"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={prijs.zekerheid}
          aria-valuetext={`Prijs op ±${prijs.nauwkeurigheid}% nauwkeurig`}
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15"
        >
          <div className="h-full rounded-full bg-amber" style={{ width: `${zekerheid}%` }} />
        </div>
      </div>

      {metRegels && prijs.regels.length > 1 && (
        <ul className="mt-5 space-y-2 border-t border-white/15 pt-4 text-sm">
          {prijs.regels.map((r) => (
            <li key={r.werk} className="flex items-baseline justify-between gap-3">
              <span>
                <span className="font-semibold">{r.naam}</span>
                <span className="block text-xs text-white/65">{r.uitleg}</span>
              </span>
              <span className="whitespace-nowrap font-semibold tabular-nums">{euro(r.min)} – {euro(r.max)}</span>
            </li>
          ))}
        </ul>
      )}
      <style jsx>{`
        @media (prefers-reduced-motion: no-preference) {
          .meter-winst { animation: winst-in 700ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        }
        @keyframes winst-in {
          from { opacity: 0; transform: translateY(6px) scale(0.9); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  )
}

// ─── Welke werken? ─────────────────────────────────────────────────

export const WERK_LABEL: Record<Werk, string> = {
  dakbedekking: 'Dakbedekking vernieuwen',
  isolatie: 'Dak isoleren',
  plat_dak: 'Plat dak vernieuwen',
  goten: 'Dakgoten',
  lekkage: 'Lekkage',
  advies: 'Advies',
}

export function WerkKeuze({ gekozen, beschikbaar, onChange }: { gekozen: Werk[]; beschikbaar: Werk[]; onChange: (w: Werk[]) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-navy">Waarvoor wilt u een prijs?</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {beschikbaar.map((w) => {
          const aan = gekozen.includes(w)
          return (
            <button
              key={w}
              type="button"
              aria-pressed={aan}
              onClick={() => {
                const nieuw = aan ? gekozen.filter((x) => x !== w) : [...gekozen, w]
                if (nieuw.length) onChange(nieuw)
              }}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors ${
                aan ? 'border-navy bg-navy text-white' : 'border-slate-300 text-navy hover:border-navy'
              }`}
            >
              {aan && <Check className="h-4 w-4" aria-hidden />}
              {WERK_LABEL[w]}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

// ─── De vragen ─────────────────────────────────────────────────────

const TEKST: Record<Vraag, { titel: string; waarom: string }> = {
  materiaal: { titel: 'Wat ligt er nu op uw dak?', waarom: 'Elk materiaal heeft een andere prijs. Kunstleien en golfplaten van vóór 2001 kunnen asbest bevatten.' },
  bouwjaar: { titel: 'Wanneer is uw woning gebouwd?', waarom: 'Belangrijk voor de btw, premies en asbest.' },
  isolatie: { titel: 'Is uw dak nu geïsoleerd?', waarom: 'Bepaalt of er isolatie nodig is, en hoeveel.' },
  zolder: { titel: 'Is uw zolder bewoond of afgewerkt?', waarom: 'Langs binnen isoleren kost meer als de zolder al afgewerkt is.' },
  aansluitingen: { titel: 'Wat zit er in uw dak?', waarom: 'Elk dakraam, elke dakkapel en schoorsteen moet opnieuw waterdicht aangesloten worden.' },
  zonnepanelen: { titel: 'Liggen er zonnepanelen op uw dak?', waarom: 'Die moeten eraf en terug tijdens de werken.' },
  woningtype: { titel: 'Wat voor woning is het?', waarom: 'Bepaalt hoe de steiger geplaatst wordt.' },
  goot: { titel: 'Wat voor dakgoot heeft u?', waarom: 'Zink, PVC en bakgoten verschillen sterk in prijs.' },
  start: { titel: 'Wanneer wilt u starten?', waarom: 'Verandert de prijs niet, maar helpt een dakwerker u te plannen.' },
}

type Optie<T extends string> = { waarde: T; label: string; beeld?: string }

const MATERIALEN_HELLEND: Optie<Materiaal>[] = [
  { waarde: 'betonpannen', label: 'Betonpannen', beeld: '/materialen/betonpannen.jpg' },
  { waarde: 'keramische_pannen', label: 'Keramische pannen', beeld: '/materialen/keramische_pannen.jpg' },
  { waarde: 'natuurleien', label: 'Natuurleien', beeld: '/materialen/natuurleien.jpg' },
  { waarde: 'kunstleien', label: 'Kunstleien', beeld: '/materialen/kunstleien.jpg' },
  { waarde: 'golfplaten', label: 'Golfplaten', beeld: '/materialen/golfplaten.jpg' },
]
const MATERIALEN_PLAT: Optie<Materiaal>[] = [
  { waarde: 'epdm', label: 'EPDM (rubber)', beeld: '/materialen/epdm.jpg' },
  { waarde: 'roofing', label: 'Roofing', beeld: '/materialen/roofing.jpg' },
  { waarde: 'zink', label: 'Zink', beeld: '/materialen/zink.jpg' },
]

const KEUZES: Partial<Record<Vraag, Optie<string>[]>> = {
  bouwjaar: [
    { waarde: 'voor_1980', label: 'Vóór 1980' },
    { waarde: '1980_2000', label: '1980 – 2000' },
    { waarde: '2000_2015', label: '2000 – 2015' },
    { waarde: 'na_2015', label: 'Na 2015' },
    { waarde: 'onbekend', label: 'Weet ik niet' },
  ],
  isolatie: [
    { waarde: 'geen', label: 'Nee, niet geïsoleerd' },
    { waarde: 'beetje', label: 'Een beetje' },
    { waarde: 'goed', label: 'Ja, goed geïsoleerd' },
    { waarde: 'weet_niet', label: 'Weet ik niet' },
  ],
  zolder: [
    { waarde: 'bewoond', label: 'Ja, bewoond of afgewerkt' },
    { waarde: 'niet_bewoond', label: 'Nee' },
    { waarde: 'weet_niet', label: 'Weet ik niet' },
  ],
  woningtype: [
    { waarde: 'vrijstaand', label: 'Vrijstaand' },
    { waarde: 'halfopen', label: 'Halfopen' },
    { waarde: 'rij', label: 'Rijwoning' },
    { waarde: 'weet_niet', label: 'Weet ik niet' },
  ],
  goot: [
    { waarde: 'zink', label: 'Zinken goot' },
    { waarde: 'pvc', label: 'PVC-goot' },
    { waarde: 'bakgoot', label: 'Bakgoot (in de dakrand)' },
    { waarde: 'weet_niet', label: 'Weet ik niet' },
  ],
  start: [
    { waarde: 'zo_snel_mogelijk', label: 'Zo snel mogelijk' },
    { waarde: 'binnen_3_maanden', label: 'Binnen drie maanden' },
    { waarde: 'dit_jaar', label: 'Later dit jaar' },
    { waarde: 'orienterend', label: 'Ik oriënteer me nog' },
  ],
}

const SLEUTEL: Partial<Record<Vraag, keyof Antwoorden>> = {
  materiaal: 'materiaal', bouwjaar: 'bouwjaar', isolatie: 'isolatie', zolder: 'zolder',
  woningtype: 'woningtype', goot: 'goot', start: 'start',
}

function Teller({ label, waarde, onChange }: { label: string; waarde: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="font-semibold text-navy">{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" aria-label={`${label}: één minder`} disabled={waarde <= 0} onClick={() => onChange(waarde - 1)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 text-navy transition-colors hover:border-navy disabled:opacity-40">
          <Minus className="h-4 w-4" aria-hidden />
        </button>
        <span className="w-10 text-center text-lg font-bold tabular-nums text-navy" aria-live="polite">{waarde}</span>
        <button type="button" aria-label={`${label}: één meer`} onClick={() => onChange(Math.min(waarde + 1, 60))}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 text-navy transition-colors hover:border-navy">
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}

export function Vragenstroom({ maten, werken, antwoorden, onAntwoord, onVraag, onKlaar }: {
  maten: Maten
  werken: Werk[]
  antwoorden: Antwoorden
  onAntwoord: (a: Antwoorden) => void
  onVraag?: (v: Vraag) => void
  onKlaar: () => void
}) {
  const vragen = vragenVoor(werken)
  const [index, setIndex] = useState(0)
  const [fase, setFase] = useState<'kiezen' | 'feedback'>('kiezen')
  const [winst, setWinst] = useState(0)
  const [nieuweInzichten, setNieuweInzichten] = useState<Inzicht[]>([])
  const [tellers, setTellers] = useState({ dakramen: antwoorden.dakramen ?? 0, dakkapellen: antwoorden.dakkapellen ?? 0, schoorstenen: antwoorden.schoorstenen ?? 0 })
  const [panelen, setPanelen] = useState<number | null>(antwoorden.zonnepanelen && antwoorden.zonnepanelen > 0 ? antwoorden.zonnepanelen : null)
  const feedbackRef = useRef<HTMLDivElement>(null)
  const bovenRef = useRef<HTMLDivElement>(null)

  // Elke nieuwe vraag begint bovenaan (anders verdwijnt de vraag onder de prijskaart)
  useEffect(() => {
    bovenRef.current?.scrollIntoView({ block: 'start' })
  }, [index])

  // De doorsnede alvast laden, zodat ze er meteen staat bij de isolatievraag
  const metDoorsnede = werken.includes('isolatie')
  useEffect(() => {
    if (metDoorsnede) new Image().src = '/doorsnede-dak.jpg'
  }, [metDoorsnede])

  const vraag = vragen[Math.min(index, vragen.length - 1)]
  const prijs = berekenPrijs(maten, { ...antwoorden, werken })
  const laatste = index >= vragen.length - 1

  function beantwoord(extra: Partial<Antwoorden>) {
    const voor = berekenPrijs(maten, { ...antwoorden, werken })
    const nieuw = { ...antwoorden, ...extra, werken }
    const na = berekenPrijs(maten, nieuw)
    const oud = inzichten(maten, { ...antwoorden, werken }, voor).map((i) => i.titel)
    setNieuweInzichten(inzichten(maten, nieuw, na).filter((i) => !oud.includes(i.titel)))
    setWinst(Math.max(0, voor.nauwkeurigheid - na.nauwkeurigheid))
    onAntwoord(nieuw)
    onVraag?.(vraag)
    setFase('feedback')
    // Het feedbackpaneel in beeld brengen op kleine schermen
    requestAnimationFrame(() => feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  }

  function volgende() {
    setWinst(0)
    setNieuweInzichten([])
    if (laatste) { onKlaar(); return }
    setIndex(index + 1)
    setFase('kiezen')
  }

  function overslaan() {
    onVraag?.(vraag)
    volgende()
  }

  const gekozen = (waarde: string) => {
    const s = SLEUTEL[vraag]
    return s ? antwoorden[s] === waarde : false
  }

  const optieKlasse = (aan: boolean) =>
    `flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-[15px] font-semibold transition-colors ${
      aan ? 'border-amber bg-orange-50 text-navy ring-1 ring-amber' : 'border-slate-200 text-navy hover:border-slate-400'
    }`

  const materialen = maten.hellend >= maten.plat ? MATERIALEN_HELLEND : MATERIALEN_PLAT

  return (
    <div ref={bovenRef} className="scroll-mt-4 space-y-5">
      {/* Prijs en meter blijven in beeld */}
      <div className="sticky top-0 z-10 -mx-1 bg-white px-1 pb-1">
        <PrijsKaart prijs={prijs} titel="Uw prijsindicatie" winst={winst} compact />
      </div>

      <div>
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>Vraag {index + 1} van {vragen.length}</span>
          {fase === 'kiezen' && (
            <button type="button" onClick={overslaan} className="min-h-11 px-2 text-slate-600 underline underline-offset-2 hover:text-navy">
              Overslaan
            </button>
          )}
        </div>
        <div className="mt-1 flex gap-1" aria-hidden>
          {vragen.map((v, i) => (
            <span key={v} className={`h-1.5 flex-1 rounded-full ${i < index || (i === index && fase === 'feedback') ? 'bg-amber' : 'bg-slate-200'}`} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-navy text-balance">{TEKST[vraag].titel}</h2>
        <p className="mt-1 flex gap-1.5 text-sm text-slate-600">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
          {TEKST[vraag].waarom}
        </p>
      </div>

      {vraag === 'isolatie' && metDoorsnede && (
        <div>
          <DakDoorsnede nadruk={['isolatie']} klein />
          <p className="mt-3 text-sm text-slate-700">
            <span className="font-semibold text-navy">Kijk op zolder tussen de kepers.</span> Ziet u alleen de onderkant van de pannen
            of een folie? Dan is uw dak waarschijnlijk niet geïsoleerd. Is de zolder afgewerkt met platen, dan zit er vaak isolatie achter.
          </p>
        </div>
      )}

      {/* Antwoorden */}
      {vraag === 'materiaal' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[...materialen, { waarde: 'weet_niet' as Materiaal, label: 'Weet ik niet' }].map((o) => {
            const aan = antwoorden.materiaal === o.waarde
            return (
              <button key={o.waarde} type="button" aria-pressed={aan} onClick={() => beantwoord({ materiaal: o.waarde })}
                className={`group overflow-hidden rounded-xl border text-left transition-colors ${aan ? 'border-amber ring-2 ring-amber' : 'border-slate-200 hover:border-slate-400'}`}>
                {o.beeld ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.beeld} alt="" className="aspect-[3/2] w-full object-cover" loading="lazy" />
                ) : (
                  <span className="flex aspect-[3/2] w-full items-center justify-center bg-slate-100 text-slate-500">
                    <HelpCircle className="h-8 w-8" aria-hidden />
                  </span>
                )}
                <span className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold text-navy">
                  {o.label}
                  {aan && <Check className="h-4 w-4 flex-shrink-0 text-amber" aria-hidden />}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {KEUZES[vraag] && (
        <div className="space-y-2">
          {KEUZES[vraag]!.map((o) => {
            const aan = gekozen(o.waarde)
            return (
              <button key={o.waarde} type="button" aria-pressed={aan} className={optieKlasse(aan)}
                onClick={() => beantwoord({ [SLEUTEL[vraag]!]: o.waarde } as Partial<Antwoorden>)}>
                {o.label}
                {aan && <Check className="h-5 w-5 flex-shrink-0 text-amber" aria-hidden />}
              </button>
            )
          })}
        </div>
      )}

      {vraag === 'aansluitingen' && (
        <div>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
            <Teller label="Dakramen" waarde={tellers.dakramen} onChange={(n) => setTellers({ ...tellers, dakramen: n })} />
            <Teller label="Dakkapellen" waarde={tellers.dakkapellen} onChange={(n) => setTellers({ ...tellers, dakkapellen: n })} />
            <Teller label="Schoorstenen" waarde={tellers.schoorstenen} onChange={(n) => setTellers({ ...tellers, schoorstenen: n })} />
          </div>
          {fase === 'kiezen' && (
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => beantwoord({ dakramen: null, dakkapellen: null, schoorstenen: null })}
                className="min-h-12 flex-1 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-navy hover:border-navy">
                Weet ik niet
              </button>
              <button type="button" onClick={() => beantwoord({ ...tellers })}
                className="min-h-12 flex-1 rounded-xl bg-navy px-4 text-sm font-bold text-white hover:brightness-110">
                Klopt
              </button>
            </div>
          )}
        </div>
      )}

      {vraag === 'zonnepanelen' && (
        <div className="space-y-2">
          <button type="button" aria-pressed={antwoorden.zonnepanelen === 0} className={optieKlasse(antwoorden.zonnepanelen === 0)}
            onClick={() => { setPanelen(null); beantwoord({ zonnepanelen: 0 }) }}>
            Nee
            {antwoorden.zonnepanelen === 0 && <Check className="h-5 w-5 text-amber" aria-hidden />}
          </button>
          <div className={`rounded-xl border ${panelen !== null ? 'border-amber ring-1 ring-amber' : 'border-slate-200'}`}>
            <button type="button" aria-expanded={panelen !== null} onClick={() => setPanelen(panelen ?? 10)}
              className="flex min-h-12 w-full items-center px-4 py-3 text-left text-[15px] font-semibold text-navy">
              Ja
            </button>
            {panelen !== null && (
              <div className="border-t border-slate-100 px-4 pb-3">
                <Teller label="Aantal panelen" waarde={panelen} onChange={setPanelen} />
                <button type="button" onClick={() => beantwoord({ zonnepanelen: panelen })}
                  className="min-h-12 w-full rounded-xl bg-navy px-4 text-sm font-bold text-white hover:brightness-110">
                  Klopt
                </button>
              </div>
            )}
          </div>
          <button type="button" aria-pressed={antwoorden.zonnepanelen === null} className={optieKlasse(antwoorden.zonnepanelen === null)}
            onClick={() => { setPanelen(null); beantwoord({ zonnepanelen: null }) }}>
            Weet ik niet
          </button>
        </div>
      )}

      {/* Directe beloning na elk antwoord */}
      {fase === 'feedback' && (
        <div ref={feedbackRef} role="status" aria-live="polite" className="feedback-paneel space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="flex items-center gap-2 font-semibold text-navy">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber text-navy">
              <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
            </span>
            {winst > 0 ? `Uw prijs is ${winst}% nauwkeuriger` : 'Genoteerd'}
          </p>
          {nieuweInzichten.map((i) => (
            <div key={i.titel} className="rounded-xl bg-white p-3 text-sm shadow-sm">
              <p className="font-semibold text-navy">{i.titel}</p>
              <p className="mt-0.5 text-slate-700">{i.tekst}</p>
            </div>
          ))}
          <button type="button" onClick={volgende}
            className="min-h-12 w-full rounded-xl bg-amber px-4 font-bold text-navy transition-[filter] hover:brightness-95">
            {laatste ? 'Bekijk mijn persoonlijke prijs' : 'Volgende vraag'}
          </button>
        </div>
      )}

      {index > 0 && fase === 'kiezen' && (
        <button type="button" onClick={() => { setIndex(index - 1); setFase('kiezen') }} className="min-h-11 text-sm text-slate-600 hover:text-navy">
          ← Vorige vraag
        </button>
      )}

      <style jsx>{`
        @media (prefers-reduced-motion: no-preference) {
          .feedback-paneel { animation: paneel-in 320ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        }
        @keyframes paneel-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  )
}
