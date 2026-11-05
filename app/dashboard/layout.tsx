import type { Metadata } from 'next'
import { isVoorbeeld } from '@/lib/dashboard/gegevens'
import DashboardNav from './DashboardNav'

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
}

// Donkere band bovenaan: de sitekop (wit, absoluut gepositioneerd) blijft leesbaar, en de tabbladen staan er vast onder.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-gray-50">
      <div className="bg-navy pt-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {isVoorbeeld() && (
            <p className="mb-3 rounded-lg bg-amber/15 px-3 py-2 text-sm font-medium text-amber">
              Voorbeeldmodus: verzonnen aanvragen, niets wordt in de databank bewaard.
            </p>
          )}
          <DashboardNav />
        </div>
      </div>
      {children}
    </div>
  )
}
