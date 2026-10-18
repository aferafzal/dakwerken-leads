'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

// De funnel (met de formuliercontrole) hoort niet bij de eerste lading van de homepage.
// Hij wordt na het laden van de pagina op de achtergrond opgehaald, of bij de eerste opening.
const laadFunnel = () => import('@/components/DakRapportFunnel')
const DakRapportFunnel = dynamic(laadFunnel, {
  ssr: false,
  loading: () => (
    <div role="status" className="flex min-h-[320px] w-full items-center justify-center rounded-2xl bg-white shadow-2xl">
      <span className="text-sm font-semibold text-gray-600">Even laden…</span>
    </div>
  ),
})

interface Props {
  open: boolean
  onClose: () => void
  // Adres dat al op de homepage gekozen werd
  startVerzoek?: { adres: string; id: number } | null
}

const FOCUSBAAR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'

// Na de eerste opening blijft de funnel gemount terwijl de modal dicht is,
// zodat sluiten (Escape, achtergrond, kruisje) de voortgang niet meer wist.
export default function LeadFormModal({ open, onClose, startVerzoek = null }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const sluitRef = useRef(onClose)
  sluitRef.current = onClose
  const [ooitOpen, setOoitOpen] = useState(open)
  if (open && !ooitOpen) setOoitOpen(true)

  useEffect(() => {
    const vooraf = () => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(() => void laadFunnel(), { timeout: 3000 })
      else setTimeout(() => void laadFunnel(), 1000) // Safari kent requestIdleCallback niet
    }
    if (document.readyState === 'complete') {
      vooraf()
      return
    }
    window.addEventListener('load', vooraf, { once: true })
    return () => window.removeEventListener('load', vooraf)
  }, [])

  useEffect(() => {
    if (!open) return
    const terugFocus = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'

    // Focus naar het eerste invoerveld (of de eerste knop) in de funnel
    const timer = setTimeout(() => {
      const panel = panelRef.current
      const doel =
        panel?.querySelector<HTMLElement>('input:not([type="checkbox"])') ??
        panel?.querySelector<HTMLElement>(FOCUSBAAR)
      doel?.focus()
    }, 50)

    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented) return // bv. Escape die enkel de adreslijst sluit
      if (e.key === 'Escape') {
        sluitRef.current()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      // Focus binnen de modal houden
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSBAAR))
        .filter((el) => el.offsetParent !== null)
      if (items.length === 0) return
      const eerste = items[0]
      const laatste = items[items.length - 1]
      if (e.shiftKey && document.activeElement === eerste) {
        e.preventDefault()
        laatste.focus()
      } else if (!e.shiftKey && document.activeElement === laatste) {
        e.preventDefault()
        eerste.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      terugFocus?.focus()
    }
  }, [open])

  return (
    <div
      className={`fixed inset-0 z-[100] items-start justify-center overflow-y-auto px-4 py-8 ${open ? 'flex' : 'hidden'}`}
      role="dialog"
      aria-modal="true"
      aria-label="Gratis dakrapport"
    >
      {/* Achtergrond */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => sluitRef.current()}
      />

      {/* Paneel — my-auto centreert alleen als er plaats is; een hoge stap blijft volledig scrollbaar */}
      <div ref={panelRef} className="relative z-10 my-auto w-full max-w-2xl">
        <button
          type="button"
          onClick={() => sluitRef.current()}
          className="absolute -right-2 -top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg transition-colors hover:bg-gray-50 sm:-right-3"
          aria-label="Sluit"
        >
          <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {ooitOpen && <DakRapportFunnel zichtbaar={open} startVerzoek={startVerzoek} />}
      </div>
    </div>
  )
}
