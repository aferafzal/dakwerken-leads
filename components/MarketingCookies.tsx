'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { KEUZE_EVENT, META_PIXEL_ID, bewaarKeuze, laadMetaPixel, leesKeuze, vergeetKeuze } from '@/lib/meta-pixel'

// Vraagt één keer of we de Meta-pixel mogen gebruiken en laadt die enkel na "ja".
// "Nee" en "ja" zijn even groot en even makkelijk (richtlijn Gegevensbeschermingsautoriteit).
// Zonder NEXT_PUBLIC_META_PIXEL_ID verschijnt er niets.
export default function MarketingCookies() {
  const [vragen, setVragen] = useState(false)

  useEffect(() => {
    if (!META_PIXEL_ID) return
    const bijwerken = () => {
      const k = leesKeuze()
      setVragen(k === null)
      if (k === 'ja') laadMetaPixel()
    }
    bijwerken()
    window.addEventListener(KEUZE_EVENT, bijwerken)
    return () => window.removeEventListener(KEUZE_EVENT, bijwerken)
  }, [])

  if (!vragen) return null
  return (
    <div role="dialog" aria-label="Cookies" className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-200 sm:p-5">
        <p className="text-sm leading-relaxed text-slate-700">
          Mogen we cookies van Meta (Facebook) gebruiken om te meten welke advertenties werken?
          Zonder uw ja plaatsen we ze niet. De site werkt in beide gevallen.{' '}
          <Link href="/privacy#cookies" className="underline underline-offset-2 hover:text-slate-900">Meer uitleg</Link>
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => bewaarKeuze('nee')}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
            Nee, liever niet
          </button>
          <button type="button" onClick={() => bewaarKeuze('ja')}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
            Ja, dat mag
          </button>
        </div>
      </div>
    </div>
  )
}

/** Knop op de privacypagina: de keuze opnieuw maken */
export function CookieKeuzeWijzigen() {
  const [keuze, setKeuze] = useState<string | null>(null)
  useEffect(() => {
    const bijwerken = () => setKeuze(leesKeuze())
    bijwerken()
    window.addEventListener(KEUZE_EVENT, bijwerken)
    return () => window.removeEventListener(KEUZE_EVENT, bijwerken)
  }, [])
  if (!META_PIXEL_ID) return null
  return (
    <p className="mt-3 text-sm text-slate-600">
      Uw keuze: <strong>{keuze === 'ja' ? 'cookies van Meta toegestaan' : keuze === 'nee' ? 'geen cookies van Meta' : 'nog niet gekozen'}</strong>.{' '}
      <button type="button" onClick={() => vergeetKeuze()} className="underline underline-offset-2 hover:text-slate-900">
        Keuze wijzigen
      </button>
    </p>
  )
}
