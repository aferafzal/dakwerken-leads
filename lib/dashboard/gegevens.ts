// Lezen en schrijven voor het dashboard (enkel op de server).
// Twee bronnen: Supabase (gewoon) of verzonnen voorbeeldaanvragen in het geheugen
// (DASHBOARD_VOORBEELD=1, enkel lokaal: zo test je het dashboard zonder echte klantgegevens).
import { createClient } from '@/lib/supabase/server'
import type { Lead, TijdlijnRegel } from './weergave'
import { maakVoorbeeld } from './voorbeeld'

export const isVoorbeeld = () => process.env.DASHBOARD_VOORBEELD === '1' && process.env.NODE_ENV !== 'production'

export type Bericht = {
  id: string
  lead_id: string | null
  kanaal: 'email' | 'chat' | 'whatsapp'
  richting: 'in' | 'uit'
  van: string | null
  aan: string | null
  onderwerp: string | null
  inhoud: string
  verstuurd_door: 'ai' | 'team' | 'systeem' | null
  created_at: string
}

type Geheugen = { leads: Lead[]; tijdlijn: TijdlijnRegel[]; berichten: Bericht[]; volgnummer: number }
const g = globalThis as unknown as { __dashboardVoorbeeld?: Geheugen }
function geheugen(): Geheugen {
  g.__dashboardVoorbeeld ??= { ...maakVoorbeeld(), volgnummer: 1000 }
  return g.__dashboardVoorbeeld
}

// ─── Lezen ─────────────────────────────────────────────────────────────

export type Aanvragen = {
  leads: Lead[]
  fout: string | null
  /** migratie 009 (opvolging, notitie) */
  opvolgingKlaar: boolean
  /** migratie 021 (archief, volgende actie, tijdlijn) */
  controlekamerKlaar: boolean
}

export async function leesAanvragen(): Promise<Aanvragen> {
  if (isVoorbeeld()) return { leads: geheugen().leads.map((l) => ({ ...l })), fout: null, opvolgingKlaar: true, controlekamerKlaar: true }
  try {
    const supabase = await createClient()
    const [leadsRes, k009, k021] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('leads').select('opvolging').limit(1),
      supabase.from('tijdlijn').select('id').limit(1),
    ])
    if (leadsRes.error) throw leadsRes.error
    return {
      leads: (leadsRes.data ?? []) as Lead[],
      fout: null,
      opvolgingKlaar: !k009.error,
      controlekamerKlaar: !k021.error && (leadsRes.data?.[0] ? 'gearchiveerd_op' in leadsRes.data[0] : true),
    }
  } catch (err) {
    return {
      leads: [],
      fout: err instanceof Error ? err.message : 'Supabase niet geconfigureerd. Stel SUPABASE_SERVICE_ROLE_KEY in.',
      opvolgingKlaar: false,
      controlekamerKlaar: false,
    }
  }
}

/** Welke migraties zijn uitgevoerd (zonder alle aanvragen te laden) */
export async function leesKlaar(): Promise<{ opvolgingKlaar: boolean; controlekamerKlaar: boolean }> {
  if (isVoorbeeld()) return { opvolgingKlaar: true, controlekamerKlaar: true }
  try {
    const supabase = await createClient()
    const [k009, k021] = await Promise.all([
      supabase.from('leads').select('opvolging').limit(1),
      supabase.from('leads').select('gearchiveerd_op').limit(1),
    ])
    const tijdlijn = await supabase.from('tijdlijn').select('id').limit(1)
    return { opvolgingKlaar: !k009.error, controlekamerKlaar: !k021.error && !tijdlijn.error }
  } catch {
    return { opvolgingKlaar: false, controlekamerKlaar: false }
  }
}

export async function leesAanvraag(id: string): Promise<Lead | null> {
  // Een kopie: zoals bij de databank verandert een latere wijziging dit object niet
  if (isVoorbeeld()) { const l = geheugen().leads.find((x) => x.id === id); return l ? { ...l } : null }
  const supabase = await createClient()
  const { data, error } = await supabase.from('leads').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as Lead) ?? null
}

