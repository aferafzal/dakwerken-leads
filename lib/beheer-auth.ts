// Basic Auth voor beheerpagina's (dashboard) en beheer-acties.
// Zonder DASHBOARD_PASSWORD in de omgeving is alles dicht (fail closed).

export const BEHEER_REALM = 'Dakwerken beheer'

// Vergelijking in constante tijd, zonder node:crypto (werkt ook in de proxy)
function gelijk(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let verschil = 0
  for (let i = 0; i < a.length; i++) verschil |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return verschil === 0
}

export function isBeheerder(authorization: string | null): boolean {
  const gebruiker = process.env.DASHBOARD_USER ?? 'beheer'
  const wachtwoord = process.env.DASHBOARD_PASSWORD
  if (!wachtwoord || !authorization?.startsWith('Basic ')) return false

  let gedecodeerd = ''
  try {
    gedecodeerd = atob(authorization.slice('Basic '.length))
  } catch {
    return false
  }
  const scheiding = gedecodeerd.indexOf(':')
  if (scheiding < 0) return false

  return gelijk(gedecodeerd.slice(0, scheiding), gebruiker) && gelijk(gedecodeerd.slice(scheiding + 1), wachtwoord)
}
