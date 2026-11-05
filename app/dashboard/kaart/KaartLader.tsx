'use client'

import dynamic from 'next/dynamic'
import type { KaartPunt } from './AanvragenKaart'

// Leaflet werkt enkel in de browser
const AanvragenKaart = dynamic(() => import('./AanvragenKaart'), {
  ssr: false,
  loading: () => <div className="h-[70vh] w-full animate-pulse rounded-xl bg-gray-200" aria-hidden />,
})

export default function KaartLader({ punten, hoogte }: { punten: KaartPunt[]; hoogte?: string }) {
  return <AanvragenKaart punten={punten} hoogte={hoogte} />
}
