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
    <html lang="nl" className="h-full antialiased">
      <body className={`${inter.className} min-h-full flex flex-col bg-gray-50`}>
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-green-700">Dakwerken</span>
              <span className="text-xl font-semibold text-gray-700">Oost-Vlaanderen</span>
            </Link>
            <a
              href={`tel:${OWNER_PHONE}`}
              className="flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">{OWNER_PHONE}</span>
              <span className="sm:hidden">Bel nu</span>
            </a>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-gray-200 bg-gray-900 text-gray-400">
          <div className="mx-auto max-w-6xl px-4 py-10">
            <div className="grid gap-8 sm:grid-cols-3">
              <div>
                <p className="mb-2 font-bold text-white">Dakwerken Oost-Vlaanderen</p>
                <p className="text-sm">
                  Professionele dakwerken in heel Oost-Vlaanderen. Snelle service, eerlijke
                  prijzen, garantie op elk werk.
                </p>
              </div>
              <div>
                <p className="mb-2 font-bold text-white">Contact</p>
                <ul className="space-y-1 text-sm">
                  <li>
                    <a href={`tel:${OWNER_PHONE}`} className="hover:text-white">
                      📞 {OWNER_PHONE}
                    </a>
                  </li>
                  <li>
                    <a
                      href={`https://wa.me/${OWNER_WHATSAPP}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white"
                    >
                      💬 WhatsApp
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <p className="mb-2 font-bold text-white">Info</p>
                <ul className="space-y-1 text-sm">
                  <li>
                    <Link href="/privacy" className="hover:text-white">
                      Privacyverklaring
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard" className="hover:text-white">
                      Dashboard
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <p className="mt-8 text-center text-xs text-gray-600">
              © {new Date().getFullYear()} Dakwerken Oost-Vlaanderen. Alle rechten voorbehouden.
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
