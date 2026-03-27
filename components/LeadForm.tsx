'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { leadSchema, type LeadFormData, probleemLabels } from '@/lib/validations'
import { steden } from '@/lib/steden'

interface LeadFormProps {
  defaultGemeente?: string
}

export default function LeadForm({ defaultGemeente }: LeadFormProps) {
  const router = useRouter()

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

  async function onSubmit(data: LeadFormData) {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      router.push('/bedankt')
    }
  }

  const urgentieLabels: Record<number, string> = {
    1: 'Niet dringend',
    2: 'Weinig dringend',
    3: 'Normaal',
    4: 'Dringend',
    5: 'Zeer dringend',
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
        {errors.telefoon && (
          <p className="mt-1 text-xs text-red-600">{errors.telefoon.message}</p>
        )}
      </div>

      {/* Gemeente */}
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
            <option key={stad.slug} value={stad.naam}>
              {stad.naam}
            </option>
          ))}
          <option value="Andere">Andere gemeente</option>
        </select>
        {errors.gemeente && (
          <p className="mt-1 text-xs text-red-600">{errors.gemeente.message}</p>
        )}
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
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.probleem && (
          <p className="mt-1 text-xs text-red-600">{errors.probleem.message}</p>
        )}
      </div>

      {/* Urgentie */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Urgentie: <span className="font-semibold text-green-700">{urgentieLabels[urgentie]}</span>
        </label>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
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
          <input
            type="checkbox"
            className="mt-0.5 accent-green-600"
            {...register('gdpr_consent')}
          />
          <span>
            Ik ga akkoord dat mijn gegevens worden gebruikt om contact op te nemen over mijn
            aanvraag.{' '}
            <a href="/privacy" className="text-green-700 underline">
              Privacyverklaring
            </a>{' '}
            <span className="text-red-500">*</span>
          </span>
        </label>
        {errors.gdpr_consent && (
          <p className="text-xs text-red-600">{errors.gdpr_consent.message}</p>
        )}

        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="mt-0.5 accent-green-600"
            {...register('followup_consent')}
          />
          <span>
            Ik ontvang graag updates en aanbiedingen per WhatsApp of e-mail. (optioneel)
          </span>
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
