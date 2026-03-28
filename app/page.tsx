// ── Server Component — metadata ongewijzigd ──────────────────
import type { Metadata } from 'next'
import HomePageContent from '@/components/HomePageContent'

export const metadata: Metadata = {
  title: 'Dakwerken Oost-Vlaanderen — Gratis Offerte Binnen 2 Uur',
  description:
    'Daklekkage, isolatie of renovatie? Onze dakspecialisten in Oost-Vlaanderen bellen u terug binnen 2 uur. Gratis offerte, geen verplichtingen.',
}

// Visueel design → components/HomePageContent.tsx
// Backend / lead capture / form → components/LeadForm.tsx (ongewijzigd)
export default function HomePage() {
  return <HomePageContent />
}
