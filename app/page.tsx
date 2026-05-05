// ── Server Component — metadata ongewijzigd ──────────────────
import type { Metadata } from 'next'
import HomePageContent from '@/components/HomePageContent'

export const metadata: Metadata = {
  title: 'Gratis Dakrapport — Ontdek de Staat van Uw Dak | Oost-Vlaanderen',
  description:
    'Krijg in 2 minuten een gratis informatief rapport over uw dak: oppervlakte, mogelijke aandachtspunten, premies en kostenindicatie. Op basis van officiële Vlaamse data.',
}

// Visueel design → components/HomePageContent.tsx
// Backend / lead capture / form → components/LeadForm.tsx (ongewijzigd)
export default function HomePage() {
  return <HomePageContent />
}
