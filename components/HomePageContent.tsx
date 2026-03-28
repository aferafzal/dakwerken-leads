'use client'

// Design geporteerd van Lovable (dak-oogst-oost)
// Backend, forms en lead capture: 100% ongewijzigd

import { motion } from 'motion/react'
import LeadForm from '@/components/LeadForm'
import { steden } from '@/lib/steden'

// ─────────────────────────────────────────────────────────────
// HERO SECTION — full-screen video achtergrond
// ─────────────────────────────────────────────────────────────
function HeroSection() {
  const whatsapp = process.env.NEXT_PUBLIC_OWNER_WHATSAPP ?? '32470000000'
  const whatsappUrl = `https://wa.me/${whatsapp}?text=Hallo%2C%20ik%20heb%20een%20vraag%20over%20mijn%20dak.`

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Video achtergrond — plaatsvervanger: /public/hero.mp4 */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        poster="/hero-poster.jpg"
      >
        <source src="/hero.mp4" type="video/mp4" />
      </video>

      {/* Donkere overlay zodat tekst leesbaar is */}
      <div className="absolute inset-0 bg-navy/75" />

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Links: tekst + CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-warm-white leading-tight tracking-tight">
              Dakwerken in
              <br />
              Oost-Vlaanderen
            </h1>
            <p className="mt-4 text-xl sm:text-2xl font-bold text-amber">
              Gratis offerte binnen 2 uur
            </p>
            <p className="mt-4 text-lg text-warm-white/70 max-w-lg">
              Gecertificeerde vakmannen. Snelle service. 10 jaar garantie.
            </p>

            {/* Twee CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <a href="#offerte" className="btn-primary text-center">
                Vraag een offerte aan →
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-center"
              >
                💬 Chat met onze expert
              </a>
            </div>

            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
              <span className="trust-badge">✓ 500+ projecten</span>
              <span className="trust-badge">⏱ Reactie in 2u</span>
              <span className="trust-badge">🛡 10j garantie</span>
              <span className="trust-badge">★ 4.9/5</span>
            </div>
          </motion.div>

          {/* Rechts: formulier */}
          <motion.div
            id="offerte"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-2xl">
              <LeadForm />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// STATS BAR
// ─────────────────────────────────────────────────────────────
const stats = [
  { value: '500+', label: 'Afgewerkte projecten' },
  { value: '10 jaar', label: 'Garantie' },
  { value: '2 uur', label: 'Reactietijd' },
  { value: '4.9★', label: 'Klantbeoordeling' },
]

function StatsBar() {
  return (
    <section className="bg-slate-dark py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center relative"
            >
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-warm-white">
                {stat.value}
              </div>
              <div className="text-warm-white/60 text-sm sm:text-base mt-1">{stat.label}</div>
              {i < stats.length - 1 && (
                <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-px h-12 bg-warm-white/10" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// SERVICES SECTION
// ─────────────────────────────────────────────────────────────
const services = [
  { icon: '🔧', title: 'Daklekkage', desc: 'Snel en duurzaam hersteld, ook in het weekend.', color: 'bg-amber/10 border-amber' },
  { icon: '🏠', title: 'Dakrenovatie', desc: 'Volledig vernieuwd dak met energiepremies.', color: 'bg-blue-500/10 border-blue-500' },
  { icon: '❄️', title: 'Dakisolatie', desc: 'Bespaar tot 30% op uw energiefactuur.', color: 'bg-cyan-500/10 border-cyan-500' },
  { icon: '🏗️', title: 'Nieuw dak', desc: 'Van plat tot hellend dak, op maat.', color: 'bg-emerald-500/10 border-emerald-500' },
]

function ServicesSection() {
  return (
    <section className="section-padding bg-background">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="section-heading">Wat kunnen wij voor u doen?</h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="card-service group hover:border-t-4 hover:border-t-amber"
            >
              <div className={`w-14 h-14 rounded-xl ${s.color} border flex items-center justify-center text-2xl mb-4`}>
                {s.icon}
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm mb-4">{s.desc}</p>
              <span className="text-amber font-semibold text-sm group-hover:underline cursor-pointer">
                Meer info →
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// BEFORE / AFTER SECTION
// ─────────────────────────────────────────────────────────────
const pairs = [
  { before: 'https://picsum.photos/seed/roof1/800/600', after: 'https://picsum.photos/seed/roof4/800/600' },
  { before: 'https://picsum.photos/seed/roof2/800/600', after: 'https://picsum.photos/seed/roof5/800/600' },
  { before: 'https://picsum.photos/seed/roof3/800/600', after: 'https://picsum.photos/seed/roof6/800/600' },
]

function BeforeAfterSection() {
  return (
    <section className="section-padding bg-secondary/50">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="section-heading">Het verschil dat wij maken</h2>
          <p className="section-subheading mx-auto mt-4">
            Vervang de voorbeeldfotos door uw eigen voor/na beelden van afgeronde projecten.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {pairs.map((pair, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden"
            >
              {/* Voor */}
              <div className="relative aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pair.before} alt="Voor renovatie" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-foreground/40" />
                <span className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1 rounded-full uppercase">
                  Voor
                </span>
              </div>
              {/* Na */}
              <div className="relative aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pair.after} alt="Na renovatie" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-emerald-500/10" />
                <span className="absolute top-3 left-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
                  Na
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-10">
          <button className="btn-primary">Bekijk al onze projecten →</button>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// VIDEO SECTION (placeholder voor Remotion promofilm)
// ─────────────────────────────────────────────────────────────
function VideoSection() {
  return (
    <section className="section-padding bg-background">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="section-heading">Bekijk hoe wij werken</h2>
          <p className="section-subheading mx-auto mt-4">
            Onze vakmannen in actie — van inspectie tot perfect dak.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative aspect-video rounded-2xl bg-navy overflow-hidden flex items-center justify-center cursor-pointer group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-navy-light/80 to-navy/90" />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-amber/90 flex items-center justify-center group-hover:bg-amber transition-colors shadow-lg">
              <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <p className="text-warm-white/60 text-sm font-medium">Video binnenkort beschikbaar</p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// TESTIMONIALS
// ─────────────────────────────────────────────────────────────
const reviews = [
  { text: 'Binnen de dag een dakspecialist ter plaatse. Uitstekend werk!', name: 'Jan V.', city: 'Gent' },
  { text: 'Eerlijke prijs, nette afwerking. Zeker aanbevolen!', name: 'Marie D.', city: 'Aalst' },
  { text: 'Daklekkage opgelost in 24 uur. Fantastische service.', name: 'Pieter S.', city: 'Dendermonde' },
]

function Stars() {
  return (
    <div className="flex gap-1 star-filled text-lg">
      {Array(5).fill(0).map((_, i) => <span key={i}>★</span>)}
    </div>
  )
}

function TestimonialsSection() {
  return (
    <section className="section-padding bg-secondary/50">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="section-heading">Wat onze klanten zeggen</h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map((r, i) => (
            <motion.div
              key={r.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="card-review"
            >
              <Stars />
              <p className="text-foreground mt-4 text-base leading-relaxed">&ldquo;{r.text}&rdquo;</p>
              <p className="mt-4 text-sm font-semibold text-muted-foreground">
                — {r.name}, {r.city}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// SERVICE AREA
// ─────────────────────────────────────────────────────────────
function ServiceAreaSection() {
  return (
    <section className="section-padding bg-background">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="section-heading">Actief in heel Oost-Vlaanderen</h2>
          <p className="section-subheading mx-auto mt-4">
            Van Gent tot Sint-Niklaas — onze dakspecialisten rijden naar u toe.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap justify-center gap-3"
        >
          {steden.map((stad, i) => (
            <motion.a
              key={stad.slug}
              href={`/dakwerken-${stad.slug}`}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
              className="pill-city"
            >
              {stad.naam}
            </motion.a>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// FINAL CTA
// ─────────────────────────────────────────────────────────────
function FinalCTA() {
  const phone = process.env.NEXT_PUBLIC_OWNER_PHONE ?? '0470 00 00 00'

  return (
    <section className="relative bg-navy py-20 sm:py-28 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-warm-white leading-tight">
            Klaar om uw dak te laten herstellen?
          </h2>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#offerte" className="btn-primary text-center">
              Gratis offerte aanvragen →
            </a>
            <a href={`tel:${phone}`} className="btn-secondary text-center">
              📞 Direct bellen
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// HOOFD EXPORT
// ─────────────────────────────────────────────────────────────
export default function HomePageContent() {
  return (
    <>
      <HeroSection />
      <StatsBar />
      <ServicesSection />
      <BeforeAfterSection />
      <VideoSection />
      <TestimonialsSection />
      <ServiceAreaSection />
      <FinalCTA />
    </>
  )
}
