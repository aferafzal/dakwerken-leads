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

// Wie de mails uit het dashboard ondertekent. De naam staat in de omgeving (MAIL_AFZENDER_NAAM), niet in de code.
export const AFZENDER = {
  naam:     process.env.MAIL_AFZENDER_NAAM ?? 'Afer',
  functie:  process.env.MAIL_AFZENDER_FUNCTIE ?? 'Zaakvoerder',
  telefoon: process.env.NEXT_PUBLIC_OWNER_PHONE ?? '+32 466 43 98 59',
} as const
