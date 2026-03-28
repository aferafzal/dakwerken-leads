import type { Metadata } from 'next'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Aanvraag ontvangen — Bedankt',
  robots: { index: false },
}

export default function BedanktPage() {
  return (
    <section className="flex flex-1 items-center justify-center py-20">
      <div className="mx-auto max-w-lg px-4 text-center">
        <div className="mb-6 flex justify-center">
          <CheckCircle className="h-20 w-20 text-green-500" />
        </div>
        <h1 className="mb-4 text-3xl font-extrabold text-gray-900">
          Uw aanvraag is ontvangen!
        </h1>
        <p className="mb-3 text-lg text-gray-700">
          Bedankt! We starten de digitale dakmeting van uw woning en contacteren u
          <strong> binnen 2 uur</strong> met een gepersonaliseerde offerte (op werkdagen).
        </p>
        <p className="mb-8 text-gray-500">
          Heeft u een dringende daklekkage? Bel ons dan direct.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href={`tel:${process.env.NEXT_PUBLIC_OWNER_PHONE ?? '0470 00 00 00'}`}
            className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
          >
            📞 Direct bellen
          </a>
          <Link
            href="/"
            className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
          >
            Terug naar homepage
          </Link>
        </div>
      </div>
    </section>
  )
}
