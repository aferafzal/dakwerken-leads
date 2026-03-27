import type { ReactNode } from 'react'

// Pass-through layout — site header/footer zitten in app/layout.tsx
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
