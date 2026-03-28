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

      {/* Donkere overlay */}
      <div className="absolute inset-0 bg-navy/75" />

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Links: tekst + CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 bg-amber/20 border border-amber/40 text-amber rounded-full px-4 py-1.5 text-sm font-semibold mb-6">
              🛰️ Nu met digitale 3D dakmeting
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-warm-white leading-tight tracking-tight">
              Dakwerken in
              <br />
              <span className="text-amber">Oost-Vlaanderen</span>
            </h1>
            <p className="mt-5 text-lg text-warm-white/80 max-w-lg leading-relaxed">
              Gecertificeerde vakmannen. Van daklekkage tot volledige renovatie —
              gratis offerte binnen 2 uur op basis van een nauwkeurige 3D-dakmeting.
            </p>

            {/* Twee CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <a href="#offerte" className="btn-primary text-center">
                Vraag gratis offerte aan →
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
              <span className="trust-badge">★ 4.9/5 Google</span>
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
// TRUST BAR
// ─────────────────────────────────────────────────────────────
const stats = [
  { value: '500+', label: 'Afgewerkte projecten' },
  { value: '10 jaar', label: 'Garantie' },
  { value: '2 uur', label: 'Reactietijd' },
  { value: '4.9★', label: 'Google-beoordeling' },
]

function TrustBar() {
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
// HOE WERKT HET — 3 stappen + video placeholder
// ─────────────────────────────────────────────────────────────
const stappen = [
  {
    nr: '01',
    icon: '📍',
    titel: 'Adres invoeren',
    tekst: 'Vul het adres van uw woning in. Onze tool localiseert uw dak automatisch via satellietdata.',
  },
  {
    nr: '02',
    icon: '🛰️',
    titel: 'Digitale dakmeting',
    tekst: 'Binnen seconden genereert het systeem een nauwkeurig 3D-model met alle afmetingen van uw dak.',
  },
  {
    nr: '03',
    icon: '📄',
    titel: 'Offerte ontvangen',
    tekst: 'U ontvangt een professionele offerte op maat, gebaseerd op de exacte dakoppervlakte en helling.',
  },
]

function HoeWerktHetSection() {
  return (
    <section className="section-padding bg-background">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="section-heading">Hoe werkt de digitale dakmeting?</h2>
          <p className="section-subheading mx-auto mt-4">
            Van adres tot offerte — in minder dan 2 uur, zonder bezoek ter plaatse.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Stappen */}
          <div className="space-y-8">
            {stappen.map((stap, i) => (
              <motion.div
                key={stap.nr}
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="flex gap-5"
              >
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-navy flex flex-col items-center justify-center">
                  <span className="text-amber text-xs font-bold leading-none">{stap.nr}</span>
                  <span className="text-xl leading-none mt-0.5">{stap.icon}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">{stap.titel}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{stap.tekst}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Video placeholder — wordt vervangen door Remotion explainer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative aspect-video rounded-2xl bg-navy overflow-hidden flex items-center justify-center cursor-pointer group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-navy-light/80 to-navy/90" />
            <div className="relative z-10 flex flex-col items-center gap-4 px-8 text-center">
              <div className="w-20 h-20 rounded-full bg-amber/90 flex items-center justify-center group-hover:bg-amber transition-colors shadow-lg">
                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-warm-white font-semibold">Bekijk hoe digitale dakmeting werkt</p>
              <p className="text-warm-white/50 text-xs">Uitlegvideo binnenkort beschikbaar</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// BEFORE / AFTER SECTION
// ─────────────────────────────────────────────────────────────
const pairs = [
  { before: 'https://picsum.photos/seed/roof1/800/600', after: 'https://picsum.photos/seed/roof4/800/600', label: 'Gent' },
  { before: 'https://picsum.photos/seed/roof2/800/600', after: 'https://picsum.photos/seed/roof5/800/600', label: 'Aalst' },
  { before: 'https://picsum.photos/seed/roof3/800/600', after: 'https://picsum.photos/seed/roof6/800/600', label: 'Sint-Niklaas' },
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
            Echte projecten in uw buurt — voor en na onze interventie.
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
              className="space-y-2"
            >
              <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden">
                <div className="relative aspect-[4/3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pair.before} alt={`Voor renovatie ${pair.label}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-foreground/40" />
                  <span className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1 rounded-full uppercase">
                    Voor
                  </span>
                </div>
                <div className="relative aspect-[4/3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pair.after} alt={`Na renovatie ${pair.label}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-emerald-500/10" />
                  <span className="absolute top-3 left-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
                    Na
                  </span>
                </div>
              </div>
              <p className="text-center text-sm font-medium text-muted-foreground">{pair.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// DIENSTEN SECTION
// ─────────────────────────────────────────────────────────────
const services = [
  { icon: '🔧', title: 'Daklekkage', desc: 'Snel en duurzaam hersteld, ook in het weekend.', color: 'bg-amber/10 border-amber' },
  { icon: '🏠', title: 'Dakrenovatie', desc: 'Volledig vernieuwd dak met energiepremies.', color: 'bg-blue-500/10 border-blue-500' },
  { icon: '❄️', title: 'Dakisolatie', desc: 'Bespaar tot 30% op uw energiefactuur.', color: 'bg-cyan-500/10 border-cyan-500' },
  { icon: '🏗️', title: 'Nieuw dak', desc: 'Van plat tot hellend dak, op maat.', color: 'bg-emerald-500/10 border-emerald-500' },
]

function DienstenSection() {
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
              <a href="#offerte" className="text-amber font-semibold text-sm group-hover:underline">
                Offerte aanvragen →
              </a>
            </motion.div>
          ))}
        </div>
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
// WAAROM WIJ — USPs
// ─────────────────────────────────────────────────────────────
const usps = [
  {
    icon: '📍',
    titel: 'Lokale vakmannen',
    tekst: 'Wij zijn actief in heel Oost-Vlaanderen en kennen de regio door en door.',
  },
  {
    icon: '⚡',
    titel: 'Razendsnelle service',
    tekst: 'Bij daklekkage of noodgeval zijn wij er binnen de dag. Geen wachttijden.',
  },
  {
    icon: '💰',
    titel: 'Eerlijke prijs',
    tekst: 'Transparante offertes zonder verborgen kosten. U weet altijd wat u betaalt.',
  },
  {
    icon: '🛰️',
    titel: 'AI-precisie',
    tekst: 'Dankzij digitale dakmeting is onze offerte exact — geen verrassingen achteraf.',
  },
  {
    icon: '🏆',
    titel: '10 jaar garantie',
    tekst: 'Wij staan 10 jaar garant voor ons werk. Dat geeft u gemoedsrust.',
  },
  {
    icon: '🌿',
    titel: 'Energiepremies',
    tekst: 'Wij begeleiden u bij het aanvragen van isolatie- en renovatiepremies.',
  },
]

function WaaromWijSection() {
  return (
    <section className="section-padding bg-navy">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-warm-white">
            Waarom kiezen voor ons?
          </h2>
          <p className="mt-4 text-lg text-warm-white/60 max-w-2xl mx-auto">
            Al meer dan 500 gezinnen in Oost-Vlaanderen kozen voor onze aanpak.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {usps.map((usp, i) => (
            <motion.div
              key={usp.titel}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="bg-navy-light rounded-2xl p-6 border border-white/10 hover:border-amber/40 transition-colors"
            >
              <div className="text-3xl mb-4">{usp.icon}</div>
              <h3 className="text-lg font-bold text-warm-white mb-2">{usp.titel}</h3>
              <p className="text-warm-white/60 text-sm leading-relaxed">{usp.tekst}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// SERVICE AREA — steden pills
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
// OFFERTE SECTIE — LeadForm naast CTA tekst
// ─────────────────────────────────────────────────────────────
function OfferteSection() {
  const phone = process.env.NEXT_PUBLIC_OWNER_PHONE ?? '0470 00 00 00'

  return (
    <section className="section-padding bg-secondary/50" id="offerte-sectie">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">

          {/* Links: CTA tekst */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="section-heading">
              Klaar voor een nauwkeurige offerte?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Vul het formulier in en ontvang binnen 2 uur een gepersonaliseerde offerte
              op basis van de digitale 3D-dakmeting van uw woning.
            </p>

            <ul className="mt-8 space-y-4">
              {[
                'Gratis en vrijblijvend',
                'Geen bezoek ter plaatse nodig',
                'Exacte meting op basis van satellietdata',
                'Offerte inclusief energiepremies',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-foreground">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber/20 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-10 p-5 bg-navy rounded-2xl">
              <p className="text-warm-white/70 text-sm mb-1">Liever direct bellen?</p>
              <a href={`tel:${phone}`} className="text-2xl font-black text-amber hover:text-amber-hover transition-colors">
                📞 {phone}
              </a>
            </div>
          </motion.div>

          {/* Rechts: formulier */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <LeadForm />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// CTA FOOTER
// ─────────────────────────────────────────────────────────────
function CTAFooter() {
  const phone = process.env.NEXT_PUBLIC_OWNER_PHONE ?? '0470 00 00 00'
  const whatsapp = process.env.NEXT_PUBLIC_OWNER_WHATSAPP ?? '32470000000'

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
            Dakprobleem? Wij lossen het op.
          </h2>
          <p className="mt-4 text-warm-white/60 text-lg max-w-xl mx-auto">
            Reactie binnen 2 uur, gratis offerte, geen verplichtingen.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#offerte" className="btn-primary text-center">
              Gratis offerte aanvragen →
            </a>
            <a href={`tel:${phone}`} className="btn-secondary text-center">
              📞 Direct bellen
            </a>
            <a
              href={`https://wa.me/${whatsapp}?text=Hallo%2C%20ik%20heb%20een%20dakprobleem.`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-center"
            >
              💬 WhatsApp
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
      <TrustBar />
      <HoeWerktHetSection />
      <BeforeAfterSection />
      <DienstenSection />
      <TestimonialsSection />
      <WaaromWijSection />
      <ServiceAreaSection />
      <OfferteSection />
      <CTAFooter />
    </>
  )
}
