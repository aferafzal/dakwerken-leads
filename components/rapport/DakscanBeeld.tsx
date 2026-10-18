'use client'

import { useEffect, useState } from 'react'
import type { Dakscan } from '@/lib/dakscan'
import { MIDDEN, NOORD, ZUID, rgb, tekenScan } from '@/lib/dakscan-kleur'

type Gebouw = { scan: Dakscan | null; omtrek: [number, number][] | null; woning: boolean }

interface Props {
  // Kader in Lambert72 (x0, y0, x1, y1) en de luchtfoto voor dat kader
  kader: [number, number, number, number]
  luchtfoto: string
  gebouwen: Gebouw[]
  adres: string
}

// Luchtfoto met de gekleurde dakvlakken en de gebouwomtrek. Alles in Lambert72, dus exact passend.
// Werkt ook bij afdrukken: luchtfoto en vlakken zijn gewone afbeeldingen.
export default function DakscanBeeld({ kader, luchtfoto, gebouwen, adres }: Props) {
  const [x0, y0, x1, y1] = kader
  const B = x1 - x0
  const H = y1 - y0
  const [vlakken, setVlakken] = useState<{ url: string; stijl: React.CSSProperties }[]>([])

  useEffect(() => {
    const lagen: { url: string; stijl: React.CSSProperties }[] = []
    for (const g of gebouwen) {
      const r = g.scan?.raster
      if (!g.scan || !r) continue
      const url = tekenScan(g.scan)
      if (!url) continue
      const [rx0, ry0, rx1, ry1] = r.lambert
      lagen.push({
        url,
        stijl: {
          left: `${((rx0 - x0) / B) * 100}%`,
          top: `${((y1 - ry1) / H) * 100}%`,
          width: `${((rx1 - rx0) / B) * 100}%`,
          height: `${((ry1 - ry0) / H) * 100}%`,
        },
      })
    }
    setVlakken(lagen)
  }, [gebouwen, x0, y1, B, H])

  const heeftVlakken = gebouwen.some((g) => g.scan?.raster)

  return (
    <figure className="m-0">
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100" style={{ aspectRatio: `${B} / ${H}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={luchtfoto} alt={`Luchtfoto van ${adres}`} className="absolute inset-0 h-full w-full" />
        {vlakken.map((v, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={v.url} alt="" aria-hidden className="absolute" style={v.stijl} />
        ))}
        <svg viewBox={`0 0 ${B} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          {gebouwen.map((g, i) =>
            g.omtrek ? (
              <polygon
                key={i}
                points={g.omtrek.map(([x, y]) => `${x - x0},${y1 - y}`).join(' ')}
                fill="none"
                stroke="#ffffff"
                strokeWidth={g.woning ? 3 : 2}
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
              />
            ) : null,
          )}
        </svg>
      </div>
      {heeftVlakken && (
        <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            Noord
            <span
              className="inline-block h-2 w-14 rounded-full"
              style={{ background: `linear-gradient(90deg, ${rgb(NOORD)}, ${rgb(MIDDEN)}, ${rgb(ZUID)})` }}
              aria-hidden
            />
            Zuid
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm border border-slate-300 bg-white" aria-hidden />
            Plat
          </span>
          <span>Kleur volgens de richting van het dakvlak</span>
          <span className="basis-full">Luchtfoto © Digitaal Vlaanderen</span>
        </figcaption>
      )}
    </figure>
  )
}
