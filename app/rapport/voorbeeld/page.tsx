import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { maakRapport, type LeadRow } from '@/lib/rapport'
import type { Antwoorden } from '@/lib/prijsmodel'
import Rapport from '@/components/rapport/Rapport'

// Testrapport met enkel publieke gegevens (geen lead uit de databank), om het rapport te kunnen
// bekijken en printen zonder een echte aanvraag. Niet beschikbaar op de live site.
export const metadata: Metadata = {
  title: 'Testrapport',
  robots: { index: false, follow: false },
}

export default async function VoorbeeldRapport({ searchParams }: { searchParams: Promise<{ oud?: string; antwoorden?: string }> }) {
  if (process.env.VERCEL_ENV === 'production') notFound()
  // ?oud=1: een rapport zoals ze vóór de dakscan bewaard werden (enkel een totaal)
  // ?antwoorden=…: zoals na "Maak mijn prijs nauwkeuriger"; zonder: het algemene rapport
  const zoek = await searchParams
  const oud = zoek.oud === '1'
  let antwoorden: Antwoorden | undefined
  try { antwoorden = zoek.antwoorden ? JSON.parse(zoek.antwoorden) : undefined } catch { antwoorden = undefined }

  const lead: LeadRow = {
    id: 'testrapport',
    email: null,
    adres: 'Markt 59, 9900 Eeklo',
    gemeente: 'Eeklo',
    dak_oppervlakte: null,
    bouwjaar: null,
    laatste_dakwerken: 'meer_15j',
    lekkage_recent: 'nee',
    type_werken: null,
    dak_data: oud
      ? { lat: 51.184449, lng: 3.56538, oppervlakte: 119, nokhoogte: 13.34, daktype: 'hoofdgebouw' }
      : {
          lat: 51.184449,
          lng: 3.56538,
          gebouwen: [{ id: '18083924', woning: true }],
          verfijnd: !!antwoorden,
          antwoorden,
        },
    created_at: new Date().toISOString(),
  }

  return <Rapport data={await maakRapport(lead)} sessionId={null} voorbeeld />
}
