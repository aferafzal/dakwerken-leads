/**
 * Doorsnede van een hellend dak (render uit Blender), met de lagen genummerd van buiten naar binnen.
 * De nummers staan als echte tekst op het beeld: scherp op elk scherm, en de legende is leesbaar voor schermlezers.
 * nadruk = de lagen die oranje oplichten (bv. wat bij de werken hoort).
 */
export type Laag = 'pannen' | 'panlatten' | 'tengellatten' | 'onderdak' | 'isolatie' | 'kepers' | 'dampscherm' | 'afwerking'

// Posities in % van het beeld, berekend met de camera in Blender (public/doorsnede-dak.jpg, 1040 × 900)
const LAGEN: { laag: Laag; naam: string; kort?: string; x: number; y: number }[] = [
  { laag: 'pannen', naam: 'Dakpannen', x: 54.4, y: 18.1 },
  { laag: 'panlatten', naam: 'Panlatten', x: 35.1, y: 35.7 },
  { laag: 'tengellatten', naam: 'Tengellatten', x: 72.9, y: 36.1 },
  { laag: 'onderdak', naam: 'Onderdak', x: 50.1, y: 54.4 },
  { laag: 'isolatie', naam: 'Isolatie', x: 28.3, y: 56.1 },
  { laag: 'kepers', naam: 'Kepers', x: 48.2, y: 82.6 },
  { laag: 'dampscherm', naam: 'Dampscherm', x: 64.0, y: 80.2 },
  { laag: 'afwerking', naam: 'Binnenafwerking', kort: 'Afwerking', x: 86.2, y: 73.8 },
]

export default function DakDoorsnede({ nadruk = [], klein = false, onderschrift }: {
  nadruk?: Laag[]
  klein?: boolean
  onderschrift?: string
}) {
  const kleur = (l: Laag) => (nadruk.includes(l) ? 'bg-amber text-navy' : 'bg-navy text-white')

  return (
    <figure className={`doorsnede m-0 grid items-center ${klein
      ? 'grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-2.5'
      : 'gap-5 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]'}`}>
      <div className="relative overflow-hidden rounded-xl bg-[#f3f3f3]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/doorsnede-dak.jpg"
          width={1040}
          height={900}
          alt="Doorsnede van een hellend dak, van de dakpannen buiten tot de afwerking binnen"
          className="block h-auto w-full"
          loading="lazy"
          decoding="async"
        />
        {LAGEN.map((l, i) => (
          <span
            key={l.laag}
            aria-hidden
            className={`laag-badge absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-bold tabular-nums shadow-md ring-2 ring-white ${
              klein ? 'h-5 w-5 text-[11px] sm:h-6 sm:w-6 sm:text-xs' : 'h-7 w-7 text-sm'} ${kleur(l.laag)}`}
            style={{ left: `${l.x}%`, top: `${l.y}%`, '--laag-vertraging': `${150 + i * 70}ms` } as React.CSSProperties}
          >
            {i + 1}
          </span>
        ))}
      </div>

      <figcaption>
        <ol className={klein ? 'space-y-0.5 text-[12.5px] leading-5 sm:space-y-1.5 sm:text-sm' : 'grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-1'}>
          {LAGEN.map((l, i) => {
            const aan = nadruk.includes(l.laag)
            return (
              <li key={l.laag} className={`flex items-center ${klein ? 'gap-1.5' : 'gap-2'}`}>
                <span aria-hidden className={`flex flex-shrink-0 items-center justify-center rounded-full font-bold tabular-nums ${
                  klein ? 'h-4 w-4 text-[10px] sm:h-5 sm:w-5 sm:text-[11px]' : 'h-5 w-5 text-[11px]'} ${kleur(l.laag)}`}>
                  {i + 1}
                </span>
                <span className={aan ? 'font-semibold text-navy' : 'text-slate-700'}>{klein ? (l.kort ?? l.naam) : l.naam}</span>
              </li>
            )
          })}
        </ol>
        {onderschrift && <p className="mt-3 text-xs leading-relaxed text-slate-600">{onderschrift}</p>}
      </figcaption>
    </figure>
  )
}
