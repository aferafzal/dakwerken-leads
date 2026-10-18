import { Clock, Droplets, Info, Landmark, Phone, ShieldAlert, Wrench } from 'lucide-react'
import type { Aandachtspunt, RapportData } from '@/lib/rapport'
import { kaderRond, luchtfotoUrl } from '@/lib/rapport'
import { euro } from '@/lib/kosten'
import type { Windrichting } from '@/lib/dakscan'
import { BEDRIJF } from '@/lib/bedrijf'
import DakscanBeeld from './DakscanBeeld'
import DeelKnoppen from './DeelKnoppen'

const KORT: Record<Windrichting, string> = {
  noord: 'Noord', noordoost: 'Noordoost', oost: 'Oost', zuidoost: 'Zuidoost',
  zuid: 'Zuid', zuidwest: 'Zuidwest', west: 'West', noordwest: 'Noordwest',
}

const ICOON: Record<Aandachtspunt['soort'], typeof Info> = {
  erfgoed: Landmark,
  asbest: ShieldAlert,
  leeftijd: Clock,
  lekkage: Droplets,
  onderhoud: Wrench,
}

const getal = (n: number, d = 0) => n.toLocaleString('nl-BE', { minimumFractionDigits: d, maximumFractionDigits: d })
const datum = (iso: string) => new Date(iso).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })
const cssTekst = (s: string) => `"${s.replace(/["\\]/g, '')}"`

const TELEFOON = process.env.NEXT_PUBLIC_OWNER_PHONE ?? ''
const WHATSAPP = process.env.NEXT_PUBLIC_OWNER_WHATSAPP ?? ''

function Sectie({ titel, inleiding, children, klasse = '' }: { titel: string; inleiding?: string; children: React.ReactNode; klasse?: string }) {
  return (
    <section className={`blok ${klasse}`}>
      <SectieKop titel={titel} inleiding={inleiding} />
      <div className="mt-5">{children}</div>
    </section>
  )
}

function SectieKop({ titel, inleiding }: { titel: string; inleiding?: string }) {
  return (
    <>
      <h2 className="text-2xl font-black tracking-tight text-navy text-balance">{titel}</h2>
      {inleiding && <p className="mt-1.5 max-w-prose text-[15px] leading-relaxed text-slate-600">{inleiding}</p>}
    </>
  )
}

