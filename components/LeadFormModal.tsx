'use client'

import { useEffect } from 'react'
import DakRapportFunnel from '@/components/DakRapportFunnel'

interface Props {
  onClose: () => void
}

export default function LeadFormModal({ onClose }: Props) {
  // Sluit bij Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel — wrapper rond DakRapportFunnel met sluit-knop */}
      <div className="relative z-10 w-full max-w-2xl my-8">
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-lg hover:bg-gray-50 text-gray-600 transition-colors"
          aria-label="Sluit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <DakRapportFunnel />
      </div>
    </div>
  )
}
