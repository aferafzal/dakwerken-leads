import type { ErfgoedSoort } from '@/lib/erfgoed'

// Wat erfgoed betekent voor dakwerken (rustig en algemeen: de fiche geeft de details)
export const ERFGOED_TEKST: Record<ErfgoedSoort, { titel: string; tekst: string }> = {
  monument: {
    titel: 'Beschermd monument',
    tekst: 'Uw woning is beschermd als monument. Voor werken aan het dak is meestal een toelating of vergunning nodig. Vraag dit na vóór u start.',
  },
  gezicht: {
    titel: 'Beschermd stads- of dorpsgezicht',
    tekst: 'Uw woning ligt in een beschermd stads- of dorpsgezicht. Werken die het uitzicht van het dak veranderen, zoals andere pannen of dakramen, vragen meestal een toelating of vergunning.',
  },
  landschap: {
    titel: 'Beschermd landschap',
    tekst: 'Uw woning ligt in een beschermd cultuurhistorisch landschap. Werken die het uitzicht veranderen, kunnen een toelating of vergunning vragen.',
  },
  bouwkundig: {
    titel: 'Bouwkundig erfgoed',
    tekst: 'Uw woning staat op de lijst van het vastgesteld bouwkundig erfgoed. Bij een vergunningsaanvraag wordt daar rekening mee gehouden.',
  },
}

