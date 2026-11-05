// Verzonnen aanvragen voor de voorbeeldmodus van het dashboard (DASHBOARD_VOORBEELD=1, enkel lokaal).
// Geen echte personen: namen, straten, e-mail (@example.com) en nummers zijn verzonnen.
import type { Lead, TijdlijnRegel } from './weergave'
import type { Bericht } from './gegevens'
import type { Antwoorden, DakMaten } from '@/lib/prijsmodel'

const uurGeleden = (u: number) => new Date(Date.now() - u * 3_600_000).toISOString()
const binnenUur = (u: number) => new Date(Date.now() + u * 3_600_000).toISOString()

type Basis = {
  id: string; uren: number; naam?: string; email: string; telefoon?: string; adres: string; gemeente: string
  lat: number; lng: number; maten: DakMaten; antwoorden: Antwoorden; verfijnd?: boolean
  opvolging?: string; notitie?: string; bron?: 'fb' | 'pagina' | null; advertentie?: string
  volgende?: [string, number]; archief?: boolean; reactie?: number
}

const BASIS: Basis[] = [
  { id: '00000000-0000-4000-8000-000000000001', uren: 1.5, email: 'jan.voorbeeld@example.com', adres: 'Kerkstraat 12', gemeente: 'Eeklo',
    lat: 51.1853, lng: 3.5636, maten: { hellend: 118, plat: 0, nokhoogte: 8.2, gootlengte: 18 },
    antwoorden: { werken: ['dakbedekking'], start: 'binnen_3_maanden' }, bron: 'fb', advertentie: 'Kort2' },
  { id: '00000000-0000-4000-8000-000000000002', uren: 4, naam: 'Els Testers', email: 'els.testers@example.com', telefoon: '0470 00 00 02',
    adres: 'Molenweg 4', gemeente: 'Lokeren', lat: 51.1036, lng: 3.9935, maten: { hellend: 96, plat: 14, nokhoogte: 7.6, gootlengte: 16 },
    antwoorden: { werken: ['dakbedekking', 'isolatie'], materiaal: 'betonpannen', bouwjaar: '1980_2000', woningtype: 'halfopen', start: 'zo_snel_mogelijk' },
    verfijnd: true, bron: 'fb', advertentie: 'Kort1' },
  { id: '00000000-0000-4000-8000-000000000003', uren: 22, naam: 'Pieter Proef', email: 'pieter.proef@example.com', telefoon: '0470 00 00 03',
    adres: 'Stationsplein 9', gemeente: 'Aalst', lat: 50.9368, lng: 4.0396, maten: { hellend: 140, plat: 0, nokhoogte: 9.1, gootlengte: 22 },
    antwoorden: { werken: ['dakbedekking'], materiaal: 'natuurleien', start: 'dit_jaar' }, opvolging: 'gecontacteerd',
    notitie: 'Gebeld, wil eerst premies weten.', volgende: ['Bellen', 3], reactie: 20, bron: 'fb', advertentie: 'Kort4' },
  { id: '00000000-0000-4000-8000-000000000004', uren: 30, email: 'an.demo@example.com', adres: 'Veldstraat 77', gemeente: 'Gent',
    lat: 51.0478, lng: 3.7244, maten: { hellend: 0, plat: 64, nokhoogte: null, gootlengte: null },
    antwoorden: { werken: ['plat_dak'], start: 'zo_snel_mogelijk' }, bron: null },
  { id: '00000000-0000-4000-8000-000000000005', uren: 52, naam: 'Koen Klad', email: 'koen.klad@example.com', telefoon: '0470 00 00 05',
    adres: 'Dorpsstraat 3', gemeente: 'Zele', lat: 51.0660, lng: 4.0390, maten: { hellend: 104, plat: 0, nokhoogte: 8, gootlengte: 17 },
    antwoorden: { werken: ['dakbedekking', 'goten'], goot: 'zink', start: 'binnen_3_maanden' }, opvolging: 'offerte',
    notitie: 'Plaatsbezoek gedaan, offerte via partner verstuurd.', volgende: ['Offerte opvolgen', -2], reactie: 49, bron: 'pagina' },
  { id: '00000000-0000-4000-8000-000000000006', uren: 70, email: 'sofie.schets@example.com', adres: 'Nieuwstraat 21', gemeente: 'Deinze',
    lat: 50.9842, lng: 3.5276, maten: { hellend: 88, plat: 0, nokhoogte: 7.1, gootlengte: 14 },
    antwoorden: { werken: ['isolatie'], isolatie: 'geen', start: 'orienterend' }, bron: 'fb', advertentie: 'Kort2' },
  { id: '00000000-0000-4000-8000-000000000007', uren: 120, naam: 'Marc Model', email: 'marc.model@example.com', telefoon: '0470 00 00 07',
    adres: 'Brugsesteenweg 140', gemeente: 'Maldegem', lat: 51.2070, lng: 3.4450, maten: { hellend: 160, plat: 20, nokhoogte: 9.8, gootlengte: 26 },
    antwoorden: { werken: ['dakbedekking', 'isolatie', 'goten'], woningtype: 'vrijstaand', start: 'dit_jaar' }, opvolging: 'gewonnen',
    notitie: 'Getekend. Start in maart.', reactie: 115, bron: 'fb', advertentie: 'Kort1' },
  { id: '00000000-0000-4000-8000-000000000008', uren: 140, email: 'lien.lijst@example.com', adres: 'Schoolstraat 8', gemeente: 'Wetteren',
    lat: 51.0010, lng: 3.8830, maten: { hellend: 92, plat: 0, nokhoogte: 7.4, gootlengte: 15 },
    antwoorden: { werken: ['herstelling'], start: 'zo_snel_mogelijk' }, opvolging: 'verloren', notitie: 'Koos voor een buur-aannemer.', reactie: 130, bron: null },
  { id: '00000000-0000-4000-8000-000000000009', uren: 200, email: 'test.oud@example.com', adres: 'Marktplein 1', gemeente: 'Zottegem',
    lat: 50.8690, lng: 3.8100, maten: { hellend: 75, plat: 0, nokhoogte: 6.9, gootlengte: 12 },
    antwoorden: { werken: ['dakbedekking'] }, archief: true, bron: 'fb', advertentie: 'Kort4' },
  { id: '00000000-0000-4000-8000-000000000010', uren: 0.3, naam: 'Nina Nieuw', email: 'nina.nieuw@example.com', telefoon: '0470 00 00 10',
    adres: 'Lindenlaan 15', gemeente: 'Sint-Niklaas', lat: 51.1650, lng: 4.1430, maten: { hellend: 110, plat: 8, nokhoogte: 8.4, gootlengte: 18 },
    antwoorden: { werken: ['dakbedekking'], start: 'zo_snel_mogelijk' }, bron: 'fb', advertentie: 'Kort2' },
]

