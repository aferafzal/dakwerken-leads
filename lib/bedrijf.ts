// Bedrijfsgegevens — enige bron voor footer, privacyverklaring en wettelijke vermeldingen.
// "Dakwerken Oost-Vlaanderen" is een handelsnaam van AOA Management CommV.
// De werken zelf voert een gecertificeerde partner-dakwerker uit de regio uit.

export const BEDRIJF = {
  handelsnaam:       'Dakwerken Oost-Vlaanderen',
  naam:              'AOA Management CommV',
  rechtsvorm:        'Commanditaire vennootschap',
  ondernemingsnummer: '1034.629.219',
  straat:            'Uitbreidingstraat 84',
  postcodeGemeente:  '2600 Antwerpen',
  email:             'info@aoa-management.com',
} as const

export const BEDRIJF_ADRES = `${BEDRIJF.straat}, ${BEDRIJF.postcodeGemeente}`
