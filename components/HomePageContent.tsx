'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
// ── CHANGED: Motion imported for hero animations ──
import { motion } from 'motion/react'
import LeadFormModal from '@/components/LeadFormModal'
import styles from '@/styles/homepage.module.css'

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'hero',        label: 'Home' },
  { id: 'hoe-werkt',  label: 'Werkwijze' },
  { id: 'resultaten', label: 'Resultaten' },
  { id: 'waarom',     label: 'Over ons' },
] as const

// ─────────────────────────────────────────────────────────────
// ICONEN
// ─────────────────────────────────────────────────────────────
function WhatsAppIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────
// HOOFD COMPONENT
// ─────────────────────────────────────────────────────────────
export default function HomePageContent() {
  const [formOpen,        setFormOpen]        = useState(false)
  const [videoOpen,       setVideoOpen]       = useState(false)
  const [activeSection,   setActiveSection]   = useState(0)
  const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set([0]))
  const [mounted,         setMounted]         = useState(false)
  const [isMobile,        setIsMobile]        = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const sectionRefs  = useRef<(HTMLElement | null)[]>([])

  const whatsapp    = process.env.NEXT_PUBLIC_OWNER_WHATSAPP ?? '32470000000'
  const whatsappUrl = `https://wa.me/${whatsapp}?text=Hallo%2C%20ik%20heb%20een%20vraag%20over%20mijn%20dak.`

  /* ── setup ── */
  useEffect(() => {
    setMounted(true)
    const check = () => setIsMobile(window.innerWidth <= 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  /* ── IntersectionObserver ── */
  useEffect(() => {
    if (!mounted) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const i = sectionRefs.current.indexOf(entry.target as HTMLElement)
          if (i === -1) return
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, i]))
            if (entry.intersectionRatio > 0.4) setActiveSection(i)
          }
        })
      },
      { root: containerRef.current, threshold: [0.1, 0.5] }
    )
    sectionRefs.current.forEach((r) => r && observer.observe(r))
    return () => observer.disconnect()
  }, [mounted])

  /* ── scroll handler (desktop fallback) ── */
  useEffect(() => {
    if (isMobile) return
    const el = containerRef.current
    if (!el) return
    const onScroll = () => {
      const idx = Math.round(el.scrollTop / window.innerHeight)
      if (idx >= 0 && idx < SECTIONS.length) {
        setActiveSection(idx)
        setVisibleSections((p) => new Set([...p, idx]))
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [isMobile])

  const scrollTo = useCallback((i: number) => {
    if (isMobile) {
      sectionRefs.current[i]?.scrollIntoView({ behavior: 'smooth' })
    } else {
      containerRef.current?.scrollTo({ top: i * window.innerHeight, behavior: 'smooth' })
    }
  }, [isMobile])

  const isVisible = (i: number) => mounted && visibleSections.has(i)

  /* ── helpers ── */
  const setRef = (i: number) => (el: HTMLElement | null) => { sectionRefs.current[i] = el }
  const contentCls = (i: number) =>
    `${styles.content} ${isVisible(i) ? styles.visible : ''}`

  // ── RENDER ──────────────────────────────────────────────────
  return (
    <>
      {/* ── Navigation dots ── */}
      <nav className={`${styles.nav} ${mounted ? styles.visible : ''}`} aria-label="Navigatie">
        {SECTIONS.map((s, i) => (
          <button
            key={s.id}
            className={`${styles.navDot} ${activeSection === i ? styles.active : ''}`}
            onClick={() => scrollTo(i)}
            aria-label={s.label}
          >
            <span className={styles.navLabel}>{s.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Sectieteller ── */}
      <div className={`${styles.counter} ${mounted ? styles.visible : ''}`} aria-hidden>
        <span className={styles.counterNum}>{String(activeSection + 1).padStart(2, '0')}</span>
        <span className={styles.counterDiv}>/</span>
        <span className={styles.counterTotal}>{String(SECTIONS.length).padStart(2, '0')}</span>
      </div>

      {/* ── Scroll container ── */}
      <div ref={containerRef} className={styles.container}>

        {/* ════════════════════════════════════════════════════
            01 — HERO  [CHANGED: Motion animations, new copy, new CTA styles]
        ════════════════════════════════════════════════════ */}
        <section ref={setRef(0)} className={`${styles.section} ${styles.sectionHero}`} id="hero">
          {/* ── CHANGED: video background ── */}
          <video
            autoPlay loop muted playsInline preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={process.env.NEXT_PUBLIC_HERO_VIDEO_URL ?? '/hero.mp4'} type="video/mp4" />
          </video>

          {/* ── CHANGED: darker overlay for readability ── */}
          <div className="absolute inset-0 bg-black/65" />

          {/* Grain + ambient glows (unchanged) */}
          <div className={`${styles.grain} ${styles.grainDark}`} />
          <div className={`${styles.glow} ${styles.glowAmber} ${styles.glowAmberTopRight}`} />
          <div className={`${styles.glow} ${styles.glowAmber} ${styles.glowAmberBotLeft}`}
            style={{ animationDelay: '-9s' }} />

          {/* ── CHANGED: Motion-animated content ── */}
          <motion.div
            className="relative z-10 px-6 text-center max-w-3xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.18 } } }}
          >
            {/* Eyebrow */}
            <motion.p
              className="text-xs font-semibold tracking-[0.28em] uppercase text-white/45 mb-7"
              variants={{
                hidden:  { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
              }}
            >
              Dakwerken · Oost-Vlaanderen
            </motion.p>

            {/* ── CHANGED: new headline ── */}
            <motion.h1
              className="text-5xl sm:text-6xl lg:text-[5.75rem] font-black text-white leading-[1.0] tracking-tight"
              variants={{
                hidden:  { opacity: 0, y: 36 },
                visible: { opacity: 1, y: 0, transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1] } },
              }}
            >
              Uw dak in{' '}
              <span style={{ color: 'hsl(25 95% 53%)' }}>goede handen</span>
            </motion.h1>

            {/* ── CHANGED: new subheadline ── */}
            <motion.p
              className="mt-7 text-base sm:text-lg text-white/55 max-w-xl mx-auto leading-relaxed"
              variants={{
                hidden:  { opacity: 0, y: 24 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
              }}
            >
              Snelle digitale meting&nbsp;&bull;&nbsp;Accurate offerte in minuten&nbsp;&bull;&nbsp;Lokale expertise in Oost-Vlaanderen
            </motion.p>

            {/* ── CHANGED: new CTA styles ── */}
            <motion.div
              className="mt-11 flex flex-col sm:flex-row gap-3.5 justify-center"
              variants={{
                hidden:  { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
              }}
            >
              {/* Primary: white bg, black text */}
              <button
                onClick={() => setFormOpen(true)}
                className="inline-flex items-center justify-center gap-2 font-bold px-9 py-4 rounded-2xl text-sm bg-white text-black hover:bg-white/90 transition-all"
              >
                Bereken je dak
              </button>

              {/* Secondary: glass + WhatsApp icon */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 font-semibold px-9 py-4 rounded-2xl text-sm text-white transition-all backdrop-blur-sm"
                style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.18)' }}
              >
                <WhatsAppIcon className="w-4 h-4" style={{ color: '#25D366' }} />
                Chat met expert
              </a>
            </motion.div>
          </motion.div>

          {/* ── CHANGED: Motion scroll hint (animated arrow, no CSS bounce) ── */}
          <motion.div
            className="absolute bottom-9 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.8 }}
          >
            <motion.div
              animate={{ y: [0, 7, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <svg className="w-5 h-5 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </motion.div>
        </section>

        {/* ════════════════════════════════════════════════════
            02 — HOE WERKT HET
        ════════════════════════════════════════════════════ */}
        <section ref={setRef(1)} className={styles.section} id="hoe-werkt" style={{ background: 'hsl(40 33% 98%)' }}>
          <div className={`${styles.grain} ${styles.grainLight}`} />
          <div className={`${styles.glow} ${styles.glowNavy} ${styles.glowNavyTopLeft}`} />
          <div className={`${styles.glow} ${styles.glowNavy} ${styles.glowNavyBotRight}`}
            style={{ animationDelay: '-11s' }} />

          <div className={`${contentCls(1)} max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24`}>
            <div className="mb-14">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-3"
                style={{ color: 'hsl(25 95% 53%)' }}>02 — Werkwijze</p>
              <h2 className="text-4xl sm:text-5xl font-black leading-tight max-w-md"
                style={{ color: 'hsl(222 47% 11%)' }}>
                Van adres tot offerte in 3 stappen
              </h2>
            </div>

            <div className="grid lg:grid-cols-2 gap-14 items-center">
              {/* Stappen */}
              <div className="space-y-9">
                {[
                  { nr: '01', t: 'Adres invoeren', d: 'Vul het adres van uw woning in. Het systeem lokaliseert uw dak via satellietdata.' },
                  { nr: '02', t: 'Digitale dakmeting', d: 'Binnen seconden een nauwkeurig 3D-model met oppervlakte, helling en daklengte.' },
                  { nr: '03', t: 'Offerte ontvangen', d: 'Een professionele offerte op maat — in uw mailbox binnen 2 uur op werkdagen.' },
                ].map((s, i) => (
                  <div key={i} className="flex gap-5" style={{ transitionDelay: `${i * 0.12}s` }}>
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ background: 'hsl(222 47% 11%)' }}>
                      <span className="text-xs font-black" style={{ color: 'hsl(25 95% 53%)' }}>{s.nr}</span>
                    </div>
                    <div className="pt-0.5">
                      <h3 className="font-bold mb-1 text-base" style={{ color: 'hsl(222 47% 11%)' }}>{s.t}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: 'hsl(215 16% 47%)' }}>{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Video — klik om volledig scherm te openen */}
              <div
                className="relative aspect-video rounded-2xl overflow-hidden cursor-pointer group"
                style={{ background: 'hsl(222 47% 11%)' }}
                onClick={() => setVideoOpen(true)}
              >
                <video autoPlay loop muted playsInline className="w-full h-full object-cover">
                  <source src="/explainer.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Fullscreen video modal */}
              {videoOpen && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
                  onClick={() => setVideoOpen(false)}
                >
                  <button
                    className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
                    onClick={() => setVideoOpen(false)}
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                  <video
                    autoPlay controls playsInline
                    className="w-full max-w-4xl max-h-[90vh] rounded-xl"
                    onClick={e => e.stopPropagation()}
                  >
                    <source src="/explainer.mp4" type="video/mp4" />
                  </video>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
            03 — BEFORE / AFTER
        ════════════════════════════════════════════════════ */}
        <section ref={setRef(2)} className={styles.section} id="resultaten"
          style={{ background: '#f3f4f6' }}>
          <div className={`${styles.grain} ${styles.grainLight}`} />
          <div className={`${styles.glow} ${styles.glowNavy} ${styles.glowNavyBotRight}`} />

          <div className={`${contentCls(2)} max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24`}>
            <div className="mb-14">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-3"
                style={{ color: 'hsl(25 95% 53%)' }}>03 — Resultaten</p>
              <h2 className="text-4xl sm:text-5xl font-black leading-tight"
                style={{ color: 'hsl(222 47% 11%)' }}>Het verschil dat wij maken</h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { b: '/generated/roof-gent-daklekkage-before.png',        a: '/generated/roof-gent-daklekkage-after.png',        city: 'Gent',        type: 'Daklekkage' },
                { b: '/generated/roof-aalst-renovatie-before.png',        a: '/generated/roof-aalst-renovatie-after.png',        city: 'Aalst',       type: 'Renovatie' },
                { b: '/generated/roof-dendermonde-nieuw_dak-before.png',  a: '/generated/roof-dendermonde-nieuw_dak-after.png',  city: 'Dendermonde', type: 'Nieuw dak' },
              ].map((p, i) => (
                <div key={i} className="rounded-2xl overflow-hidden shadow-sm"
                  style={{ background: '#fff', border: '1px solid #e5e7eb', transitionDelay: `${i * 0.1}s` }}>
                  <div className="grid grid-cols-2 gap-px" style={{ background: '#e5e7eb' }}>
                    <div className="relative" style={{ aspectRatio: '4/3' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.b} alt={`Voor — ${p.type} ${p.city}`} className="w-full h-full object-cover" />
                      <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                        style={{ background: 'rgba(0,0,0,0.65)', color: '#fff' }}>Voor</span>
                    </div>
                    <div className="relative" style={{ aspectRatio: '4/3' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.a} alt={`Na — ${p.type} ${p.city}`} className="w-full h-full object-cover" />
                      <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                        style={{ background: '#16a34a', color: '#fff' }}>Na</span>
                    </div>
                  </div>
                  <div className="px-4 py-3 flex justify-between items-center">
                    <span className="text-sm font-semibold" style={{ color: 'hsl(222 47% 11%)' }}>{p.type}</span>
                    <span className="text-xs" style={{ color: '#9ca3af' }}>{p.city}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
            04 — WAAROM WIJ
        ════════════════════════════════════════════════════ */}
        <section ref={setRef(3)} className={styles.section} id="waarom"
          style={{ background: 'hsl(222 47% 11%)' }}>
          <div className={`${styles.grain} ${styles.grainDark}`} />
          <div className={`${styles.glow} ${styles.glowAmber} ${styles.glowAmberTopRight}`} />
          <div className={`${styles.glow} ${styles.glowAmber} ${styles.glowAmberBotLeft}`}
            style={{ animationDelay: '-7s' }} />

          <div className={`${contentCls(3)} max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24`}>
            <div className="mb-14">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-3"
                style={{ color: 'hsl(25 95% 53%)' }}>04 — Over ons</p>
              <h2 className="text-4xl sm:text-5xl font-black leading-tight max-w-md"
                style={{ color: '#fff' }}>
                Meer dan 500 tevreden klanten
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-14">
              {[
                { t: 'Digitale precisie',  d: 'Exacte metingen via satellietdata. Geen schatting, geen surprises.' },
                { t: 'Binnen 2 uur',       d: 'Offerte in uw mailbox nog dezelfde dag. U beslist op uw tempo.' },
                { t: 'Lokale vakmannen',   d: 'Gecertificeerde dakwerkers in heel Oost-Vlaanderen. Snel ter plaatse.' },
                { t: '10 jaar garantie',   d: 'Wij staan 10 jaar garant voor elk uitgevoerd werk.' },
                { t: 'Eerlijke prijs',     d: 'Transparante offertes. Geen verborgen kosten, nooit.' },
                { t: 'Energiepremies',     d: 'Wij begeleiden u bij alle premieaanvragen voor isolatie.' },
              ].map((u, i) => (
                <div key={i} className="rounded-xl p-5 transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.08)', transitionDelay: `${i * 0.06}s` }}>
                  <h3 className="font-bold mb-1.5 text-sm" style={{ color: '#fff' }}>{u.t}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{u.d}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center">
              <button
                onClick={() => setFormOpen(true)}
                className="inline-flex items-center gap-2 font-bold px-10 py-4 rounded-xl text-sm transition-all"
                style={{ background: 'hsl(25 95% 53%)', color: '#fff' }}
              >
                Bereken uw dak gratis →
              </button>
              <p className="mt-3 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Geen verplichtingen. Gratis en vrijblijvend.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ── Form modal ── */}
      {formOpen && <LeadFormModal onClose={() => setFormOpen(false)} />}
    </>
  )
}
