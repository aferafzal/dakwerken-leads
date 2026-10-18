'use client'

import { useState } from 'react'

// ─────────────────────────────────────────────────────────────
// "Zo ziet uw resultaat eruit" — een voorbeeldwoning (geen echte meting)
// met klikbare dakvlakken. Kosten volgen dezelfde berekening als het
// rapport: totale dakoppervlakte × marktprijs per m² (zie rapportpagina).
// ─────────────────────────────────────────────────────────────

const NAVY = 'hsl(222 47% 11%)'
const AMBER = 'hsl(25 95% 53%)'
const AMBER_DONKER = '#c2410c'
const TEKST_GEDEMPT = 'hsl(215 19% 35%)'

type Vlak = 'A' | 'B' | 'C'

const VLAKKEN: Record<Vlak, { label: string; info: string }> = {
  A: { label: 'Dakvlak A', info: 'Dakvlak A · 53,6 m² · helling 40° · noordkant' },
  B: { label: 'Dakvlak B', info: 'Dakvlak B · 53,6 m² · helling 40° · zuidkant' },
  C: { label: 'Aanbouw C', info: 'Aanbouw C · 10,1 m² · plat dak' },
}

const TOTAAL_M2 = 117 // 53,6 + 53,6 + 10,1 (afgerond)

// Zelfde marktprijzen als het rapport (KOSTEN_RANGES op de rapportpagina)
const KOSTEN = [
  { werk: 'Pannen vervangen', min: 80, max: 120 },
  { werk: 'Dak isoleren',     min: 90, max: 150 },
]

const eur = (n: number) => `€${Math.round(n).toLocaleString('nl-BE')}`