export default function Rapport({ data, voorbeeld = false }: { data: RapportData; voorbeeld?: boolean }) {
  const hoofdPrijs = data.kosten.find((k) => k.totaal)
  const samenvatting = [
    data.dakvorm,
    data.helling !== null && `helling\u00a0±${data.helling}°`,
    data.nokhoogte !== null && `nokhoogte ${getal(data.nokhoogte, 1)}\u00a0m`,
  ].filter(Boolean).join(' · ')

  const ringen = data.gebouwen.map((g) => g.omtrek).filter((r): r is [number, number][] => !!r)
  const kader = kaderRond(ringen, 16 / 10, 0.3, 26)
  const metBeeld = kader && data.gebouwen.some((g) => g.scan)

  // Vlakken met dezelfde richting samen (zoals in de funnel)
  const perRichting = new Map<string, { richting: Windrichting | null; helling: number; dakOppervlak: number }>()
  for (const v of data.vlakken.filter((v) => v.dakOppervlak >= 3)) {
    const k = v.richting ?? 'plat'
    const b = perRichting.get(k)
    if (!b) perRichting.set(k, { ...v })
    else {
      const opp = b.dakOppervlak + v.dakOppervlak
      b.helling = Math.round((b.helling * b.dakOppervlak + v.helling * v.dakOppervlak) / opp)
      b.dakOppervlak = opp
    }
  }
  const vlakRijen = [...perRichting.values()].sort((a, b) => b.dakOppervlak - a.dakOppervlak)

  const printCss = `
    @page {
      size: A4;
      margin: 15mm 16mm 17mm;
      @bottom-left  { content: ${cssTekst(`${BEDRIJF.handelsnaam} · Dakrapport ${data.adres} · ${new Date(data.datum).toLocaleDateString('nl-BE')}`)};
                      font: 400 7.5pt Inter, Arial, sans-serif; color: #888; }
      @bottom-right { content: "Pagina " counter(page) " / " counter(pages);
                      font: 400 7.5pt Inter, Arial, sans-serif; color: #888; }
    }
    @media print {
      html, body { background: #fff !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body > header, body > footer, body > div.fixed, nextjs-portal { display: none !important; }
      .rapport-kop { background: #fff !important; padding: 0 0 6mm !important; }
      .rapport-kop, .rapport-kop * { color: #0f172a !important; }
      .rapport-kop .kop-raster { display: grid !important; grid-template-columns: 1fr 0.85fr; gap: 8mm; align-items: end; max-width: none; }
      .rapport-kop .kop-raster dl { margin-top: 5mm; }
      .rapport-kop .kop-raster img { max-height: 50mm; }
      .rapport-inhoud { padding: 0 !important; gap: 8mm !important; max-width: none !important; }
      .scan-raster { display: grid !important; grid-template-columns: 1.5fr 1fr; gap: 6mm; align-items: start; }
      .scan-raster table { margin-top: 0 !important; }
      .scan-raster table + table { margin-top: 5mm !important; }
      .rapport-kop h1 { font-size: 20pt !important; }
      .compact-print li { padding-top: 1.5mm !important; padding-bottom: 1.5mm !important; }
      .compact-print-blok { padding: 5mm !important; }
      .compact-print-blok h2 { font-size: 15pt !important; }
      .rapport-inhoud h2 { font-size: 16pt; }
      .rapport-inhoud section > div.mt-5 { margin-top: 3.5mm; }
      .blok { break-inside: avoid; }
      .print-nieuwe-pagina { break-before: page; }
    }
  `

  return (
    <div className="bg-white">
      <style>{printCss}</style>

      {/* Kop: adres, samenvatting en (indien beschikbaar) de gevel */}
      <div className="rapport-kop bg-navy px-4 pt-28 pb-12 sm:px-6">
        <div className={`kop-raster mx-auto grid max-w-4xl gap-8 ${data.streetView ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-end' : ''}`}>
          <div>
            {voorbeeld && (
              <p className="mb-4 inline-block rounded-md bg-amber px-2.5 py-1 text-xs font-bold text-navy print:hidden">
                Testrapport met publieke gegevens: niet verstuurd
              </p>
            )}
            <h1 className="text-3xl font-black leading-tight tracking-tight text-white text-balance sm:text-4xl">
              Dakrapport {data.adres.replace(/ (\d)/, '\u00a0$1')}
            </h1>
            <p className="mt-2 text-sm text-white/75">
              {data.gemeente ? `${data.gemeente} · ` : ''}opgesteld op {datum(data.datum)}
            </p>

            <dl className="mt-8 space-y-4">
              {data.totaalDak !== null && (
                <div>
                  <dt className="text-sm text-white/75">Dakoppervlakte{data.gebouwen.length > 1 ? `, ${data.gebouwen.length} gebouwen` : ''}</dt>
                  <dd className="text-4xl font-black tabular-nums tracking-tight text-white">±{getal(data.totaalDak)}{'\u00a0'}m²</dd>
                  {samenvatting && <dd className="mt-1 text-sm text-white/85">{samenvatting}</dd>}
                </div>
              )}
              {hoofdPrijs?.totaal && (
                <div>
                  <dt className="text-sm text-white/75">{hoofdPrijs.naam}, indicatief</dt>
                  <dd className="text-2xl font-bold tabular-nums text-white">
                    {euro(hoofdPrijs.totaal[0])} – {euro(hoofdPrijs.totaal[1])}
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-8">
              <DeelKnoppen adres={data.adres} donker />
            </div>
          </div>

          {data.streetView && (
            <figure className="m-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.streetView} alt={`Gevel van ${data.adres}`} className="aspect-[2/1] w-full rounded-xl object-cover" />
              <figcaption className="mt-1.5 text-xs text-white/60">Uw woning vanuit de straat · © Google Street View</figcaption>
            </figure>
          )}
        </div>
      </div>

      <div className="rapport-inhoud mx-auto flex max-w-4xl flex-col gap-16 px-4 py-14 sm:px-6">

        {/* Uw dak gemeten */}
        <Sectie
          titel="Uw dak gemeten"
          inleiding={data.gemeten
            ? 'Elk dakvlak gemeten met de laserhoogtemeting van de Vlaamse overheid: richting, helling en oppervlakte.'
            : data.metingTekst}
        >
          <div className="scan-raster">
          {metBeeld && kader && (
            <div className="scan-beeld">
            <DakscanBeeld
              kader={kader}
              luchtfoto={luchtfotoUrl('Ortho', kader, 1200, 750, 'OMWRGBMRVL')}
              gebouwen={data.gebouwen.map((g) => ({ scan: g.scan, omtrek: g.omtrek, woning: g.woning }))}
              adres={data.adres}
            />
            </div>
          )}

          <div>
          {vlakRijen.length > 0 && (
            <table className="mt-6 w-full text-sm">
              <caption className="mb-2 text-left text-sm font-semibold text-navy">
                {data.gebouwen.length > 1 ? 'Dakvlakken van uw woning' : 'Dakvlakken'}
              </caption>
              <thead>
                <tr className="border-b-2 border-navy text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="py-2 pr-3 font-semibold">Richting</th>
                  <th className="py-2 pr-3 text-right font-semibold">Helling</th>
                  <th className="py-2 text-right font-semibold">Oppervlakte</th>
                </tr>
              </thead>
              <tbody>
                {vlakRijen.map((v) => (
                  <tr key={v.richting ?? 'plat'} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-semibold text-navy">{v.richting ? KORT[v.richting] : 'Plat'}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-700">{v.richting ? `${v.helling}°` : '—'}</td>
                    <td className="py-2 text-right font-semibold tabular-nums text-navy">{getal(v.dakOppervlak)}{'\u00a0'}m²</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {data.gebouwen.length > 1 && (
            <table className="mt-6 w-full text-sm">
              <caption className="mb-2 text-left text-sm font-semibold text-navy">Gebouwen die meetellen</caption>
              <tbody>
                {data.gebouwen.map((g) => (
                  <tr key={g.naam} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-semibold text-navy">{g.naam}</td>
                    <td className="py-2 pr-3 text-slate-700">{g.dakvorm ?? '—'}</td>
                    <td className="py-2 text-right font-semibold tabular-nums text-navy">{getal(g.dakOppervlak)}{'\u00a0'}m²</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          </div>
          </div>

          {data.gemeten && (
            <p className="mt-3 flex gap-2 text-xs leading-relaxed text-slate-600">
              <Info className="mt-px h-3.5 w-3.5 flex-shrink-0" aria-hidden />
              {data.metingTekst}
            </p>
          )}

          {data.drieD && (
            <div className="mt-6 overflow-hidden rounded-xl bg-navy print:hidden" style={{ height: 360 }}>
              <iframe src={data.drieD} className="h-full w-full border-0" title="3D-model van het dak" />
            </div>
          )}
        </Sectie>

        {/* Wat kost het */}
        {data.kosten.length > 0 && (
          <Sectie
            klasse="print-nieuwe-pagina"
            titel="Wat kost het?"
            inleiding="Een prijsvork per soort werk, berekend uit de gemeten oppervlakte en de gangbare prijzen per m². De echte prijs hangt af van materiaal, bereikbaarheid en de staat van het dak."
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-navy text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="py-2 pr-3 font-semibold">Werk</th>
                  <th className="py-2 text-right font-semibold">Indicatie</th>
                </tr>
              </thead>
              <tbody>
                {data.kosten.map((k) => (
                  <tr key={k.soort} className="border-b border-slate-100 align-top">
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-navy">{k.naam}</p>
                      <p className="text-slate-600">
                        {k.oppervlakte ? `${getal(k.oppervlakte)}\u00a0m² × ${k.eenheidsprijs}` : `${k.uitleg}, ${k.eenheidsprijs}`}
                      </p>
                    </td>
                    <td className="whitespace-nowrap py-3 text-right font-bold tabular-nums text-navy">
                      {k.totaal ? `${euro(k.totaal[0])} – ${euro(k.totaal[1])}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 max-w-prose text-xs leading-relaxed text-slate-600">
              Indicatieve marktprijzen. Een gecertificeerde dakwerker maakt na een plaatsbezoek een definitieve offerte.
              Voor de renovatie van een woning ouder dan tien jaar geldt meestal 6% btw in plaats van 21%.
            </p>
          </Sectie>
        )}

        {/* Aandachtspunten: de titel blijft bij het eerste punt, de rest mag over twee pagina's lopen */}
        <section>
          {data.aandachtspunten.map((a, i) => {
            const Icoon = ICOON[a.soort]
            const punt = (
              <div className="flex gap-3 rounded-xl border border-slate-200 p-4">
                <Icoon className="mt-0.5 h-5 w-5 flex-shrink-0 text-navy" aria-hidden />
                <div className="text-sm">
                  <h3 className="font-semibold text-navy">{a.titel}</h3>
                  <p className="mt-0.5 leading-relaxed text-slate-700">{a.tekst}</p>
                  {a.link && (
                    <a href={a.link} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-semibold text-navy underline underline-offset-2 print:hidden">
                      Meer informatie
                    </a>
                  )}
                </div>
              </div>
            )
            return i === 0 ? (
              <div key={a.titel} className="blok">
                <SectieKop titel="Aandachtspunten" />
                <div className="mt-5">{punt}</div>
              </div>
            ) : (
              <div key={a.titel} className="blok mt-3">{punt}</div>
            )
          })}
        </section>

        {/* Door de jaren heen */}
        {data.jaren.length > 0 && (
          <Sectie
            titel="Uw dak door de jaren heen"
            inleiding="Luchtfoto's van Digitaal Vlaanderen. Kreeg uw dak ergens een andere kleur? Dan werd het toen waarschijnlijk vernieuwd."
          >
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {data.jaren.map((j) => (
                <li key={j.jaar}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={j.url} alt={`Luchtfoto ${j.jaar}`} loading="lazy" className="aspect-square w-full rounded-lg bg-slate-100 object-cover" />
                  <p className="mt-1 text-center text-sm font-semibold tabular-nums text-navy">{j.jaar}</p>
                </li>
              ))}
            </ol>
          </Sectie>
        )}

        {/* Premies */}
        <Sectie
          titel="Premies en financiering"
          inleiding="Of u in aanmerking komt en voor welk bedrag, hangt af van uw inkomen en uw woning. De officiële pagina's geven de juiste voorwaarden."
        >
          <ul className="compact-print divide-y divide-slate-100 border-y border-slate-100 text-sm">
            <li className="py-3">
              <a href="https://www.vlaanderen.be/bouwen-wonen-en-energie/bouwen-en-verbouwen/premies-voor-renovatie/mijn-verbouwpremie/mijn-verbouwpremie-voor-dak" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline underline-offset-2">
                Mijn VerbouwPremie voor het dak
              </a>
              <p className="mt-0.5 text-slate-700">Vlaamse premie voor dakisolatie en, afhankelijk van uw inkomen, dakrenovatie. Voor woningen van vóór 2006, uitgevoerd door een aannemer. U vraagt ze aan na de eindfactuur.</p>
            </li>
            <li className="py-3">
              <a href="https://www.vlaanderen.be/bouwen-wonen-en-energie/lenen-voor-een-woning/mijn-verbouwlening" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline underline-offset-2">
                Mijn VerbouwLening
              </a>
              <p className="mt-0.5 text-slate-700">Voordelige of renteloze lening voor energiezuinige renovaties, zoals dakisolatie. De rente hangt af van uw inkomen.</p>
            </li>
            <li className="py-3">
              <p className="font-semibold text-navy">Uw gemeente</p>
              <p className="mt-0.5 text-slate-700">Sommige gemeenten en afvalintercommunales geven een extra premie, bijvoorbeeld voor dakisolatie of het verwijderen van asbest. Vraag het na bij uw gemeente.</p>
            </li>
          </ul>
        </Sectie>

        {/* Volgende stap */}
        <section className="compact-print-blok blok rounded-2xl bg-navy p-6 sm:p-8 print:border print:border-slate-300 print:bg-white">
          <h2 className="text-2xl font-black tracking-tight text-white print:text-navy">Wilt u een offerte?</h2>
          <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-white/80 print:text-slate-700">
            Een gecertificeerde dakwerker uit ons netwerk bekijkt uw dak en maakt een offerte op maat.
            Offerte binnen 2 uur, op werkdagen. Gratis en zonder verplichting.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 print:hidden">
            {TELEFOON && (
              <a href={`tel:${TELEFOON}`} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber px-6 font-bold text-navy transition-[filter] hover:brightness-95">
                <Phone className="h-4 w-4" aria-hidden />
                Bel {TELEFOON}
              </a>
            )}
            {WHATSAPP && (
              <a
                href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hallo, ik heb mijn dakrapport voor ${data.adres} en wil graag een offerte.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center rounded-xl border border-white/30 px-6 font-semibold text-white transition-colors hover:border-white/60"
              >
                Stuur een WhatsApp
              </a>
            )}
          </div>
          {TELEFOON && <p className="mt-3 hidden text-sm font-semibold text-navy print:block">Bel {TELEFOON}</p>}
        </section>

        {/* Bronnen */}
        <footer className="blok border-t border-slate-200 pt-6 text-xs leading-relaxed text-slate-600">
          <p>
            <strong className="text-navy">Dit rapport is informatief.</strong> {BEDRIJF.handelsnaam} brengt u in contact met een
            gecertificeerde dakwerker uit ons netwerk; die maakt na een plaatsbezoek een definitieve offerte.
          </p>
          <p className="mt-2">
            Bronnen: luchtfoto&apos;s en laserhoogtemeting (DHMV II) van Digitaal Vlaanderen, Gebouwenregister en Kadaster
            (Basisregisters Vlaanderen), erfgoed van het agentschap Onroerend Erfgoed{data.streetView ? ', gevelbeeld van Google Street View' : ''}.
          </p>
          <p className="mt-2 text-slate-500">Rapport {data.id}</p>
        </footer>
      </div>
    </div>
  )
}
