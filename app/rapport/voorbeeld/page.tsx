import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { maakRapport, type LeadRow } from '@/lib/rapport'
import Rapport from '@/components/rapport/Rapport'

// Testrapport met enkel publieke gegevens (geen lead uit de databank), om het rapport te kunnen
// bekijken en printen zonder een echte aanvraag. Niet beschikbaar op de live site.
export const metadata: Metadata = {
  title: 'Testrapport',
  robots: { index: false, follow: false },
}

export default async function VoorbeeldRapport({ searchParams }: { searchParams: Promise<{ oud?: string }> }) {
  if (process.env.VERCEL_ENV === 'production') notFound()
  // ?oud=1: een rapport zoals ze vóór de dakscan bewaard werden (enkel een totaal)
  const oud = (await searchParams).oud === '1'

  const lead: LeadRow = {
    id: 'testrapport',
    email: null,
    adres: 'Markt 59, 9900 Eeklo',
    gemeente: 'Eeklo',
    dak_oppervlakte: null,
    bouwjaar: '1980_2000',
    laatste_dakwerken: 'meer_15j',
    lekkage_recent: 'nee',
    type_werken: ['isolatie'],
    dak_data: oud
      ? { lat: 51.184449, lng: 3.56538, oppervlakte: 119, nokhoogte: 13.34, daktype: 'hoofdgebouw' }
      : { lat: 51.184449, lng: 3.56538, gebouwen: [{ id: '18083924', woning: true }] },
    created_at: new Date().toISOString(),
  }

  return <Rapport data={await maakRapport(lead)} voorbeeld />
}
