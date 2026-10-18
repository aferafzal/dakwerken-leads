'use client'

import { useId, useRef, useState } from 'react'

// Adresveld met suggesties uit de Vlaamse adressenregisters (/api/dakmeting?q=).
// Gebruikt in de hero, de slotoproep en funnelstap 1, zodat het overal
// hetzelfde werkt: pijltjes, Enter, Escape en een melding bij geen resultaat.

interface Props {
  label: string
  verborgenLabel?: boolean
  knopLabel?: string
  variant?: 'donker' | 'licht'
  onKies: (adres: string) => void
}

const MELDING_GEEN = 'Geen adres gevonden. Typ straat, huisnummer en gemeente, bijvoorbeeld: Korenmarkt 10, Gent.'
const MELDING_FOUT = 'Adressen opzoeken lukt nu even niet. Probeer het zo meteen opnieuw.'
const MELDING_KIES = 'Kies uw adres uit de lijst.'
const MELDING_TE_KORT = 'Typ straat, huisnummer en gemeente.'

const NAVY = 'hsl(222 47% 11%)'
const AMBER = 'hsl(25 95% 53%)'

export default function AdresZoeker({ label, verborgenLabel = false, knopLabel, variant = 'licht', onKies }: Props) {
  const id = useId()
  const lijstId = `${id}-lijst`
  const meldingId = `${id}-melding`
  const [waarde, setWaarde] = useState('')
  const [suggesties, setSuggesties] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [actief, setActief] = useState(-1)
  const [melding, setMelding] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const donker = variant === 'donker'
  const lijstOpen = open && suggesties.length > 0

  async function zoek(q: string): Promise<string[] | null> {
    setBezig(true)
    try {
      const res = await fetch(`/api/dakmeting?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error('Adres opzoeken mislukt')
      const data = await res.json()
      const lijst: string[] = data.suggesties ?? []
      setSuggesties(lijst)
      setActief(-1)
      setOpen(lijst.length > 0)
      setMelding(lijst.length > 0 ? null : MELDING_GEEN)
      return lijst
    } catch {
      setMelding(MELDING_FOUT)
      return null
    } finally {
      setBezig(false)
    }
  }

  function onInvoer(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setWaarde(q)
    setMelding(null)
    setActief(-1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 4) {
      setSuggesties([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(() => { void zoek(q) }, 300)
  }

  function kies(adres: string) {
    setWaarde(adres)
    setSuggesties([])
    setOpen(false)
    setActief(-1)
    setMelding(null)
    onKies(adres)
  }

  // Knop of Enter zonder gekozen suggestie
  async function bevestig() {
    if (lijstOpen) {
      kies(suggesties[actief >= 0 ? actief : 0])
      return
    }
    const q = waarde.trim()
    if (q.length < 4) {
      setMelding(MELDING_TE_KORT)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const lijst = await zoek(q)
    if (lijst && lijst.length === 1) kies(lijst[0])
    else if (lijst && lijst.length > 1) setMelding(MELDING_KIES)
  }

  function onToets(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      if (suggesties.length === 0) return
      e.preventDefault()
      setOpen(true)
      setActief((i) => (i + 1) % suggesties.length)
    } else if (e.key === 'ArrowUp') {
      if (!lijstOpen) return
      e.preventDefault()
      setActief((i) => (i <= 0 ? suggesties.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      void bevestig()
    } else if (e.key === 'Escape') {
      if (!lijstOpen) return
      // Sluit alleen de lijst, niet een omliggende modal (die luistert op document)
      e.preventDefault()
      e.nativeEvent.stopImmediatePropagation()
      setOpen(false)
      setActief(-1)
    }
  }

  const invoerKlassen = donker
    ? 'h-14 w-full rounded-xl bg-white pl-4 pr-11 text-base text-gray-900 shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-orange-400/60'
    : 'w-full rounded-lg border border-gray-300 bg-white px-3 py-3 pr-9 text-base text-gray-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/25'

  return (
    <div className="text-left">
      <label
        htmlFor={id}
        className={verborgenLabel ? 'sr-only' : `mb-1 block text-sm font-medium ${donker ? 'text-white' : 'text-gray-700'}`}
      >
        {label}
      </label>

      <div className={knopLabel ? 'flex flex-col gap-3 sm:flex-row' : ''}>
        <div className="relative flex-1">
          <input
            id={id}
            type="text"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={lijstOpen}
            aria-controls={lijstId}
            aria-activedescendant={actief >= 0 ? `${lijstId}-${actief}` : undefined}
            aria-describedby={melding ? meldingId : undefined}
            placeholder="Straat, huisnummer, gemeente"
            className={invoerKlassen}
            value={waarde}
            onChange={onInvoer}
            onKeyDown={onToets}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onFocus={() => suggesties.length > 0 && setOpen(true)}
          />
          {bezig ? (
            <span
              aria-hidden="true"
              className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-gray-500 border-t-transparent ${donker ? 'right-4' : 'right-3'}`}
            />
          ) : (
            <svg
              aria-hidden="true"
              className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 ${donker ? 'right-4' : 'right-3'}`}
              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}

          {lijstOpen && (
            <ul
              id={lijstId}
              role="listbox"
              aria-label="Gevonden adressen"
              className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
            >
              {suggesties.map((s, i) => (
                <li
                  key={s}
                  id={`${lijstId}-${i}`}
                  role="option"
                  aria-selected={i === actief}
                  className={`cursor-pointer px-4 py-3 text-sm ${i === actief ? 'bg-orange-50 text-gray-900' : 'text-gray-800'}`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    kies(s)
                  }}
                  onMouseEnter={() => setActief(i)}
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        {knopLabel && (
          <button
            type="button"
            onClick={() => void bevestig()}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-xl px-7 font-bold transition-[filter] hover:brightness-95 ${donker ? 'h-14 text-base' : 'h-12 text-sm'}`}
            style={{ background: AMBER, color: NAVY }}
          >
            {knopLabel}
          </button>
        )}
      </div>

      {melding && (
        <p id={meldingId} role="status" className={`mt-3 text-sm ${donker ? 'text-white' : 'text-gray-700'}`}>
          {melding}
        </p>
      )}
    </div>
  )
}
