'use client'

import { useEffect, useRef } from 'react'
import DakRapportFunnel from '@/components/DakRapportFunnel'

interface Props {
  open: boolean
  onClose: () => void
}

const FOCUSBAAR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'

// De funnel blijft gemount terwijl de modal dicht is, zodat sluiten
// (Escape, achtergrond, kruisje) de voortgang niet meer wist.
export default function LeadFormModal({ open, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const sluitRef = useRef(onClose)
  sluitRef.current = onClose

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
      className={`fixed inset-0 z-[100] items-start justify-center overflow-y-auto p-4 sm:items-center ${open ? 'flex' : 'hidden'}`}
      role="dialog"
      aria-modal="true"
      aria-label="Gratis dakrapport"
    >
      {/* Achtergrond */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => sluitRef.current()}
      />

      {/* Paneel — wrapper rond DakRapportFunnel met sluitknop */}
      <div ref={panelRef} className="relative z-10 my-8 w-full max-w-2xl">
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

        <DakRapportFunnel zichtbaar={open} />
      </div>
    </div>
  )
}
