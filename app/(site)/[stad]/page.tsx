import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { steden, getStadBySlug } from '@/lib/steden'
import LeadForm from '@/components/LeadForm'

interface Props {
  params: Promise<{ stad: string }>
}

export async function generateStaticParams() {
  return steden.map((stad) => ({ stad: `dakwerken-${stad.slug}` }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { stad } = await params
  const slug = stad.replace('dakwerken-', '')
  const stadData = getStadBySlug(slug)
  if (!stadData) return {}

  return {
    title: `Dakwerken ${stadData.naam} — Gratis Offerte`,
    description: `${stadData.beschrijving} Gratis offerte binnen 2 uur. Gecertificeerde dakspecialisten actief in ${stadData.naam} en omgeving.`,
  }
}

export default async function StadPage({ params }: Props) {
  const { stad } = await params
  const slug = stad.replace('dakwerken-', '')
  const stadData = getStadBySlug(slug)

  if (!stadData) notFound()

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-800 to-green-600 py-14 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h1 className="mb-4 text-4xl font-extrabold leading-tight">
                Dakwerken in {stadData.naam}
                <span className="block text-green-200">Gratis offerte binnen 2 uur</span>
              </h1>
              <p className="text-lg text-green-100">{stadData.beschrijving}</p>
            </div>
            <div className="lg:pl-8">
              <LeadForm defaultGemeente={stadData.naam} />
            </div>
          </div>
        </div>
      </section>

      {/* Lokale inhoud */}
      <section className="py-14">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            Uw dakspecialist in {stadData.naam}
          </h2>
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              Op zoek naar een betrouwbare dakwerker in {stadData.naam}? Wij zijn lokaal actief
              in {stadData.naam} en omliggende gemeenten van {stadData.regio}. Of het nu gaat om
              een kleine daklekkage of een volledige dakrenovatie — onze specialisten staan voor
              u klaar.
            </p>
            <p>
              Onze dakwerkers in {stadData.naam} werken met hoogwaardige materialen en bieden
              altijd een uitgebreide garantie op uitgevoerde werken. We werken snel en efficiënt,
              zodat u niet lang met problemen hoeft te zitten.
            </p>
            <p>
              Vraag vandaag nog een gratis offerte aan voor uw dakproject in {stadData.naam}.
              We nemen binnen 2 uur telefonisch contact met u op om uw situatie te bespreken en
              een afspraak in te plannen.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { icon: '🔧', label: 'Daklekkage hersteld in 24-48u' },
              { icon: '🏠', label: 'Dakrenovatie met energiepremies' },
              { icon: '❄️', label: 'Dakisolatie voor meer comfort' },
              { icon: '✅', label: '10 jaar garantie op alle werken' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl bg-green-50 p-4"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="font-medium text-green-900">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
