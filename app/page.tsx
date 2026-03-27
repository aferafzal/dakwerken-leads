import type { Metadata } from 'next'
import { CheckCircle, Clock, Shield, Star } from 'lucide-react'
import LeadForm from '@/components/LeadForm'
import { steden } from '@/lib/steden'

export const metadata: Metadata = {
  title: 'Dakwerken Oost-Vlaanderen — Gratis Offerte Binnen 2 Uur',
  description:
    'Daklekkage, isolatie of renovatie? Onze dakspecialisten in Oost-Vlaanderen bellen u terug binnen 2 uur. Gratis offerte, geen verplichtingen.',
}

const diensten = [
  { icon: '🔧', titel: 'Daklekkage', tekst: 'Snel en duurzaam hersteld — ook in het weekend.' },
  { icon: '🏠', titel: 'Dakrenovatie', tekst: 'Volledig vernieuwd dak met energiepremies.' },
  { icon: '❄️', titel: 'Dakisolatie', tekst: 'Bespaar tot 30% op uw energiefactuur.' },
  { icon: '🏗️', titel: 'Nieuw dak', tekst: 'Van plat dak tot hellend dak, op maat gebouwd.' },
]

const vertrouwen = [
  { icon: <CheckCircle className="h-5 w-5 text-green-300" />, label: '100+ projecten' },
  { icon: <Clock className="h-5 w-5 text-green-300" />, label: 'Reactie binnen 2 uur' },
  { icon: <Shield className="h-5 w-5 text-green-300" />, label: '10 jaar garantie' },
  { icon: <Star className="h-5 w-5 text-green-300" />, label: '4.9/5 ★★★★★' },
]

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-800 to-green-600 py-16 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h1 className="mb-4 text-4xl font-extrabold leading-tight sm:text-5xl">
                Dakwerken in Oost-Vlaanderen
                <span className="block text-green-200">Gratis offerte binnen 2 uur</span>
              </h1>
              <p className="mb-6 text-lg text-green-100">
                Daklekkage? Renovatie nodig? Onze gecertificeerde dakspecialisten staan voor u klaar
                in heel Oost-Vlaanderen. Snelle service, eerlijke prijzen, 10 jaar garantie.
              </p>
              <div className="flex flex-wrap gap-3">
                {vertrouwen.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium"
                  >
                    {item.icon}
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:pl-8">
              <LeadForm />
            </div>
          </div>
        </div>
      </section>

      {/* Diensten */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-10 text-center text-3xl font-bold text-gray-900">Onze dakdiensten</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {diensten.map((dienst) => (
              <div
                key={dienst.titel}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="mb-3 text-4xl">{dienst.icon}</div>
                <h3 className="mb-2 font-bold text-gray-900">{dienst.titel}</h3>
                <p className="text-sm text-gray-600">{dienst.tekst}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Werkgebied */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900">
            Actief in heel Oost-Vlaanderen
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-gray-600">
            Van Gent tot Sint-Niklaas, van Aalst tot Eeklo — onze dakspecialisten zijn actief in
            alle gemeenten van Oost-Vlaanderen.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {steden.map((stad) => (
              <a
                key={stad.slug}
                href={`/dakwerken-${stad.slug}`}
                className="rounded-full bg-green-50 px-4 py-1.5 text-sm font-medium text-green-800 hover:bg-green-100 transition-colors"
              >
                {stad.naam}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-green-700 py-14 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold">Klaar om uw dak te laten herstellen?</h2>
          <p className="mb-8 text-green-100">
            Vraag nu een gratis offerte aan. We nemen binnen 2 uur contact op.
          </p>
          <a
            href="#"
            className="inline-block rounded-lg bg-white px-8 py-3 font-semibold text-green-700 shadow hover:bg-green-50 transition-colors"
          >
            Gratis offerte aanvragen →
          </a>
        </div>
      </section>
    </>
  )
}