export default function VoorbeeldResultaat({ onStart }: { onStart: () => void }) {
  const [vlak, setVlak] = useState<Vlak | null>(null)

  const kies = (v: Vlak) => setVlak((huidig) => (huidig === v ? null : v))
  const vulling = (v: Vlak) => (!vlak ? '#ffffff' : vlak === v ? 'hsl(25 95% 53% / 0.18)' : '#f1f2f3')
  const lijn = (v: Vlak) => (vlak === v ? AMBER_DONKER : vlak ? '#9aa1a6' : NAVY)
  const dikte = (v: Vlak) => (vlak === v ? 3 : 1.5)

  return (
    <section id="voorbeeld" className="px-4 py-24 sm:px-6 sm:py-28 lg:px-8" style={{ background: 'hsl(40 33% 98%)' }}>
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-12 lg:gap-y-0">

        {/* ── Intro ── */}
        <div className="order-1 lg:order-none lg:col-start-1 lg:row-start-1">
          <h2 className="text-4xl font-black leading-tight text-balance sm:text-5xl" style={{ color: NAVY }}>
            Zo ziet uw rapport eruit
          </h2>
          <p className="mt-5 text-base leading-relaxed sm:text-lg" style={{ color: TEKST_GEDEMPT }}>
            Een voorbeeld. Klik op een dakvlak.
          </p>
        </div>

        {/* ── Cijfers, kosten en knop ── */}
        <div className="order-3 lg:order-none lg:col-start-1 lg:row-start-2">
          <dl className="grid grid-cols-3 gap-3 border-y py-5 lg:mt-8" style={{ borderColor: 'hsl(220 13% 85%)' }}>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider" style={{ color: TEKST_GEDEMPT }}>Oppervlakte</dt>
              <dd className="mt-1 text-xl font-black tabular-nums sm:text-2xl" style={{ color: NAVY }}>±{TOTAAL_M2} m²</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider" style={{ color: TEKST_GEDEMPT }}>Nokhoogte</dt>
              <dd className="mt-1 text-xl font-black tabular-nums sm:text-2xl" style={{ color: NAVY }}>9,85 m</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider" style={{ color: TEKST_GEDEMPT }}>Dakvlakken</dt>
              <dd className="mt-1 text-xl font-black tabular-nums sm:text-2xl" style={{ color: NAVY }}>3</dd>
            </div>
          </dl>

          <div className="mt-6">
            <h3 className="text-sm font-bold" style={{ color: NAVY }}>Kostenindicatie voor deze voorbeeldwoning</h3>
            <ul className="mt-3 divide-y divide-gray-200">
              {KOSTEN.map((k) => (
                <li key={k.werk} className="py-2.5 text-sm">
                  <div className="flex items-baseline justify-between gap-4" style={{ color: NAVY }}>
                    <span className="font-semibold">{k.werk}</span>
                    <span className="whitespace-nowrap font-bold tabular-nums">
                      {eur(TOTAAL_M2 * k.min)} – {eur(TOTAAL_M2 * k.max)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs" style={{ color: TEKST_GEDEMPT }}>€{k.min} – €{k.max} per m²</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed" style={{ color: TEKST_GEDEMPT }}>
              Indicatieve marktprijzen. De echte prijs hangt af van materiaal, toegankelijkheid en de staat van het dak.
              Een definitieve offerte volgt na een plaatsbezoek.
            </p>
          </div>

          <dl className="mt-6 space-y-3 text-sm">
            <div>
              <dt className="font-bold" style={{ color: NAVY }}>Mogelijke premies</dt>
              <dd className="mt-0.5" style={{ color: TEKST_GEDEMPT }}>Welke premies voor uw werken kunnen gelden, met een link naar de officiële aanvraag.</dd>
            </div>
            <div>
              <dt className="font-bold" style={{ color: NAVY }}>Aandachtspunten</dt>
              <dd className="mt-0.5" style={{ color: TEKST_GEDEMPT }}>Waar u op moet letten, zoals asbest in oudere leien of tekenen van slechte isolatie.</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={onStart}
            className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-8 py-4 text-sm font-bold transition-[filter] hover:brightness-95 sm:w-auto"
            style={{ background: AMBER, color: NAVY }}
          >
            Bereken mijn dak
          </button>
        </div>

        {/* ── Tekening met klikbare dakvlakken ── */}
        <figure className="order-2 m-0 self-center rounded-2xl border bg-white p-4 sm:p-6 lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1" style={{ borderColor: 'hsl(220 13% 88%)' }}>
          <svg
            role="img"
            aria-label="Voorbeeld: bovenaanzicht van een dak met twee hellende dakvlakken, een platte aanbouw, de maten en de nokhoogte"
            viewBox="60 40 640 470"
            className="block h-auto w-full"
          >
            <text x="96" y="72" fontSize="12" fontWeight="600" letterSpacing="1" fill={TEKST_GEDEMPT}>
              VOORBEELDWONING · GEEN ECHTE METING
            </text>

            {/* perceelgrens */}
            <polygon points="88,94 712,104 700,492 76,484" fill="none" stroke="#9aa1a6" strokeWidth="1.5" strokeDasharray="14 5 3 5" />

            {/* dakvlakken */}
            <polygon points="190,150 570,150 570,270 190,270" fill={vulling('A')} stroke={lijn('A')} strokeWidth={dikte('A')}
              className="cursor-pointer transition-colors" onClick={() => kies('A')} />
            <polygon points="190,270 570,270 570,390 190,390" fill={vulling('B')} stroke={lijn('B')} strokeWidth={dikte('B')}
              className="cursor-pointer transition-colors" onClick={() => kies('B')} />
            <polygon points="430,390 570,390 570,470 430,470" fill={vulling('C')} stroke={lijn('C')} strokeWidth={dikte('C')}
              className="cursor-pointer transition-colors" onClick={() => kies('C')} />
            <line x1="190" y1="270" x2="570" y2="270" stroke={NAVY} strokeWidth="3" pointerEvents="none" />
            <rect x="292" y="186" width="22" height="22" fill="#ffffff" stroke={NAVY} strokeWidth="1.5" pointerEvents="none" />

            {/* maatlijnen */}
            <g stroke={NAVY} strokeWidth="1" fill="none" pointerEvents="none">
              <path d="M190 144V104M570 144V104M182 112H578" />
              <path d="M184 118l12-12M564 118l12-12" strokeWidth="1.6" />
              <path d="M184 150H138M184 390H138M146 142V398" />
              <path d="M140 156l12-12M140 396l12-12" strokeWidth="1.6" />
            </g>
            <text x="380" y="100" fontSize="15" textAnchor="middle" fill={NAVY} className="tabular-nums">11,40 m</text>
            <text x="128" y="270" fontSize="15" textAnchor="middle" fill={NAVY} transform="rotate(-90 128 270)">7,20 m</text>

            {/* nokhoogte */}
            <path d="M446 256h12l-6 10z" fill={NAVY} />
            <text x="464" y="263" fontSize="14" fill={NAVY}>nok +9,85 m</text>

            {/* labels per vlak */}
            <g pointerEvents="none" fill={NAVY} textAnchor="middle">
              <text x="380" y="212" fontSize="24" fontWeight="900">A</text>
              <text x="380" y="236" fontSize="15">53,6 m²</text>
              <text x="380" y="332" fontSize="24" fontWeight="900">B</text>
              <text x="380" y="356" fontSize="15">53,6 m²</text>
              <text x="500" y="428" fontSize="18" fontWeight="900">C</text>
              <text x="500" y="450" fontSize="13">10,1 m² · plat</text>
            </g>

            {/* noordpijl */}
            <circle cx="660" cy="150" r="20" fill="none" stroke={NAVY} strokeWidth="1.2" />
            <path d="M660 132l7 24-7-5-7 5z" fill={NAVY} />
            <text x="660" y="124" fontSize="14" fontWeight="700" textAnchor="middle" fill={NAVY}>N</text>
          </svg>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(Object.keys(VLAKKEN) as Vlak[]).map((v) => {
              const actief = vlak === v
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={actief}
                  onClick={() => kies(v)}
                  className="min-h-11 rounded-lg border px-4 text-sm font-semibold transition-colors"
                  style={{
                    borderColor: NAVY,
                    background: actief ? NAVY : '#ffffff',
                    color: actief ? '#ffffff' : NAVY,
                  }}
                >
                  {VLAKKEN[v].label}
                </button>
              )
            })}
          </div>
          <figcaption aria-live="polite" className="mt-3 text-sm" style={{ color: TEKST_GEDEMPT }}>
            {vlak ? VLAKKEN[vlak].info : 'Klik op een dakvlak voor de oppervlakte, de helling en de ligging.'}
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
