// Soorten mail in het dashboard. Apart van concept.ts, zodat de browser de AI-bibliotheken niet laadt.
export const MAIL_SOORTEN = [
  { sleutel: 'eerste_contact', label: 'Eerste contact', opdracht: 'Eerste reactie op de aanvraag. Bedank voor de aanvraag, verwijs kort naar het rapport en de prijsindicatie, en stel een kort telefoongesprek of een vrijblijvend plaatsbezoek voor.' },
  { sleutel: 'plaatsbezoek', label: 'Plaatsbezoek voorstellen', opdracht: 'Stel een vrijblijvend plaatsbezoek voor (ongeveer een halfuur) om de definitieve prijs te kunnen geven. Gebruik de momenten uit de instructie als die er zijn; anders vraag welke dag past.' },
  { sleutel: 'herinnering', label: 'Herinnering', opdracht: 'Korte, vriendelijke herinnering omdat de klant nog niet reageerde. Geen druk. Bied aan te bellen of een plaatsbezoek te plannen.' },
  { sleutel: 'offerte_opvolgen', label: 'Offerte opvolgen', opdracht: 'Volg de offerte op die de klant kreeg: is alles duidelijk, zijn er vragen? Bied aan om de offerte samen te overlopen.' },
  { sleutel: 'bedanking', label: 'Bedanking en review', opdracht: 'De werken zijn klaar. Bedank de klant en vraag vriendelijk of die een korte beoordeling wil geven over de ervaring.' },
  { sleutel: 'vrij', label: 'Eigen bericht', opdracht: 'Schrijf de mail volgens de instructie van de afzender.' },
] as const
export type MailSoort = (typeof MAIL_SOORTEN)[number]['sleutel']
export const isMailSoort = (s: unknown): s is MailSoort => MAIL_SOORTEN.some((m) => m.sleutel === s)
