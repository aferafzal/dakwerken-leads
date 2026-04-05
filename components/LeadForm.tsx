'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { leadSchema, type LeadFormData, probleemLabels } from '@/lib/validations'
import { steden } from '@/lib/steden'

interface LeadFormProps {
  defaultGemeente?: string
}

export default function LeadForm({ defaultGemeente }: LeadFormProps) {
  const router = useRouter()

  const [suggesties, setSuggesties]       = useState<string[]>([])
  const [toonDropdown, setToonDropdown]   = useState(false)
  const [metingBezig, setMetingBezig]     = useState(false)
  const [dakOppervlakte, setDakOppervlakte] = useState<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      gemeente: defaultGemeente ?? '',
      urgentie: 3,
      followup_consent: false,
    },
  })

  const urgentie = watch('urgentie')
  const adresWaarde = watch('adres') ?? ''

  const urgentieLabels: Record<number, string> = {
    1: 'Niet dringend',
    2: 'Weinig dringend',
    3: 'Normaal',
    4: 'Dringend',
    5: 'Zeer dringend',
  }

  function onAdresInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setValue('adres', q)
    setDakOppervlakte(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 4) { setSuggesties([]); setToonDropdown(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/dakmeting?q=${encodeURIComponent(q)}`)
        if (!res.ok) return
        const data = await res.json()
        setSuggesties(data.suggesties ?? [])
        setToonDropdown(true)
      } catch { /* stil falen */ }
    }, 300)
  }

  async function selecteerAdres(adres: string) {
    setValue('adres', adres, { shouldValidate: true })
    setSuggesties([])
    setToonDropdown(false)
    setMetingBezig(true)
    try {
      const res = await fetch(`/api/dakmeting?adres=${encodeURIComponent(adres)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.oppervlakte) setDakOppervlakte(data.oppervlakte)
        if (data.gemeente) {
          const match = steden.find(
            (s) => s.naam.toLowerCase() === data.gemeente.toLowerCase()
          )
          setValue('gemeente', match ? match.naam : 'Andere', { shouldValidate: true })
        }
      }
    } catch { /* stil falen */ }
    setMetingBezig(false)
  }

  async function onSubmit(data: LeadFormData) {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, dakOppervlakte: dakOppervlakte ?? undefined }),
    })
    if (res.ok) router.push('/bedankt')
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-200 space-y-5"
      noValidate
    >
      <h3 className="text-xl font-bold text-gray-900">Gratis offerte aanvragen</h3>

      {/* Naam */}
      <div>
        <label htmlFor="naam" className="block text-sm font-medium text-gray-700 mb-1">
          Naam <span className="text-red-500">*</span>
        </label>
        <input
          id="naam"
          type="text"
          autoComplete="name"
          placeholder="Jan Janssen"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
          {...register('naam')}
        />
        {errors.naam && <p className="mt-1 text-xs text-red-600">{errors.naam.message}</p>}
      </div>

      {/* Adres met autocomplete */}
      <div className="relative">
        <label htmlFor="adres" className="block text-sm font-medium text-gray-700 mb-1">
          Adres van uw woning
        </label>
        <div className="relative">
          <input
            id="adres"
            type="text"
            autoComplete="off"
            placeholder="Vul uw adres in voor een dakschatting…"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            value={adresWaarde}
            onChange={onAdresInput}
            onBlur={() => setTimeout(() => setToonDropdown(false), 150)}
            onFocus={() => suggesties.length > 0 && setToonDropdown(true)}
          />
          {/* Icoon */}
          {metingBezig ? (
            <span className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
          ) : (
            <svg className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>

        {/* Suggesties dropdown */}
        {toonDropdown && suggesties.length > 0 && (
          <ul className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
            {suggesties.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-green-50 hover:text-green-800 transition-colors"
                  onMouseDown={() => selecteerAdres(s)}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Dakoppervlakte resultaat */}
        {dakOppervlakte && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
            <svg className="h-4 w-4 shrink-0 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <p className="text-xs text-green-800">
              Digitale dakmeting: <strong>±{dakOppervlakte} m²</strong> — wij sturen u een gedetailleerde offerte op maat.
            </p>
          </div>
        )}

        {errors.adres && <p className="mt-1 text-xs text-red-600">{errors.adres.message}</p>}
      </div>

      {/* Telefoon */}
      <div>
        <label htmlFor="telefoon" className="block text-sm font-medium text-gray-700 mb-1">
          Telefoonnummer <span className="text-red-500">*</span>
        </label>
        <input
          id="telefoon"
          type="tel"
          autoComplete="tel"
          placeholder="0470 12 34 56"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
          {...register('telefoon')}
        />
        {errors.telefoon && <p className="mt-1 text-xs text-red-600">{errors.telefoon.message}</p>}
      </div>

      {/* Gemeente — auto-ingevuld via dakmeting */}
      <div>
        <label htmlFor="gemeente" className="block text-sm font-medium text-gray-700 mb-1">
          Gemeente <span className="text-red-500">*</span>
        </label>
        <select
          id="gemeente"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
          {...register('gemeente')}
        >
          <option value="">— Selecteer uw gemeente —</option>
          {steden.map((stad) => (
            <option key={stad.slug} value={stad.naam}>{stad.naam}</option>
          ))}
          <option value="Andere">Andere gemeente</option>
        </select>
        {errors.gemeente && <p className="mt-1 text-xs text-red-600">{errors.gemeente.message}</p>}
      </div>

      {/* Type probleem */}
      <div>
        <label htmlFor="probleem" className="block text-sm font-medium text-gray-700 mb-1">
          Type probleem <span className="text-red-500">*</span>
        </label>
        <select
          id="probleem"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
          {...register('probleem')}
        >
          <option value="">— Selecteer een type —</option>
          {Object.entries(probleemLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {errors.probleem && <p className="mt-1 text-xs text-red-600">{errors.probleem.message}</p>}
      </div>

      {/* Urgentie */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Urgentie: <span className="font-semibold text-green-700">{urgentieLabels[urgentie]}</span>
        </label>
        <input
          type="range" min={1} max={5} step={1}
          className="w-full accent-green-600"
          {...register('urgentie', { valueAsNumber: true })}
          onChange={(e) => setValue('urgentie', Number(e.target.value))}
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Niet dringend</span>
          <span>Zeer dringend</span>
        </div>
      </div>

      {/* GDPR */}
      <div className="space-y-2 border-t pt-4">
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" className="mt-0.5 accent-green-600" {...register('gdpr_consent')} />
          <span>
            Ik ga akkoord dat mijn gegevens worden gebruikt om contact op te nemen over mijn aanvraag.{' '}
            <a href="/privacy" className="text-green-700 underline">Privacyverklaring</a>{' '}
            <span className="text-red-500">*</span>
          </span>
        </label>
        {errors.gdpr_consent && <p className="text-xs text-red-600">{errors.gdpr_consent.message}</p>}

        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" className="mt-0.5 accent-green-600" {...register('followup_consent')} />
          <span>Ik ontvang graag updates en aanbiedingen per WhatsApp of e-mail. (optioneel)</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-60"
      >
        {isSubmitting ? 'Bezig met verzenden…' : 'Gratis offerte aanvragen →'}
      </button>

      <p className="text-center text-xs text-gray-500">
        We bellen u terug binnen 2 uur op werkdagen.
      </p>
    </form>
  )
}
