'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import LeadFormModal from '@/components/LeadFormModal'
import AdresZoeker from '@/components/AdresZoeker'

// ─────────────────────────────────────────────────────────────
// KLEUREN (zelfde merk als voorheen)
// ─────────────────────────────────────────────────────────────
const NAVY = 'hsl(222 47% 11%)'
const AMBER = 'hsl(25 95% 53%)'
const TEKST_GEDEMPT = 'hsl(215 19% 35%)'
const WARM_WIT = 'hsl(40 33% 98%)'

const STAPPEN = [
  { nr: '01', t: 'Adres invullen',     d: 'U ziet meteen de luchtfoto van uw woning.' },
  { nr: '02', t: 'Uw dak aanduiden',   d: 'We meten de oppervlakte en de hoogte van uw dak met de gegevens van de Vlaamse overheid.' },
  { nr: '03', t: 'Rapport ontvangen',  d: 'Prijsindicatie, mogelijke premies en aandachtspunten, meteen in uw mailbox.' },
]

const VRAGEN: { v: string; a: React.ReactNode }[] = [
  {
    v: 'Is het echt gratis?',
    a: 'Ja. Het rapport kost niets en u zit nergens aan vast. U hoeft geen account te maken.',
  },
  {
    v: 'Word ik gebeld?',
    a: 'Alleen als u daar zelf om vraagt en uw telefoonnummer achterlaat. Voor het rapport volstaat uw e-mailadres.',
  },
  {
    v: 'Wat gebeurt er met mijn gegevens?',
    a: (
      <>
        We gebruiken ze voor uw rapport en, als u dat vraagt, om u in contact te brengen met een dakwerker.
        Meer in onze{' '}
        <Link href="/privacy" className="font-semibold underline underline-offset-2" style={{ color: NAVY }}>
          privacyverklaring
        </Link>.
      </>
    ),
  },
  {
    v: 'Hoe nauwkeurig is het?',
    a: 'Oppervlakte en hoogte komen uit de kaart- en hoogtegegevens van de Vlaamse overheid. Het is een goede schatting, geen opmeting ter plaatse. De definitieve offerte volgt na een plaatsbezoek.',
  },
  {
    v: 'Wie zijn de dakwerkers?',
    a: 'Gecertificeerde dakwerkers uit uw regio, uit ons netwerk. Vraagt u een offerte aan, dan wordt u op werkdagen binnen 2 uur gebeld.',
  },
]

