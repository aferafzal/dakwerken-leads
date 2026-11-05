'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Inbox, Map, MessageCircle } from 'lucide-react'

const TABS = [
  { href: '/dashboard', label: 'Aanvragen', icoon: Inbox },
  { href: '/dashboard/kaart', label: 'Kaart', icoon: Map },
  { href: '/dashboard/cijfers', label: 'Cijfers', icoon: BarChart3 },
  { href: '/dashboard/chat', label: 'Chat', icoon: MessageCircle },
]

export default function DashboardNav() {
  const pad = usePathname()
  const actief = (href: string) => (href === '/dashboard' ? pad === '/dashboard' || pad.startsWith('/dashboard/aanvraag') : pad.startsWith(href))
  return (
    <nav aria-label="Dashboard" className="-mb-px flex gap-1 overflow-x-auto">
      {TABS.map(({ href, label, icoon: Icoon }) => (
        <Link
          key={href}
          href={href}
          aria-current={actief(href) ? 'page' : undefined}
          className={`flex shrink-0 items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-semibold transition-colors ${
            actief(href) ? 'bg-gray-50 text-gray-900' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
        >
          <Icoon className="h-4 w-4" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  )
}