export function maakVoorbeeld(): { leads: Lead[]; tijdlijn: TijdlijnRegel[]; berichten: Bericht[] } {
  let nr = 0
  const tijdlijn: TijdlijnRegel[] = []
  const regel = (lead_id: string, soort: string, door: TijdlijnRegel['door'], samenvatting: string, uren: number): void => {
    tijdlijn.push({ id: ++nr, lead_id, soort, door, samenvatting, data: null, created_at: uurGeleden(uren) })
  }

  const leads: Lead[] = BASIS.map((b) => {
    regel(b.id, 'aanvraag', 'klant', 'Dakrapport aangevraagd', b.uren)
    regel(b.id, 'rapport_verstuurd', 'systeem', 'Rapportmail verstuurd naar de klant', b.uren - 0.01)
    if (b.telefoon) regel(b.id, 'terugbellen', 'klant', 'Vraagt om teruggebeld te worden (zo snel mogelijk)', b.uren - 0.05)
    if (b.opvolging) regel(b.id, 'status', 'team', `Status: ${b.opvolging}`, b.reactie ?? b.uren - 1)
    if (b.notitie) regel(b.id, 'notitie', 'team', b.notitie, (b.reactie ?? b.uren) - 0.5)
    if (b.archief) regel(b.id, 'archief', 'team', 'Gearchiveerd', 10)
    return {
      id: b.id,
      created_at: uurGeleden(b.uren),
      email: b.email,
      naam: b.naam ?? null,
      telefoon: b.telefoon ?? null,
      adres: b.adres,
      gemeente: b.gemeente,
      status: b.telefoon ? 'hot' : b.verfijnd ? 'engaged' : 'warm',
      session_id: `voorbeeld-${b.id.slice(-4)}`,
      probleem: null,
      urgentie: null,
      bouwjaar: null,
      type_werken: null,
      dak_oppervlakte: Math.round(b.maten.hellend + b.maten.plat),
      dak_data: { antwoorden: b.antwoorden, verfijnd: !!b.verfijnd, maten: b.maten, oppervlakte: Math.round(b.maten.hellend + b.maten.plat), lat: b.lat, lng: b.lng },
      opvolging: b.opvolging ?? 'nieuw',
      notitie: b.notitie ?? null,
      opvolging_op: b.opvolging ? uurGeleden(b.reactie ?? b.uren - 1) : null,
      herkomst: b.bron === 'fb'
        ? { utm_source: 'facebook', utm_medium: 'paid', utm_campaign: 'dakscan-november', utm_content: b.advertentie }
        : b.bron === 'pagina' ? { utm_source: 'facebook', utm_medium: 'social' } : null,
      gearchiveerd_op: b.archief ? uurGeleden(10) : null,
      volgende_actie: b.volgende?.[0] ?? null,
      volgende_actie_op: b.volgende ? binnenUur(b.volgende[1]) : null,
      eerste_reactie_op: b.reactie != null ? uurGeleden(b.reactie) : null,
    }
  })

  return { leads, tijdlijn, berichten: [] }
}
