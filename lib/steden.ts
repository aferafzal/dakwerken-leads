export interface Stad {
  naam: string
  slug: string
  beschrijving: string
  regio: string
}

export const steden: Stad[] = [
  {
    naam: 'Gent',
    slug: 'gent',
    beschrijving: 'Dakwerk op maat in Gent en omgeving, door gecertificeerde dakwerkers uit ons netwerk.',
    regio: 'Oost-Vlaanderen',
  },
  {
    naam: 'Aalst',
    slug: 'aalst',
    beschrijving: 'Voor dakwerken in Aalst en de Denderstreek bent u bij ons aan het juiste adres.',
    regio: 'Oost-Vlaanderen',
  },
  {
    naam: 'Sint-Niklaas',
    slug: 'sint-niklaas',
    beschrijving: 'Dakwerken in Sint-Niklaas en het Waasland, van herstelling tot volledige renovatie.',
    regio: 'Oost-Vlaanderen',
  },
  {
    naam: 'Dendermonde',
    slug: 'dendermonde',
    beschrijving: 'Dakwerken in Dendermonde voor renovatie, reparatie en nieuwbouw.',
    regio: 'Oost-Vlaanderen',
  },
  {
    naam: 'Lokeren',
    slug: 'lokeren',
    beschrijving: 'Dakwerken in Lokeren, uitgevoerd door gecertificeerde dakwerkers uit ons netwerk.',
    regio: 'Oost-Vlaanderen',
  },
  {
    naam: 'Ronse',
    slug: 'ronse',
    beschrijving: 'Dakwerken in Ronse en de Vlaamse Ardennen, van daklekkage tot dakisolatie.',
    regio: 'Oost-Vlaanderen',
  },
  {
    naam: 'Oudenaarde',
    slug: 'oudenaarde',
    beschrijving: 'Dakrenovatie en herstellingen in Oudenaarde door gecertificeerde dakwerkers.',
    regio: 'Oost-Vlaanderen',
  },
  {
    naam: 'Maldegem',
    slug: 'maldegem',
    beschrijving: 'Dakwerken in Maldegem en het Meetjesland: lekkages, isolatie en renovatie.',
    regio: 'Oost-Vlaanderen',
  },
  {
    naam: 'Wetteren',
    slug: 'wetteren',
    beschrijving: 'Voor al uw dakwerken in Wetteren en omgeving, van lekkage tot volledige renovatie.',
    regio: 'Oost-Vlaanderen',
  },
  {
    naam: 'Zottegem',
    slug: 'zottegem',
    beschrijving: 'Dakwerken in Zottegem en de Vlaamse Ardennen voor particulieren en bedrijven.',
    regio: 'Oost-Vlaanderen',
  },
  {
    naam: 'Beveren',
    slug: 'beveren',
    beschrijving: 'Dakwerken in Beveren-Waas en het havengebied van Antwerpen.',
    regio: 'Oost-Vlaanderen',
  },
  {
    naam: 'Temse',
    slug: 'temse',
    beschrijving: 'Dakwerken in Temse en omgeving: van kleine herstellingen tot complete dakrenovaties.',
    regio: 'Oost-Vlaanderen',
  },
  {
    naam: 'Geraardsbergen',
    slug: 'geraardsbergen',
    beschrijving: 'Dakwerken in Geraardsbergen, van kleine herstelling tot nieuw dak.',
    regio: 'Oost-Vlaanderen',
  },
  {
    naam: 'Eeklo',
    slug: 'eeklo',
    beschrijving: 'Dakwerken in Eeklo en het Meetjesland door gecertificeerde dakwerkers uit ons netwerk.',
    regio: 'Oost-Vlaanderen',
  },
  {
    naam: 'Ninove',
    slug: 'ninove',
    beschrijving: 'Dakwerken in Ninove en de Denderstreek, van herstelling tot renovatie.',
    regio: 'Oost-Vlaanderen',
  },
]

export function getStadBySlug(slug: string): Stad | undefined {
  return steden.find((s) => s.slug === slug)
}
