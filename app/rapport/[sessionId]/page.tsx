import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { list } from '@vercel/blob'
import { createClient } from '@/lib/supabase/server'

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
    description: `Persoonlijk dakrapport: 3D-model, renovatiekosten, premies en aandachtspunten voor ${adres}.`,
    robots: { index: false, follow: false }, // privacy: rapport is uniek per gebruiker
    openGraph: {
      title: `Dakrapport voor ${adres}`,
      description: 'Uw persoonlijk dakrapport met 3D-model, kosten en premies.',
    },
  }
}
import {
  bouwjaarLabels,
  dakwerkenLabels,
  typeWerkenLabels,
  type FunnelStapVragenlijst,
} from '@/lib/validations'

type LeadRow = {
  id: string
  email: string | null
  adres: string | null
  gemeente: string | null
  dak_oppervlakte: number | null
  bouwjaar: FunnelStapVragenlijst['bouwjaar'] | null
  laatste_dakwerken: FunnelStapVragenlijst['laatste_dakwerken'] | null
  lekkage_recent: FunnelStapVragenlijst['lekkage_recent'] | null
  type_werken: NonNullable<FunnelStapVragenlijst['type_werken']> | null
  dak_data: {
    capakey?: string
    perceelnummer?: string
    oppervlakte?: number
    nokhoogte?: number
    daktype?: string
    aantalGebouwen?: number
    lat?: number
    lng?: number
  } | null
  created_at: string
}

const KOSTEN_RANGES: Record<string, { range: string; basis: string; minPrijs: number; maxPrijs: number; unit: 'm2' | 'lm' | 'fix' }> = {
  pannen:            { range: '€80 – €120/m²',  basis: 'pannen vervangen incl. uitvoering',  minPrijs: 80,  maxPrijs: 120, unit: 'm2' },
  isolatie:          { range: '€90 – €150/m²',  basis: 'hellend dak isoleren',                 minPrijs: 90,  maxPrijs: 150, unit: 'm2' },
  plat_dak:          { range: '€110 – €170/m²', basis: 'EPDM/roofing vernieuwen',              minPrijs: 110, maxPrijs: 170, unit: 'm2' },
  dakgoten:          { range: '€60 – €100/lm',  basis: 'dakgoot vervangen',                    minPrijs: 60,  maxPrijs: 100, unit: 'lm' },
  totaalrenovatie:   { range: '€220 – €350/m²', basis: 'volledig vernieuwen incl. isolatie',   minPrijs: 220, maxPrijs: 350, unit: 'm2' },
  lekkage_onderzoek: { range: '€150 – €350',     basis: 'inspectie + thermografie',             minPrijs: 150, maxPrijs: 350, unit: 'fix' },
  advies:            { range: 'Op aanvraag',     basis: 'persoonlijk advies van expert',        minPrijs: 0,   maxPrijs: 0,   unit: 'fix' },
}

const PREMIES = [
  {
    naam: 'Mijn VerbouwPremie',
    omschrijving: 'Vlaamse premie voor woningverbetering, inkomensafhankelijk.',
    link: 'https://www.vlaanderen.be/mijn-verbouwpremie',
  },
  {
    naam: 'Premie dakisolatie',
    omschrijving: 'Tot €8/m² voor isolatie van een hellend dak.',
    link: 'https://apps.energiesparen.be/energiekaart/vlaams/dakisolatie',
  },
  {
    naam: 'Asbestpremie',
    omschrijving: 'Tegemoetkoming voor verwijdering van asbesthoudende leien.',
    link: 'https://ovam.vlaanderen.be/asbest-bij-u-thuis',
  },
]

// Vlaams gemiddelde dakoppervlakte (op basis van Statbel woningstatistieken)
const VL_AVG_DAK_M2 = 105

