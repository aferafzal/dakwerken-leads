import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Clock, Droplets, House, Thermometer } from 'lucide-react'
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
    description: `${stadData.beschrijving} Gratis offerte binnen 2 uur. Gecertificeerde dakwerkers uit ons netwerk, actief in ${stadData.naam} en omgeving.`,
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
            Een gecertificeerde dakwerker in {stadData.naam}
          </h2>
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              Op zoek naar een betrouwbare dakwerker in {stadData.naam}? Wij brengen u in contact
              met een gecertificeerde dakwerker uit ons netwerk die actief is in {stadData.naam} en
              de omliggende gemeenten van {stadData.regio}. Of het nu gaat om een kleine daklekkage
              of een volledige dakrenovatie.
            </p>
            <p>
              Vraag vandaag nog een gratis offerte aan voor uw dakproject in {stadData.naam}. U
              wordt binnen 2 uur gebeld (op werkdagen) om uw situatie te bespreken en een
              plaatsbezoek in te plannen.
            </p>
            <p>
              Eerst weten hoe uw dak ervoor staat?{' '}
              <Link href="/" className="font-semibold text-green-800 underline underline-offset-2">
                Vraag een gratis dakrapport aan
              </Link>{' '}
              met de oppervlakte, mogelijke premies en een kostenindicatie voor uw woning.
            </p>
          </div>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { Icon: Droplets,    label: 'Daklekkages opsporen en herstellen' },
              { Icon: House,       label: 'Dakrenovatie' },
              { Icon: Thermometer, label: 'Dakisolatie' },
              { Icon: Clock,       label: 'Gratis offerte binnen 2 uur' },
            ].map(({ Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-3 rounded-xl bg-green-50 p-4"
              >
                <Icon className="h-5 w-5 flex-shrink-0 text-green-700" aria-hidden />
                <span className="font-medium text-green-900">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
