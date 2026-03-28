import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { Phone } from 'lucide-react'
import WhatsAppButton from '@/components/WhatsAppButton'
import ChatWidget from '@/components/ChatWidget'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Dakwerken Oost-Vlaanderen — Gratis Offerte',
    template: '%s | Dakwerken Oost-Vlaanderen',
  },
  description:
    'Professionele dakwerken in Oost-Vlaanderen. Daklekkage, isolatie, renovatie of nieuw dak — gratis offerte binnen 2 uur.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dakwerken-oostvlaanderen.be'
  ),
}

const OWNER_PHONE = process.env.NEXT_PUBLIC_OWNER_PHONE ?? '0470 00 00 00'
const OWNER_WHATSAPP = process.env.NEXT_PUBLIC_OWNER_WHATSAPP ?? '32470000000'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="nl" className="h-full antialiased scroll-smooth">
      <body className={`${inter.className} min-h-full flex flex-col bg-white`}>
        <header className="absolute top-0 left-0 right-0 z-40">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-5">
            <Link href="/" className="flex items-center gap-1.5">
              <span className="text-lg font-black text-white">Dakwerken</span>
              <span className="text-lg font-light text-white/70">Oost-Vlaanderen</span>
            </Link>
            <a
              href={`tel:${OWNER_PHONE}`}
              className="flex items-center gap-2 rounded-full border border-white/25 text-white/80 hover:text-white hover:border-white/50 px-4 py-2 text-sm font-medium transition-colors backdrop-blur-sm"
            >
              <Phone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{OWNER_PHONE}</span>
              <span className="sm:hidden">Bel nu</span>
            </a>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="bg-navy border-t border-white/10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
            <div className="flex flex-col sm:flex-row justify-between gap-6 text-sm text-white/40">
              <div>
                <p className="font-bold text-white mb-1">Dakwerken Oost-Vlaanderen</p>
                <p>Professionele dakwerken — snel, eerlijk, met garantie.</p>
              </div>
              <div className="flex gap-6">
                <a href={`tel:${OWNER_PHONE}`} className="hover:text-white transition-colors">{OWNER_PHONE}</a>
                <a href={`https://wa.me/${OWNER_WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp</a>
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
              </div>
            </div>
            <p className="mt-6 text-xs text-white/20">
              © {new Date().getFullYear()} Dakwerken Oost-Vlaanderen
            </p>
          </div>
        </footer>

        <WhatsAppButton
          phone={OWNER_WHATSAPP}
          message="Hallo, ik heb een vraag over dakwerken in Oost-Vlaanderen."
        />
        <ChatWidget />
      </body>
    </html>
  )
}
