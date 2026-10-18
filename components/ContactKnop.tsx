'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, X } from 'lucide-react'
import ChatWidget from '@/components/ChatWidget'

interface Props {
  whatsapp: string
}

// Eén zwevende contactknop (vervangt de aparte WhatsApp- en chatknop):
// opent een keuzemenu met WhatsApp of de chat op de site.
export default function ContactKnop({ whatsapp }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const whatsappUrl = `https://wa.me/${whatsapp}?text=${encodeURIComponent('Hallo, ik heb een vraag over mijn dak.')}`
  const ietsOpen = menuOpen || chatOpen

  useEffect(() => {
    if (!ietsOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setChatOpen(false)
      }
    }
    function onKlik(e: MouseEvent) {
      if (menuOpen && !wrapRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onKlik)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onKlik)
    }
  }, [ietsOpen, menuOpen])

  function wissel() {
    if (chatOpen) {
      setChatOpen(false)
      return
    }
    setMenuOpen((o) => !o)
  }

  // Niet in het beheerdashboard: daar zou de knop over de aanvragen vallen
  const pad = usePathname()
  if (pad?.startsWith('/dashboard')) return null

  return (
    <div ref={wrapRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <ChatWidget open={chatOpen} onClose={() => setChatOpen(false)} />

      {menuOpen && (
        <div id="contact-menu" className="w-64 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/5">
          <p className="px-3 pb-1 pt-2 text-xs font-semibold text-gray-600">Een vraag? Kies hoe u ons bereikt.</p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white">
              <MessageCircle aria-hidden="true" className="h-5 w-5" />
            </span>
            WhatsApp
          </a>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              setChatOpen(true)
            }}
            className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-white">
              <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </span>
            Chat op de site
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={wissel}
        aria-expanded={menuOpen}
        aria-controls="contact-menu"
        aria-label={ietsOpen ? 'Sluiten' : 'Contact'}
        className="flex h-14 items-center gap-2 rounded-full bg-navy px-5 text-white shadow-lg ring-2 ring-white/70 transition-colors hover:bg-navy-light"
      >
        {ietsOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <MessageCircle aria-hidden="true" className="h-5 w-5" />}
        <span className="hidden text-sm font-semibold sm:inline">{ietsOpen ? 'Sluiten' : 'Contact'}</span>
      </button>
    </div>
  )
}
