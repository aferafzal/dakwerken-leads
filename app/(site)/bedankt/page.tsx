import type { Metadata } from 'next'
import { CircleCheck, Phone } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Aanvraag ontvangen — Bedankt',
  robots: { index: false },
}

export default function BedanktPage() {
  return (
    <>
      <section className="bg-navy pt-32 pb-12 text-white">
        <div className="mx-auto max-w-lg px-4 text-center">
          <CircleCheck className="mx-auto mb-5 h-14 w-14 text-green-400" aria-hidden />
          <h1 className="text-3xl font-extrabold text-balance">Uw aanvraag is ontvangen</h1>
        </div>
      </section>
      <section className="flex flex-1 justify-center py-12">
        <div className="mx-auto max-w-lg px-4 text-center">
          <p className="mb-3 text-lg text-gray-700">
            U wordt <strong>binnen 2 uur</strong> gebeld (op werkdagen) om uw offerte te
            bespreken.
          </p>
          <p className="mb-8 text-gray-600">
            Heeft u een dringende daklekkage? Bel ons dan meteen.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href={`tel:${process.env.NEXT_PUBLIC_OWNER_PHONE ?? '0470 00 00 00'}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800"
            >
              <Phone className="h-4 w-4" aria-hidden />
              Bel ons
            </a>
            <Link
              href="/"
              className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Terug naar de homepage
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