export async function leesTijdlijn(leadId: string): Promise<TijdlijnRegel[]> {
  if (isVoorbeeld()) return geheugen().tijdlijn.filter((t) => t.lead_id === leadId).sort((a, b) => b.created_at.localeCompare(a.created_at))
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('tijdlijn').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(200)
    if (error) throw error
    return (data ?? []) as TijdlijnRegel[]
  } catch {
    return [] // migratie 021 nog niet uitgevoerd
  }
}

export async function leesBerichten(leadId: string): Promise<Bericht[]> {
  if (isVoorbeeld()) return geheugen().berichten.filter((b) => b.lead_id === leadId).sort((a, b) => b.created_at.localeCompare(a.created_at))
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('berichten').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(100)
    if (error) throw error
    return (data ?? []) as Bericht[]
  } catch {
    return []
  }
}

// ─── Schrijven ─────────────────────────────────────────────────────────

export type LeadWijziging = Partial<Pick<Lead,
  'opvolging' | 'notitie' | 'opvolging_op' | 'gearchiveerd_op' | 'volgende_actie' | 'volgende_actie_op' | 'eerste_reactie_op'>>

export async function wijzigAanvragen(ids: string[], wijziging: LeadWijziging): Promise<void> {
  if (!ids.length) return
  if (isVoorbeeld()) {
    for (const l of geheugen().leads) if (ids.includes(l.id)) Object.assign(l, wijziging)
    return
  }
  const supabase = await createClient()
  const { error } = await supabase.from('leads').update(wijziging).in('id', ids)
  if (error) throw error
}

/** Eerste reactie van ons (mail of statuswijziging): enkel zetten als ze nog leeg is */
export async function zetEersteReactie(ids: string[], op: string): Promise<void> {
  if (!ids.length) return
  if (isVoorbeeld()) {
    for (const l of geheugen().leads) if (ids.includes(l.id) && !l.eerste_reactie_op) l.eerste_reactie_op = op
    return
  }
  try {
    const supabase = await createClient()
    await supabase.from('leads').update({ eerste_reactie_op: op }).in('id', ids).is('eerste_reactie_op', null)
  } catch { /* reactietijd is nooit kritiek */ }
}

/** Een regel in de tijdlijn. Faalt stil: de tijdlijn mag een actie nooit tegenhouden. */
export async function voegTijdlijnToe(regels: Omit<TijdlijnRegel, 'id' | 'created_at'>[]): Promise<void> {
  if (!regels.length) return
  if (isVoorbeeld()) {
    const m = geheugen()
    for (const r of regels) m.tijdlijn.push({ ...r, id: ++m.volgnummer, created_at: new Date().toISOString() })
    return
  }
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('tijdlijn').insert(regels)
    if (error) console.error('[dashboard/tijdlijn]', error.message)
  } catch (err) {
    console.error('[dashboard/tijdlijn]', err)
  }
}

export async function bewaarBericht(b: Omit<Bericht, 'id' | 'created_at'>): Promise<void> {
  if (isVoorbeeld()) {
    const m = geheugen()
    m.berichten.push({ ...b, id: `vb-${++m.volgnummer}`, created_at: new Date().toISOString() })
    return
  }
  const supabase = await createClient()
  const { error } = await supabase.from('berichten').insert({ ...b, status: 'beantwoord' })
  if (error) console.error('[dashboard/berichten]', error.message)
}

/** Definitief wissen: de aanvraag, haar tijdlijn en haar berichten (GDPR) */
export async function wisAanvragen(ids: string[]): Promise<void> {
  if (!ids.length) return
  if (isVoorbeeld()) {
    const m = geheugen()
    m.leads = m.leads.filter((l) => !ids.includes(l.id))
    m.tijdlijn = m.tijdlijn.filter((t) => !ids.includes(t.lead_id))
    m.berichten = m.berichten.filter((b) => !b.lead_id || !ids.includes(b.lead_id))
    return
  }
  const supabase = await createClient()
  // Berichten en tijdlijn eerst (bestaan ze nog niet, dan is er niets te wissen)
  await supabase.from('berichten').delete().in('lead_id', ids)
  await supabase.from('tijdlijn').delete().in('lead_id', ids)
  const { error } = await supabase.from('leads').delete().in('id', ids)
  if (error) throw error
}
