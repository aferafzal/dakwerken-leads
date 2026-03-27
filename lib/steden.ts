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
    beschrijving: 'Als dakspecialist actief in Gent en omgeving staan we garant voor kwalitatief dakwerk op maat.',
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
    beschrijving: 'Betrouwbare dakwerken in Sint-Niklaas en het Waasland met jarenlange ervaring.',
    regio: 'Oost-Vlaanderen',
  },
  {
    naam: 'Dendermonde',
    slug: 'dendermonde',
    beschrijving: 'Uw dakspecialist in Dendermonde voor renovatie, reparatie en nieuwbouw.',
    regio: 'Oost-Vlaanderen',
  },
  {
    naam: 'Lokeren',
    slug: 'lokeren',
    beschrijving: 'Dakwerken in Lokeren uitgevoerd door ervaren vaklieden met oog voor kwaliteit.',
    regio: 'Oost-Vlaanderen',
  },
  {
    naam: 'Ronse',
    slug: 'ronse',
    beschrijving: 'Professionele dakwerken in Ronse en de Vlaamse Ardennen tegen eerlijke prijzen.',
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
    beschrijving: 'Dakwerken in Maldegem en het Meetjesland met snelle service en garantie.',
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
    beschrijving: 'Dakspecialist in Zottegem en de Vlaamse Ardennen voor particulieren en bedrijven.',
    regio: 'Oost-Vlaanderen',
  },
  {
    naam: 'Beveren',
    slug: 'beveren',
    beschrijving: 'Betrouwbare dakwerken in Beveren-Waas en het havengebied van Antwerpen.',
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
    beschrijving: 'Uw dakaannemer in Geraardsbergen voor kwalitatief en duurzaam dakwerk.',
    regio: 'Oost-Vlaanderen',
  },
  {
    naam: 'Eeklo',
    slug: 'eeklo',
    beschrijving: 'Dakwerken in Eeklo en het Meetjesland door lokale vaklieden met garantie.',
    regio: 'Oost-Vlaanderen',
  },
  {
    naam: 'Ninove',
    slug: 'ninove',
    beschrijving: 'Professionele dakwerken in Ninove en de Denderstreek voor elk budget.',
    regio: 'Oost-Vlaanderen',
  },
]

export function getStadBySlug(slug: string): Stad | undefined {
  return steden.find((s) => s.slug === slug)
}