// ─────────────────────────────────────────────────────────────
// HOOFD COMPONENT
// ─────────────────────────────────────────────────────────────
export default function HomePageContent() {
  const [formOpen,     setFormOpen]     = useState(false)
  const [startVerzoek, setStartVerzoek] = useState<{ adres: string; id: number } | null>(null)
  const [heroPauze,    setHeroPauze]    = useState(false)
  const [reduce,       setReduce]       = useState(false)
  const heroVideo = useRef<HTMLVideoElement>(null)
  const heroHandmatigGepauzeerd = useRef(false)
  const demoVideo = useRef<HTMLVideoElement>(null)
  const [demoSpeelt, setDemoSpeelt] = useState(false)
  const [demoDichtbij, setDemoDichtbij] = useState(false)
  // Pauzeert de bezoeker de demo zelf, dan start ze niet vanzelf opnieuw
  const demoHandmatigGepauzeerd = useRef(false)

  // Dronebeeld pas laden als de rest van de pagina er staat: de poster toont al het dak,
  // en kop en adresveld krijgen voorrang. Wie minder beweging wil, houdt de poster.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReduce(true)
      setHeroPauze(true)
      return
    }
    const start = () => {
      if (heroHandmatigGepauzeerd.current) return
      void heroVideo.current?.play().catch(() => setHeroPauze(true))
    }
    if (document.readyState === 'complete') {
      start()
      return
    }
    window.addEventListener('load', start, { once: true })
    return () => window.removeEventListener('load', start)
  }, [])

  // Demoposter pas ophalen als de bezoeker in de buurt scrolt
  useEffect(() => {
    const v = demoVideo.current
    if (!v) return
    const waarnemer = new IntersectionObserver(
      ([item]) => {
        if (!item.isIntersecting) return
        setDemoDichtbij(true)
        waarnemer.disconnect()
      },
      { rootMargin: '600px 0px' },
    )
    waarnemer.observe(v)
    return () => waarnemer.disconnect()
  }, [])

  // Demovideo speelt (zonder geluid) alleen als ze in beeld is
  useEffect(() => {
    const v = demoVideo.current
    if (!v || reduce) return
    const waarnemer = new IntersectionObserver(
      ([item]) => {
        if (item.isIntersecting && !demoHandmatigGepauzeerd.current) void v.play().catch(() => {})
        else if (!item.isIntersecting) v.pause()
      },
      { threshold: 0.4 },
    )
    waarnemer.observe(v)
    return () => waarnemer.disconnect()
  }, [reduce])

  function toggleDemo() {
    const v = demoVideo.current
    if (!v) return
    if (v.paused) {
      demoHandmatigGepauzeerd.current = false
      void v.play().catch(() => {})
    } else {
      demoHandmatigGepauzeerd.current = true
      v.pause()
    }
  }

  // Volgt wat de bezoeker wil, ook als de video nog niet gestart is
  function toggleHeroVideo() {
    const v = heroVideo.current
    if (!v) return
    if (heroPauze) {
      heroHandmatigGepauzeerd.current = false
      setHeroPauze(false)
      void v.play().catch(() => setHeroPauze(true))
    } else {
      heroHandmatigGepauzeerd.current = true
      setHeroPauze(true)
      v.pause()
    }
  }

  // Adres gekozen op de homepage: funnel opent meteen bij de kaart
  function startMetAdres(adres: string) {
    setStartVerzoek({ adres, id: Date.now() })
    setFormOpen(true)
  }


  return (
    <>
      {/* ════════════════════════════════════════════════════
          HERO — dronebeeld, kernboodschap, adresveld
      ════════════════════════════════════════════════════ */}
      <section
        id="hero"
        className="relative flex min-h-[100svh] items-center justify-center"
        style={{ background: NAVY }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <video
            ref={heroVideo}
            loop
            muted
            playsInline
            preload="none"
            poster="/hero-poster.jpg"
            aria-hidden="true"
            className="h-full w-full object-cover"
          >
            <source src={process.env.NEXT_PUBLIC_HERO_VIDEO_URL ?? '/hero.mp4'} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/65" />
        </div>

        {/* Binnenschuiven met CSS (globals.css): de kop staat er meteen, zonder op JavaScript te wachten */}
        <div className="relative z-10 mx-auto w-full max-w-3xl px-6 pt-28 pb-28 text-center">
          <h1
            className="hero-in text-4xl font-black leading-[1.05] tracking-tight text-white text-balance sm:text-6xl lg:text-7xl"
            style={{ '--hero-y': '32px', '--hero-duur': '1s' } as React.CSSProperties}
          >
            Weet wat uw dak kost, vóór u een dakwerker belt.
          </h1>

          <p
            className="hero-in mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg"
            style={{ '--hero-y': '24px', '--hero-duur': '0.9s', '--hero-vertraging': '0.15s' } as React.CSSProperties}
          >
            Vul uw adres in en ontvang een gratis rapport: de oppervlakte van uw dak, een prijsindicatie
            per soort werk en mogelijke premies.
          </p>

          <div
            className="hero-in mx-auto mt-9 max-w-xl"
            style={{ '--hero-y': '20px', '--hero-duur': '0.8s', '--hero-vertraging': '0.3s' } as React.CSSProperties}
          >
            <AdresZoeker
              label="Adres van uw woning"
              verborgenLabel
              knopLabel="Bereken mijn dak"
              variant="donker"
              onKies={startMetAdres}
            />
            <p className="mt-4 text-sm text-white/75">
              Gratis · Zonder account · Op basis van officiële Vlaamse gegevens
            </p>
          </div>
        </div>

        {/* Pauzeknop voor de achtergrondvideo */}
        <button
          type="button"
          onClick={toggleHeroVideo}
          aria-label={heroPauze ? 'Video afspelen' : 'Video pauzeren'}
          className="absolute bottom-6 left-6 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 text-white/80 transition-colors hover:border-white/60 hover:text-white"
        >
          {heroPauze ? (
            <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          ) : (
            <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
          )}
        </button>
      </section>

      {/* ════════════════════════════════════════════════════
          IN DRIE STAPPEN — met de demovideo van de echte tool
          (scripts/demo-opname.ts + scripts/render-demo.ts)
      ════════════════════════════════════════════════════ */}
      <section id="hoe-werkt" className="bg-white px-4 py-24 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <h2 className="text-4xl font-black leading-tight text-balance sm:text-5xl" style={{ color: NAVY }}>
              In drie stappen
            </h2>
            <ol className="mt-10 space-y-8">
              {STAPPEN.map((s) => (
                <li key={s.nr} className="flex gap-5">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: NAVY }}>
                    <span className="text-xs font-black" style={{ color: AMBER }}>{s.nr}</span>
                  </div>
                  <div className="pt-0.5">
                    <h3 className="text-lg font-bold" style={{ color: NAVY }}>{s.t}</h3>
                    <p className="mt-1 text-base leading-relaxed" style={{ color: TEKST_GEDEMPT }}>{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Eigen knop i.p.v. browserbediening: die zou de ondertitels in de video bedekken */}
          <div className="relative">
            <video
              ref={demoVideo}
              className="aspect-video w-full rounded-2xl shadow-xl"
              style={{ background: NAVY }}
              poster={demoDichtbij ? '/demo-poster.jpg' : undefined}
              muted
              loop
              playsInline
              preload="none"
              onPlay={() => setDemoSpeelt(true)}
              onPause={() => setDemoSpeelt(false)}
              onClick={toggleDemo}
              aria-label="Demo van 25 seconden: adres typen, dak aanduiden op de kaart, oppervlakte zien en het rapport ontvangen"
            >
              <source src="/demo.mp4" type="video/mp4" />
            </video>
            <button
              type="button"
              onClick={toggleDemo}
              aria-label={demoSpeelt ? 'Demo pauzeren' : 'Demo afspelen'}
              className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-white backdrop-blur-sm transition-colors hover:bg-black/70"
              style={{ background: 'rgba(15, 23, 42, 0.65)' }}
            >
              {demoSpeelt ? (
                <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
              ) : (
                <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          EERST UW RAPPORT. DAARNA BESLIST U. + WIE ZIT ERACHTER
      ════════════════════════════════════════════════════ */}
      <section id="vertrouwen" className="px-4 py-24 sm:px-6 sm:py-28 lg:px-8" style={{ background: NAVY }}>
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 className="text-4xl font-black leading-tight text-white text-balance sm:text-5xl">
              Eerst uw rapport. Daarna beslist u.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-white/80 sm:text-lg">
              Het rapport is gratis en verplicht u tot niets. Wilt u verder, dan brengen we u in contact
              met een gecertificeerde dakwerker uit uw regio. U wordt alleen gebeld als u daar zelf om vraagt.
            </p>
          </div>

          <ul className="mt-12 grid gap-4 sm:grid-cols-3">
            {['Officiële gegevens', 'Gecertificeerde dakwerkers', 'Offerte binnen 2 uur, op werkdagen'].map((t) => (
              <li
                key={t}
                className="flex items-center gap-3 rounded-xl p-5 text-base font-semibold text-white"
                style={{ border: '1px solid rgba(255,255,255,0.14)' }}
              >
                <svg aria-hidden="true" className="h-5 w-5 flex-shrink-0" fill="none" stroke={AMBER} strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5 9-10" />
                </svg>
                {t}
              </li>
            ))}
          </ul>

          <div className="mt-14 max-w-2xl border-t pt-10" style={{ borderColor: 'rgba(255,255,255,0.14)' }}>
            <h3 className="text-xl font-bold text-white">Wie zit erachter</h3>
            <p className="mt-3 text-base leading-relaxed text-white/80">
              Dakwerken Oost-Vlaanderen is een dienst van AOA Management CommV. Wij maken het rapport en
              zoeken de juiste dakwerker. Het werk zelf doet een gecertificeerde partner uit uw regio.
              Actief in heel Oost-Vlaanderen.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          VEELGESTELDE VRAGEN
      ════════════════════════════════════════════════════ */}
      <section id="vragen" className="bg-white px-4 py-24 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-4xl font-black leading-tight text-balance sm:text-5xl" style={{ color: NAVY }}>
            Veelgestelde vragen
          </h2>
          <div className="mt-10 divide-y divide-gray-200 border-y border-gray-200">
            {VRAGEN.map((item) => (
              <details key={item.v} className="group">
                <summary
                  className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-bold [&::-webkit-details-marker]:hidden"
                  style={{ color: NAVY }}
                >
                  {item.v}
                  <svg aria-hidden="true" className="h-5 w-5 flex-shrink-0 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="pb-5 pr-9 text-base leading-relaxed" style={{ color: TEKST_GEDEMPT }}>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          SLOTOPROEP
      ════════════════════════════════════════════════════ */}
      <section id="start" className="px-4 py-24 sm:px-6 lg:px-8" style={{ background: WARM_WIT }}>
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-4xl font-black leading-tight text-balance sm:text-5xl" style={{ color: NAVY }}>
            Benieuwd wat uw dak kost?
          </h2>
          <div className="mt-8">
            <AdresZoeker
              label="Adres van uw woning"
              verborgenLabel
              knopLabel="Bereken mijn dak"
              onKies={startMetAdres}
            />
          </div>
          <p className="mt-4 text-sm" style={{ color: TEKST_GEDEMPT }}>
            Gratis · Zonder account · Geen verplichtingen
          </p>
        </div>
      </section>

      {/* Funnel blijft gemount: sluiten en heropenen gaat verder bij dezelfde stap */}
      <LeadFormModal open={formOpen} onClose={() => setFormOpen(false)} startVerzoek={startVerzoek} />
    </>
  )
}
