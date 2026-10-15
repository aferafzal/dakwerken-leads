import { NextResponse, type NextRequest } from 'next/server'
import { BEHEER_REALM, isBeheerder } from '@/lib/beheer-auth'

// Het dashboard bevat persoonsgegevens van aanvragers: alleen met login.
// De pagina controleert zelf ook nog eens (proxy is een eerste poort, geen enige poort).
export function proxy(request: NextRequest) {
  if (isBeheerder(request.headers.get('authorization'))) return NextResponse.next()

  return new NextResponse('Toegang geweigerd', {
    status: 401,
    headers: { 'WWW-Authenticate': `Basic realm="${BEHEER_REALM}", charset="UTF-8"` },
  })
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
