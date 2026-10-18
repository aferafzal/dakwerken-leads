'use client'

import { useState } from 'react'
import { Check, Download, Link2, Mail, MessageCircle } from 'lucide-react'

// Rapport bewaren of doorsturen. Niet zichtbaar op papier.
export default function DeelKnoppen({ adres, donker = false }: { adres: string; donker?: boolean }) {
  const [gekopieerd, setGekopieerd] = useState(false)

  const link = () => window.location.href
  const tekst = () => `Mijn dakrapport voor ${adres}: ${link()}`

  async function kopieer() {
    try {
      await navigator.clipboard.writeText(link())
      setGekopieerd(true)
      setTimeout(() => setGekopieerd(false), 2500)
    } catch { /* kopiëren niet toegestaan: de knop doet dan niets */ }
  }

  const knop = donker
    ? 'border-white/25 text-white hover:border-white/60'
    : 'border-slate-300 text-navy hover:border-navy'
  const klasse = `inline-flex min-h-11 items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold transition-colors ${knop}`

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button type="button" onClick={() => window.print()} className={klasse}>
        <Download className="h-4 w-4" aria-hidden />
        Bewaar als PDF
      </button>
      <button type="button" onClick={kopieer} className={klasse} aria-live="polite">
        {gekopieerd ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
        {gekopieerd ? 'Link gekopieerd' : 'Kopieer link'}
      </button>
      <button
        type="button"
        onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(tekst())}`, '_blank', 'noopener')}
        className={klasse}
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        WhatsApp
      </button>
      <button
        type="button"
        onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent(`Dakrapport ${adres}`)}&body=${encodeURIComponent(tekst())}` }}
        className={klasse}
      >
        <Mail className="h-4 w-4" aria-hidden />
        E-mail
      </button>
    </div>
  )
}
