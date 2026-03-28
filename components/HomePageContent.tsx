'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import LeadFormModal from '@/components/LeadFormModal'

// ─────────────────────────────────────────────────────────────
// ICONEN
// ─────────────────────────────────────────────────────────────
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────
// 1. HERO SECTION
// ─────────────────────────────────────────────────────────────
function HeroSection({ onOpenForm }: { onOpenForm: () => void }) {
  const whatsapp = process.env.NEXT_PUBLIC_OWNER_WHATSAPP ?? '32470000000'
  const whatsappUrl = `https://wa.me/${whatsapp}?text=Hallo%2C%20ik%20heb%20een%20vraag%20over%20mijn%20dak.`

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Video achtergrond */}
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

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-sm font-semibold tracking-[0.2em] uppercase text-white/60 mb-5">
            Dakwerken · Oost-Vlaanderen
          </p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight">
            Uw dak gemeten.
            <br />
            <span className="text-amber">Offerte klaar.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-white/70 max-w-xl mx-auto leading-relaxed">
            Digitale 3D-dakmeting op basis van uw adres. Gratis offerte binnen 2 uur.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            {/* Primaire CTA */}
            <button
              onClick={onOpenForm}
              className="inline-flex items-center justify-center gap-2 bg-amber text-white font-bold px-8 py-4 rounded-xl hover:bg-amber-hover transition-colors text-base"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Bereken uw dak
            </button>

            {/* WhatsApp CTA */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 bg-white/10 border border-white/25 text-white font-bold px-8 py-4 rounded-xl hover:bg-white/20 transition-colors text-base backdrop-blur-sm"
            >
              <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
              Chat met expert
            </a>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </motion.div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// 2. HOE WERKT HET
// ─────────────────────────────────────────────────────────────
const stappen = [
  { nr: '01', titel: 'Adres invoeren', tekst: 'Vul het adres van uw woning in via ons formulier. Het systeem localiseert uw dak automatisch.' },
  { nr: '02', titel: 'Digitale dakmeting', tekst: 'Binnen seconden genereert het systeem een nauwkeurig 3D-model met alle afmetingen van uw dak.' },
  { nr: '03', titel: 'Offerte ontvangen', tekst: 'U ontvangt een professionele offerte op maat, gebaseerd op de exacte dakoppervlakte en helling.' },
]

function HoeWerktHetSection() {
  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <p className="text-sm font-semibold tracking-widest uppercase text-amber mb-3">Werkwijze</p>
          <h2 className="text-4xl sm:text-5xl font-black text-navy leading-tight max-w-lg">
            Van adres tot offerte in 3 stappen
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Stappen */}
          <div className="space-y-10">
            {stappen.map((stap, i) => (
              <motion.div
                key={stap.nr}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="flex gap-6"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-navy flex items-center justify-center">
                  <span className="text-amber text-sm font-black">{stap.nr}</span>
                </div>
                <div className="pt-1">
                  <h3 className="text-lg font-bold text-navy mb-1">{stap.titel}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{stap.tekst}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Video placeholder */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative aspect-video rounded-2xl bg-navy overflow-hidden"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
              poster="/explainer-poster.jpg"
            >
              <source src="/explainer.mp4" type="video/mp4" />
            </video>
            {/* Fallback overlay als video ontbreekt */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-amber flex items-center justify-center shadow-lg mb-3">
                <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-white/60 text-sm">Uitlegvideo binnenkort beschikbaar</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// 3. BEFORE / AFTER
// ─────────────────────────────────────────────────────────────
const pairs = [
  { before: 'https://picsum.photos/seed/roof1/800/600', after: 'https://picsum.photos/seed/roof4/800/600', city: 'Gent', type: 'Dakrenovatie' },
  { before: 'https://picsum.photos/seed/roof2/800/600', after: 'https://picsum.photos/seed/roof5/800/600', city: 'Aalst', type: 'Daklekkage' },
  { before: 'https://picsum.photos/seed/roof3/800/600', after: 'https://picsum.photos/seed/roof6/800/600', city: 'Dendermonde', type: 'Isolatie' },
]

function BeforeAfterSection() {
  return (
    <section className="py-24 sm:py-32 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <p className="text-sm font-semibold tracking-widest uppercase text-amber mb-3">Resultaten</p>
          <h2 className="text-4xl sm:text-5xl font-black text-navy leading-tight">
            Het verschil dat wij maken
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {pairs.map((pair, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm"
            >
              {/* Beelden */}
              <div className="grid grid-cols-2 gap-px bg-gray-200">
                <div className="relative aspect-[4/3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pair.before} alt={`Voor - ${pair.type} ${pair.city}`} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                    Voor
                  </span>
                </div>
                <div className="relative aspect-[4/3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pair.after} alt={`Na - ${pair.type} ${pair.city}`} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                    Na
                  </span>
                </div>
              </div>
              {/* Label */}
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-navy">{pair.type}</span>
                <span className="text-xs text-gray-400">{pair.city}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// 4. WAAROM WIJ
// ─────────────────────────────────────────────────────────────
const usps = [
  { titel: 'Digitale precisie', tekst: 'Exacte dakmetingen op basis van satellietdata. Geen geschat werk, geen verrassingen.' },
  { titel: 'Binnen 2 uur', tekst: 'Offerte in uw mailbox binnen 2 uur op werkdagen. U beslist op uw eigen tempo.' },
  { titel: 'Lokale vakmannen', tekst: 'Gecertificeerde dakwerkers actief in heel Oost-Vlaanderen. Snel ter plaatse.' },
  { titel: '10 jaar garantie', tekst: 'Wij staan 10 jaar garant voor elk uitgevoerd werk. Kwaliteit die blijft.' },
  { titel: 'Eerlijke prijs', tekst: 'Transparante offertes zonder verborgen kosten of onaangename verrassingen.' },
  { titel: 'Energiepremies', tekst: 'Wij begeleiden u bij alle premieaanvragen voor isolatie en renovatie.' },
]

function WaaromWijSection({ onOpenForm }: { onOpenForm: () => void }) {
  return (
    <section className="py-24 sm:py-32 bg-navy">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <p className="text-sm font-semibold tracking-widest uppercase text-amber mb-3">Waarom ons</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight max-w-lg">
            Meer dan 500 tevreden klanten
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {usps.map((usp, i) => (
            <motion.div
              key={usp.titel}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              className="border border-white/10 rounded-xl p-6 hover:border-amber/40 transition-colors"
            >
              <h3 className="text-white font-bold mb-2">{usp.titel}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{usp.tekst}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <button
            onClick={onOpenForm}
            className="inline-flex items-center gap-2 bg-amber text-white font-bold px-10 py-4 rounded-xl hover:bg-amber-hover transition-colors text-base"
          >
            Bereken uw dak gratis →
          </button>
          <p className="mt-3 text-white/40 text-sm">Geen verplichtingen. Gratis en vrijblijvend.</p>
        </motion.div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// HOOFD EXPORT
// ─────────────────────────────────────────────────────────────
export default function HomePageContent() {
  const [formOpen, setFormOpen] = useState(false)

  return (
    <>
      <HeroSection onOpenForm={() => setFormOpen(true)} />
      <HoeWerktHetSection />
      <BeforeAfterSection />
      <WaaromWijSection onOpenForm={() => setFormOpen(true)} />

      {formOpen && <LeadFormModal onClose={() => setFormOpen(false)} />}
    </>
  )
}
