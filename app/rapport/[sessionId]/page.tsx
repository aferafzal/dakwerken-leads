import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { maakRapport, type LeadRow } from '@/lib/rapport'
import Rapport from '@/components/rapport/Rapport'

export async function generateMetadata(
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<Metadata> {
  const { sessionId } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('leads')
    .select('adres, gemeente')
    .eq('session_id', sessionId)
    .single<{ adres: string | null; gemeente: string | null }>()

  const adres = data?.adres ?? 'uw woning'
  const gemeente = data?.gemeente ? `, ${data.gemeente}` : ''

  return {
    title: `Dakrapport voor ${adres}${gemeente}`,
    description: `Persoonlijk dakrapport: dakmeting, renovatiekosten, premies en aandachtspunten voor ${adres}.`,
    robots: { index: false, follow: false }, // privacy: rapport is uniek per gebruiker
    openGraph: {
      title: `Dakrapport voor ${adres}`,
      description: 'Uw persoonlijk dakrapport met dakmeting, kosten en premies.',
    },
  }
}

export default async function RapportPage(
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const supabase = await createClient()

  const { data: lead } = await supabase
    .from('leads')
    .select('id, email, adres, gemeente, dak_oppervlakte, bouwjaar, laatste_dakwerken, lekkage_recent, type_werken, dak_data, created_at')
    .eq('session_id', sessionId)
    .single<LeadRow>()

  if (!lead) notFound()

  return <Rapport data={await maakRapport(lead)} sessionId={sessionId} />
}
