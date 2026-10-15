'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import LeadFormModal from '@/components/LeadFormModal'
import VoorbeeldResultaat from '@/components/VoorbeeldResultaat'
import { steden } from '@/lib/steden'

// ─────────────────────────────────────────────────────────────
// KLEUREN (zelfde merk als voorheen)
// ─────────────────────────────────────────────────────────────
const NAVY = 'hsl(222 47% 11%)'
const AMBER = 'hsl(25 95% 53%)'
const TEKST_GEDEMPT = 'hsl(215 19% 35%)'
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

// ─────────────────────────────────────────────────────────────
// HOOFD COMPONENT
// Gewone documentscroll (geen scroll-snap-container meer): de footer is
// bereikbaar en de header ligt enkel over de donkere hero.
// ─────────────────────────────────────────────────────────────
export default function HomePageContent() {
  const [formOpen,   setFormOpen]   = useState(false)
  const [videoOpen,  setVideoOpen]  = useState(false)
  const [heroPauze,  setHeroPauze]  = useState(false)
  const reduce    = useReducedMotion()
  const heroVideo = useRef<HTMLVideoElement>(null)

  // Wie minder beweging wil, krijgt een stilstaande hero
  useEffect(() => {
    if (reduce) {
      heroVideo.current?.pause()
      setHeroPauze(true)
    }
  }, [reduce])

  // Uitlegvideo sluit met Escape
  useEffect(() => {
    if (!videoOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setVideoOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [videoOpen])

  function toggleHeroVideo() {
    const v = heroVideo.current
    if (!v) return
    if (v.paused) {
      void v.play()
      setHeroPauze(false)
    } else {
      v.pause()
      setHeroPauze(true)
    }
  }

  const opschuiven = (y: number, duur: number) => ({
    hidden:  { opacity: 0, y: reduce ? 0 : y },
    visible: { opacity: 1, y: 0, transition: { duration: reduce ? 0 : duur, ease: EASE } },
  })

  return (
    <>
      {/* ════════════════════════════════════════════════════
          HERO — dronebeeld van een dak, één call to action
      ════════════════════════════════════════════════════ */}
      <section
        id="hero"
        className="relative flex min-h-[100svh] items-center justify-center overflow-hidden"
        style={{ background: NAVY }}
      >
        <video
          ref={heroVideo}
          autoPlay={!reduce}
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={process.env.NEXT_PUBLIC_HERO_VIDEO_URL ?? '/hero.mp4'} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/65" />

        <motion.div
          className="relative z-10 mx-auto max-w-3xl px-6 pt-24 pb-28 text-center"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: reduce ? 0 : 0.18 } } }}
        >
          <motion.p
            className="mb-7 text-xs font-semibold uppercase tracking-[0.28em] text-white/70"
            variants={opschuiven(16, 0.8)}
          >
            Gratis dakrapport · Oost-Vlaanderen
          </motion.p>

          <motion.h1
            className="text-5xl font-black leading-[1.0] tracking-tight text-white sm:text-6xl lg:text-[5.75rem]"
            variants={opschuiven(36, 1.0)}
          >
            Ontdek alles over{' '}
            <span style={{ color: AMBER }}>uw eigen dak</span>
          </motion.h1>

          <motion.p
            className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg"
            variants={opschuiven(24, 0.9)}
          >
            Vul uw adres in en we tekenen uw dak uit de kaart- en hoogtegegevens van de Vlaamse
            overheid: oppervlakte, kosten en mogelijke premies.
          </motion.p>

          <motion.div className="mt-11 flex flex-col items-center gap-4" variants={opschuiven(20, 0.8)}>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white px-10 py-4 text-base font-bold text-black transition-colors hover:bg-white/90 sm:w-auto"
            >
              Start gratis dakrapport
            </button>
            <p className="text-sm text-white/70">Gratis · zonder account · ± 2 minuten</p>
          </motion.div>
        </motion.div>

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

        {/* Scroll-hint */}
        <motion.a
          href="#voorbeeld"
          aria-label="Naar: zo ziet uw resultaat eruit"
          className="absolute bottom-7 left-1/2 z-10 flex h-11 w-11 -translate-x-1/2 items-center justify-center text-white/50 hover:text-white/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduce ? 0 : 1.4, duration: 0.8 }}
        >
          <motion.span
            animate={reduce ? undefined : { y: [0, 7, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.span>
        </motion.a>
      </section>

      {/* ════════════════════════════════════════════════════
          ZO ZIET UW RESULTAAT ERUIT — bewijs vóór de klik
      ════════════════════════════════════════════════════ */}
      <VoorbeeldResultaat onStart={() => setFormOpen(true)} />

      {/* ════════════════════════════════════════════════════
          ZO WERKT HET
      ════════════════════════════════════════════════════ */}
      <section id="hoe-werkt" className="px-4 py-24 sm:px-6 sm:py-28 lg:px-8" style={{ background: 'hsl(40 33% 98%)' }}>
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-14 max-w-md text-4xl font-black leading-tight text-balance sm:text-5xl" style={{ color: NAVY }}>
            Van adres tot volledig rapport in 3 stappen
          </h2>

          <div className="grid items-center gap-14 lg:grid-cols-2">
            <ol className="space-y-9">
              {[
                { nr: '01', t: 'Adres invoeren', d: 'Vul het adres van uw woning in. U ziet meteen de luchtfoto van uw perceel.' },
                { nr: '02', t: 'Klik op uw dak', d: 'Duid uw woning aan op de kaart. We berekenen de oppervlakte en hoogte van uw dak uit officiële Vlaamse gegevens.' },
                { nr: '03', t: 'Ontvang uw rapport', d: 'U krijgt meteen een e-mail met uw rapport: 3D-model, kostenindicatie, mogelijke premies en aandachtspunten.' },
              ].map((s) => (
                <li key={s.nr} className="flex gap-5">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: NAVY }}>
                    <span className="text-xs font-black" style={{ color: AMBER }}>{s.nr}</span>
                  </div>
                  <div className="pt-0.5">
                    <h3 className="mb-1 text-base font-bold" style={{ color: NAVY }}>{s.t}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: TEKST_GEDEMPT }}>{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>

            {/* Uitlegvideo — klik om volledig scherm te openen */}
            <button
              type="button"
              onClick={() => setVideoOpen(true)}
              aria-label="Bekijk de uitlegvideo op volledig scherm"
              className="group relative aspect-video w-full overflow-hidden rounded-2xl"
              style={{ background: NAVY }}
            >
              <video autoPlay={!reduce} loop muted playsInline aria-hidden="true" className="h-full w-full object-cover">
                <source src="/explainer.mp4" type="video/mp4" />
              </video>
              <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/35">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/25 backdrop-blur-sm">
                  <svg aria-hidden="true" className="ml-1 h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Uitlegvideo op volledig scherm */}
      {videoOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Uitlegvideo"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setVideoOpen(false)}
        >
          <button
            type="button"
            autoFocus
            aria-label="Sluit de video"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center text-white/80 hover:text-white"
            onClick={() => setVideoOpen(false)}
          >
            <svg aria-hidden="true" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <video
            autoPlay
            controls
            playsInline
            className="max-h-[90vh] w-full max-w-4xl rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <source src="/explainer.mp4" type="video/mp4" />
          </video>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          WAT STAAT ER IN UW RAPPORT
          (geen gegenereerd beeld als realisatie)
      ════════════════════════════════════════════════════ */}
      <section id="rapport" className="px-4 py-24 sm:px-6 sm:py-28 lg:px-8" style={{ background: '#f3f4f6' }}>
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 max-w-2xl">
            <h2 className="text-4xl font-black leading-tight text-balance sm:text-5xl" style={{ color: NAVY }}>
              Wat staat er in uw dakrapport?
            </h2>
            <p className="mt-5 text-base leading-relaxed sm:text-lg" style={{ color: TEKST_GEDEMPT }}>
              Het rapport gaat over uw woning, niet over ons. Alles is berekend voor uw eigen dak.
            </p>
          </div>

          <dl className="grid max-w-4xl gap-x-14 gap-y-10 sm:grid-cols-2">
            {[
              { t: 'Uw dak in 3D',      d: 'Een 3D-model van uw woning en de oppervlakte van uw dak, berekend uit de hoogtegegevens van de Vlaamse overheid.' },
              { t: 'Kostenindicatie',   d: 'Een prijsvork per soort werk, zoals pannen vervangen, isoleren of een plat dak vernieuwen, berekend op de oppervlakte van uw dak.' },
              { t: 'Mogelijke premies', d: 'Welke premies voor uw werken kunnen gelden, met een link naar de officiële aanvraag.' },
              { t: 'Aandachtspunten',   d: 'Waar u op moet letten bij uw woning, zoals asbest in oudere leien of tekenen van slechte isolatie.' },
            ].map((item) => (
              <div key={item.t} className="border-t pt-5" style={{ borderColor: 'hsl(220 13% 80%)' }}>
                <dt className="text-lg font-bold" style={{ color: NAVY }}>{item.t}</dt>
                <dd className="mt-2 text-base leading-relaxed" style={{ color: TEKST_GEDEMPT }}>{item.d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          EERST UW RAPPORT, DAARNA BESLIST U
      ════════════════════════════════════════════════════ */}
      <section id="waarom" className="px-4 py-24 sm:px-6 sm:py-28 lg:px-8" style={{ background: NAVY }}>
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-14 max-w-md text-4xl font-black leading-tight text-white text-balance sm:text-5xl">
            Eerst uw rapport. Daarna beslist u.
          </h2>

          <div className="mb-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: 'Officiële gegevens',         d: 'Oppervlakte en hoogte van uw dak komen uit de kaart- en hoogtegegevens van de Vlaamse overheid.' },
              { t: 'Gratis en vrijblijvend',     d: 'Het rapport kost niets en verplicht u tot niets.' },
              { t: 'Gecertificeerde dakwerkers', d: 'Wilt u verder? Dan brengen we u in contact met een gecertificeerde dakwerker uit uw regio.' },
              { t: 'Offerte binnen 2 uur',       d: 'Vraagt u een offerte aan, dan wordt u op werkdagen binnen 2 uur gebeld.' },
            ].map((u) => (
              <div key={u.t} className="rounded-xl p-5" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                <h3 className="mb-1.5 text-sm font-bold text-white">{u.t}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>{u.d}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl px-10 py-4 text-sm font-bold transition-[filter] hover:brightness-95"
              style={{ background: AMBER, color: NAVY }}
            >
              Vraag uw gratis dakrapport →
            </button>
            <p className="mt-3 text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Geen verplichtingen. Gratis en vrijblijvend.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          WERKGEBIED — links naar de stadspagina's
      ════════════════════════════════════════════════════ */}
      <section id="werkgebied" className="px-4 py-20 sm:px-6 lg:px-8" style={{ background: 'hsl(40 33% 98%)' }}>
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-black sm:text-4xl" style={{ color: NAVY }}>Werkgebied</h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: TEKST_GEDEMPT }}>
            Actief in heel Oost-Vlaanderen. Kies uw gemeente voor meer uitleg en een gratis offerte.
          </p>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {steden.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/dakwerken-${s.slug}`}
                  className="flex min-h-12 items-center rounded-xl border bg-white px-4 py-3 text-sm font-semibold transition-colors hover:border-[hsl(222_47%_11%)]"
                  style={{ borderColor: 'hsl(220 13% 85%)', color: NAVY }}
                >
                  {s.naam}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Funnel blijft gemount: sluiten en heropenen gaat verder bij dezelfde stap */}
      <LeadFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </>
  )
}
