// Bedrijfsgegevens — enige bron voor footer, privacyverklaring en wettelijke vermeldingen.
// "Dakwerken Oost-Vlaanderen" is een handelsnaam van AOA Management CommV.
// De werken zelf voert een gecontroleerde partner-dakwerker uit de regio uit (KBO en btw nagekeken).

export const BEDRIJF = {
  handelsnaam:       'Dakwerken Oost-Vlaanderen',
  naam:              'AOA Management CommV',
  rechtsvorm:        'Commanditaire vennootschap',
  ondernemingsnummer: '1034.629.219',
  straat:            'Uitbreidingstraat 84',
  postcodeGemeente:  '2600 Antwerpen',
  email:             'info@dakwerken-oostvlaanderen.be',
} as const

export const BEDRIJF_ADRES = `${BEDRIJF.straat}, ${BEDRIJF.postcodeGemeente}`