// Energiebesparing per m² dak per jaar bij dakisolatie, op basis van bouwperiode
// Conservatief geschat met Belgische gasprijs ~€1.20/m³ en 0.20 kg CO₂/kWh
const ENERGY_SAVINGS_BY_BUILD: Record<string, { eurMin: number; eurMax: number; co2KgPerM2: number; label: string }> = {
  voor_1980:   { eurMin: 5.0, eurMax: 8.0, co2KgPerM2: 13.0, label: 'pre-1980, vaak ongeïsoleerd' },
  '1980_2000': { eurMin: 3.0, eurMax: 5.5, co2KgPerM2: 8.5,  label: '1980-2000, beperkte isolatie' },
  '2000_2015': { eurMin: 1.5, eurMax: 3.0, co2KgPerM2: 4.5,  label: '2000-2015, basis-EPB' },
  na_2015:     { eurMin: 0.5, eurMax: 1.5, co2KgPerM2: 2.0,  label: 'na 2015, hoge EPB-eis' },
  onbekend:    { eurMin: 2.0, eurMax: 5.0, co2KgPerM2: 7.0,  label: 'gemiddelde Vlaamse woning' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatEur(n: number): string {
  return `€${Math.round(n).toLocaleString('nl-BE')}`
}

function azimuthLabel(deg: number): string {
  // Lambert72/3D-GRB azimuth: 0=N, 90=O, 180=Z, 270=W
  const directions = ['N', 'NO', 'O', 'ZO', 'Z', 'ZW', 'W', 'NW']
  const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8
  return directions[idx]
}

type RoofSurface = {
  azimuth: number | null
  inclination: number | null
  h_roof_50p: number | null
  area_m2: number
}

type PerBuildingMeta = {
  source: 'roofer' | 'synthetic'
  footprint_area_m2?: number
  total_roof_area_m2?: number
  nokhoogte_used?: number
  gebouwType_used?: string
  roof_surfaces?: RoofSurface[]
  rf_attributes?: Record<string, unknown>
}

type LodMetadata = {
  version: string
  total_roof_area_m2: number
  n_buildings: number
  sources: ('roofer' | 'synthetic')[]
  quality: {
    label: 'hoog' | 'gemiddeld' | 'beperkt' | 'synthetisch'
    avg_rmse_m: number | null
    avg_point_density: number | null
    avg_nodata_fraction: number | null
    n_roofer: number
    n_synthetic: number
  }
  per_building: PerBuildingMeta[]
}

async function findLod2(capakey: string | undefined): Promise<{ glbUrl: string | null; metadata: LodMetadata | null }> {
  if (!capakey) return { glbUrl: null, metadata: null }
  const safe = capakey.replace(/\//g, '_')
  try {
    const { blobs } = await list({
      prefix: `lod2/v5/${safe}`,
      limit: 10,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    const glbBlob = blobs.find((b) => b.pathname.endsWith('.glb'))
    const metaBlob = blobs.find((b) => b.pathname.endsWith('.meta.json'))
    let metadata: LodMetadata | null = null
    if (metaBlob) {
      try {
        const r = await fetch(metaBlob.url, { cache: 'no-store' })
        if (r.ok) metadata = await r.json()
      } catch {
        // ignore — metadata is optioneel
      }
    }
    return { glbUrl: glbBlob?.url ?? null, metadata }
  } catch {
    return { glbUrl: null, metadata: null }
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

  const dak = lead.dak_data ?? {}
  const nokhoogte = dak.nokhoogte ?? null
  const daktype = dak.daktype ?? null
  const lat = dak.lat ?? null
  const lng = dak.lng ?? null
  const isPlat = daktype === 'plat' || (daktype || '').toLowerCase().includes('plat')
  const bouwjaarOud = lead.bouwjaar === 'voor_1980' || lead.bouwjaar === '1980_2000'
  const werkenOud = lead.laatste_dakwerken === 'meer_15j' || lead.laatste_dakwerken === 'nooit'
  const lekkageJa = lead.lekkage_recent === 'ja'
  const werkenLijst = lead.type_werken ?? []

  // 3D-model + metadata (echte oppervlakte + kwaliteit + per-dakvlak data)
  const { glbUrl: lod2Url, metadata: lod2Meta } = await findLod2(dak.capakey)

  // Dakoppervlakte: liever uit metadata (echte mesh-meting) dan uit heuristiek
  const oppervlakte =
    lod2Meta?.total_roof_area_m2
    ?? lead.dak_oppervlakte
    ?? dak.oppervlakte
    ?? null

  // Buurtvergelijking
  const verschil = oppervlakte ? Math.round(((oppervlakte - VL_AVG_DAK_M2) / VL_AVG_DAK_M2) * 100) : null
  const buurtTekst = verschil === null
    ? null
    : verschil > 5
      ? `${verschil}% groter`
      : verschil < -5
        ? `${Math.abs(verschil)}% kleiner`
        : 'vergelijkbaar'

  // Energiebesparing schatting (alleen tonen als isolatie in werken zit OF dak oud is)
  const toonEnergie = oppervlakte && (werkenLijst.includes('isolatie') || werkenLijst.includes('totaalrenovatie') || bouwjaarOud)
  const energy = toonEnergie ? ENERGY_SAVINGS_BY_BUILD[lead.bouwjaar ?? 'onbekend'] : null
  const energySavings = energy && oppervlakte ? {
    eurMin: Math.round(energy.eurMin * oppervlakte),
    eurMax: Math.round(energy.eurMax * oppervlakte),
    co2Ton: ((energy.co2KgPerM2 * oppervlakte) / 1000).toFixed(2),
    label: energy.label,
  } : null

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">

        {/* Header */}
        <header className="bg-green-700 text-white px-8 py-10">
          <div className="text-xs uppercase tracking-widest opacity-75 mb-2">Uw persoonlijk dakrapport</div>
          <h1 className="text-3xl font-bold mb-1">{lead.adres ?? 'Uw woning'}</h1>
          <p className="text-sm opacity-90">{lead.gemeente ?? '—'} · opgesteld op {formatDate(lead.created_at)}</p>
        </header>

        <div className="p-8 space-y-10">

          {/* 3D model */}
          {lod2Url && (
            <section>
              <h2 className="text-xs uppercase tracking-widest text-green-700 font-bold mb-3">3D-model van uw dak</h2>
              <div className="rounded-xl overflow-hidden bg-gray-900" style={{ height: 360 }}>
                <iframe
                  src={`/lod2-viewer.html?glb=${encodeURIComponent(lod2Url)}&lat=${lat ?? ''}&lng=${lng ?? ''}`}
                  className="w-full h-full border-0"
                  title="3D Dakmodel"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">Sleep om te roteren · scroll om te zoomen</p>
            </section>
          )}

          {/* Dakvlakken-detail (alleen bij roofer) */}
          {lod2Meta && (() => {
            const allSurfaces = lod2Meta.per_building
              .filter((b) => b.source === 'roofer')
              .flatMap((b) => b.roof_surfaces ?? [])
            if (allSurfaces.length === 0) return null
            return (
              <section>
                <h2 className="text-xs uppercase tracking-widest text-green-700 font-bold mb-3">Dakvlakken — gemeten uit LiDAR</h2>
                <div className="rounded-xl bg-gray-50 border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-white border-b border-gray-200">
                      <tr className="text-left">
                        <th className="px-4 py-2 text-xs uppercase tracking-wider text-gray-500 font-medium">Vlak</th>
                        <th className="px-4 py-2 text-xs uppercase tracking-wider text-gray-500 font-medium">Oppervlakte</th>
                        <th className="px-4 py-2 text-xs uppercase tracking-wider text-gray-500 font-medium">Helling</th>
                        <th className="px-4 py-2 text-xs uppercase tracking-wider text-gray-500 font-medium">Oriëntatie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allSurfaces.map((s, i) => (
                        <tr key={i} className="border-b border-gray-100 last:border-0">
                          <td className="px-4 py-2 text-gray-700">#{i + 1}</td>
                          <td className="px-4 py-2 font-semibold text-gray-900">{s.area_m2.toFixed(1)} m²</td>
                          <td className="px-4 py-2 text-gray-700">{s.inclination !== null ? `${s.inclination.toFixed(0)}°` : '—'}</td>
                          <td className="px-4 py-2 text-gray-700">
                            {s.azimuth !== null ? `${s.azimuth.toFixed(0)}° (${azimuthLabel(s.azimuth)})` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Gemeten uit het 3D LiDAR-model. Oriëntatie en helling bepalen het zonnepotentieel en de geschatte regenwater-afvoer.
                </p>
              </section>
            )
          })()}

          {/* Data-kwaliteit (transparant per signaal) */}
          {lod2Meta && (
            <section>
              <h2 className="text-xs uppercase tracking-widest text-green-700 font-bold mb-3">Data-kwaliteit</h2>
              <div className={`rounded-xl border p-5 ${
                lod2Meta.quality.label === 'hoog' ? 'bg-emerald-50 border-emerald-200'
                : lod2Meta.quality.label === 'gemiddeld' ? 'bg-amber-50 border-amber-200'
                : lod2Meta.quality.label === 'beperkt' ? 'bg-orange-50 border-orange-200'
                : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="text-xs uppercase tracking-widest text-gray-500">Kwaliteit</span>
                  <span className="text-2xl font-bold capitalize">{lod2Meta.quality.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  {lod2Meta.quality.avg_point_density !== null && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Puntdichtheid</p>
                      <p className="font-semibold">{lod2Meta.quality.avg_point_density.toFixed(1)} pt/m²</p>
                    </div>
                  )}
                  {lod2Meta.quality.avg_rmse_m !== null && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Nauwkeurigheid</p>
                      <p className="font-semibold">±{lod2Meta.quality.avg_rmse_m.toFixed(2)}m RMSE</p>
                    </div>
                  )}
                  {lod2Meta.quality.avg_nodata_fraction !== null && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Coverage</p>
                      <p className="font-semibold">{((1 - lod2Meta.quality.avg_nodata_fraction) * 100).toFixed(0)}%</p>
                    </div>
                  )}
                </div>
                {lod2Meta.quality.n_synthetic > 0 && (
                  <p className="text-xs mt-3 leading-relaxed">
                    <strong>Transparantie:</strong> {lod2Meta.quality.n_synthetic} van de {lod2Meta.n_buildings} gebouwen op uw perceel werd geschat (geen recente LiDAR-data beschikbaar). De andere{' '}
                    {lod2Meta.quality.n_roofer === 1 ? 'is' : 'zijn'} gebaseerd op echte LiDAR-metingen.
                  </p>
                )}
                {lod2Meta.quality.label === 'synthetisch' && (
                  <p className="text-xs mt-3 leading-relaxed">
                    <strong>Let op:</strong> voor deze locatie hebben we geen recente LiDAR-data van de Vlaamse overheid. Het 3D-model is een schatting op basis van de perceelgrenzen en de geregistreerde gebouwhoogte uit het 3D GRB.
                  </p>
                )}
              </div>
            </section>
          )}

          {/* 1. Cijfers */}
          <section>
            <h2 className="text-xs uppercase tracking-widest text-green-700 font-bold mb-3">01 — Uw dak in cijfers</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Dakoppervlakte</p>
                <p className="text-2xl font-bold text-gray-900">{oppervlakte ?? '—'}<span className="text-sm font-normal text-gray-500"> m²</span></p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Daktype</p>
                <p className="text-2xl font-bold text-gray-900 capitalize">{daktype ?? '—'}</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Nokhoogte</p>
                <p className="text-2xl font-bold text-gray-900">{nokhoogte ?? '—'}<span className="text-sm font-normal text-gray-500"> m</span></p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Bron: 3D GRB Vlaanderen, Basisregisters &amp; DHMV II LiDAR</p>
          </section>

          {/* Buurtvergelijking */}
          {buurtTekst && oppervlakte && (
            <section>
              <h2 className="text-xs uppercase tracking-widest text-green-700 font-bold mb-3">Buurtvergelijking</h2>
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-5">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-3xl font-bold text-blue-900">{oppervlakte} m²</span>
                  <span className="text-sm text-blue-700">uw dak</span>
                </div>
                <p className="text-sm text-blue-900 leading-relaxed">
                  Uw dak is <strong>{buurtTekst}</strong> dan een gemiddelde Vlaamse woning ({VL_AVG_DAK_M2} m²). {' '}
                  {verschil! > 20 && 'Dit is bovengemiddeld — meer materiaalkost maar ook meer ruimte voor isolatie en zonnepanelen.'}
                  {verschil! < -20 && 'Compactere woning — werken zijn over het algemeen voordeliger.'}
                </p>
              </div>
            </section>
          )}

          {/* 2. Kostenindicatie */}
          {werkenLijst.length > 0 && oppervlakte && (
            <section>
              <h2 className="text-xs uppercase tracking-widest text-green-700 font-bold mb-3">02 — Kostenindicatie</h2>
              <div className="space-y-2">
                {werkenLijst.map((w) => {
                  const k = KOSTEN_RANGES[w]
                  if (!k) return null
                  const totaal = k.unit === 'm2' && oppervlakte
                    ? `${formatEur(oppervlakte * k.minPrijs)} – ${formatEur(oppervlakte * k.maxPrijs)}`
                    : null
                  return (
                    <div key={w} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-gray-200">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{typeWerkenLabels[w]}</p>
                        <p className="text-xs text-gray-500">{k.basis}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-green-700 text-sm">{k.range}</p>
                        {totaal && <p className="text-xs text-gray-500">{totaal} totaal</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                <strong>Indicatieve marktprijzen.</strong> Werkelijke prijs hangt af van toegankelijkheid, materiaalkeuze, asbest, isolatiewaarde en bestaande staat. Definitieve offerte na plaatsbezoek.
              </p>
            </section>
          )}

          {/* Energiebesparing */}
          {energySavings && (
            <section>
              <h2 className="text-xs uppercase tracking-widest text-green-700 font-bold mb-3">Mogelijke energiebesparing</h2>
              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 p-5">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-emerald-700 mb-1">Per jaar</p>
                    <p className="text-2xl font-bold text-emerald-900">{formatEur(energySavings.eurMin)} – {formatEur(energySavings.eurMax)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-emerald-700 mb-1">CO₂-besparing</p>
                    <p className="text-2xl font-bold text-emerald-900">{energySavings.co2Ton} ton/j</p>
                  </div>
                </div>
                <p className="text-sm text-emerald-900 leading-relaxed">
                  Schatting bij volledige dakisolatie ({energySavings.label}). Op 20 jaar tijd: {' '}
                  <strong>{formatEur(energySavings.eurMin * 20)} – {formatEur(energySavings.eurMax * 20)}</strong> potentieel bespaard.
                </p>
                <p className="text-xs text-emerald-700 mt-2">Berekening op basis van Belgische gasprijs ~€1,20/m³ en CO₂-uitstoot 0,20 kg/kWh aardgas.</p>
              </div>
            </section>
          )}

          {/* 3. Premies */}
          <section>
            <h2 className="text-xs uppercase tracking-widest text-green-700 font-bold mb-3">03 — Mogelijke premies</h2>
            <div className="space-y-2">
              {PREMIES.map((p) => (
                <a key={p.naam} href={p.link} target="_blank" rel="noopener" className="block p-3 rounded-lg border border-gray-200 hover:border-green-600 hover:bg-green-50 transition-colors">
                  <p className="font-semibold text-gray-900 text-sm">{p.naam} <span className="text-xs text-gray-400 font-normal">→ officiële calculator</span></p>
                  <p className="text-xs text-gray-600 mt-0.5">{p.omschrijving}</p>
                </a>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">Of u in aanmerking komt en welk bedrag, hangt af van uw inkomen en gezinssituatie.</p>
          </section>

          {/* 4. Aandachtspunten */}
          <section>
            <h2 className="text-xs uppercase tracking-widest text-green-700 font-bold mb-3">04 — Aandachtspunten voor uw dak</h2>
            <ul className="space-y-2">
              {bouwjaarOud && (
                <li className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="flex-shrink-0">⚠️</span>
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">Mogelijk asbest in oude leien</p>
                    <p className="text-xs text-amber-800">Bouwjaar {bouwjaarLabels[lead.bouwjaar!]}: leien-daken uit deze periode bevatten vaak asbest. Laat dit controleren vóór elke ingreep — er bestaat een aparte premie voor verwijdering.</p>
                  </div>
                </li>
              )}
              {werkenOud && (
                <li className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="flex-shrink-0">⏳</span>
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">Levensduur loopt op het einde</p>
                    <p className="text-xs text-amber-800">Laatste werken: {dakwerkenLabels[lead.laatste_dakwerken!]}. Een dak gaat gemiddeld 30-50 jaar mee. Een inspectie is aan te raden om verrassingen voor te zijn.</p>
                  </div>
                </li>
              )}
              {lekkageJa && (
                <li className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <span className="flex-shrink-0">🚨</span>
                  <div>
                    <p className="font-semibold text-red-900 text-sm">Lekkage gemeld — actie aanbevolen</p>
                    <p className="text-xs text-red-800">U meldde recente lekkage. Uitstel verergert vochtschade aan dakstructuur en isolatie. Een snelle inspectie bespaart vaak grote kosten.</p>
                  </div>
                </li>
              )}
              <li className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <span className="flex-shrink-0">🍂</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Seizoensonderhoud dakgoten</p>
                  <p className="text-xs text-gray-700">Twee keer per jaar dakgoten reinigen voorkomt 80% van waterschade. Vooral oktober (bladval) en maart (na de winter).</p>
                </div>
              </li>
              {isPlat && (
                <li className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="flex-shrink-0">💧</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Plat dak: controleer de afvoer</p>
                    <p className="text-xs text-gray-700">Bij plat dak is een verstopte afvoer dé grootste oorzaak van lekkage. Jaarlijks visueel controleren en bladkooien plaatsen.</p>
                  </div>
                </li>
              )}
              {!isPlat && (
                <li className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="flex-shrink-0">🏠</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Visuele controle pannen</p>
                    <p className="text-xs text-gray-700">Na elke storm: kijk naar verschoven, gebarsten of ontbrekende pannen. Eén losliggende pan kan een lekkage starten.</p>
                  </div>
                </li>
              )}
              <li className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <span className="flex-shrink-0">🧊</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Isolatie controleren in winter</p>
                  <p className="text-xs text-gray-700">Smelt sneeuw onevenredig op uw dak? Dan is uw isolatie ondermaats. Dit is meteen een EPB-aandachtspunt.</p>
                </div>
              </li>
            </ul>
          </section>

          {/* 5. Wist u dat */}
          <section>
            <h2 className="text-xs uppercase tracking-widest text-green-700 font-bold mb-3">05 — Wist u dat</h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>💡 BTW van 6% (i.p.v. 21%) op renovatiewerken bij woningen ouder dan 10 jaar.</li>
              <li>💡 Premies kunnen vaak gestapeld worden (Vlaamse + provinciale + gemeentelijke).</li>
              <li>💡 Een geïsoleerd dak betekent gemiddeld 25-30% minder energieverbruik.</li>
              <li>💡 Sinds 2023 is een EPC-attest verplicht bij verkoop én bij grote renovaties.</li>
            </ul>
          </section>

          {/* CTA */}
          <section className="rounded-xl bg-green-50 border-2 border-green-200 p-6 text-center">
            <h3 className="text-lg font-bold text-green-900 mb-1">Klaar voor de volgende stap?</h3>
            <p className="text-sm text-green-800 mb-4">Bespreek dit rapport met een onafhankelijke dakexpert uit ons netwerk. Gratis en zonder verplichtingen.</p>
            <a href={`tel:${process.env.NEXT_PUBLIC_OWNER_PHONE ?? ''}`} className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800">
              📞 Bel een dakexpert
            </a>
          </section>

          {/* Footer */}
          <footer className="pt-6 border-t border-gray-200 text-xs text-gray-500 leading-relaxed">
            <p className="mb-1"><strong>Dit rapport is informatief.</strong> Een gecertificeerde dakwerker uit ons netwerk maakt op aanvraag een definitieve offerte na plaatsbezoek.</p>
            <p>Berekeningen op basis van: <em>3D GRB Vlaanderen</em>, <em>Basisregisters Vlaanderen</em>, <em>DHMV II LiDAR</em>. Wij verkopen geen dakwerken — wij brengen u in contact met de juiste vakman in uw regio.</p>
            <p className="mt-2 opacity-60">Rapport ID: {lead.id}</p>
          </footer>

        </div>
      </div>
    </div>
  )
}
