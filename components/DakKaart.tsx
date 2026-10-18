'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Check, LoaderCircle } from 'lucide-react'
import type { GebouwInfo, PerceelKlikResultaat } from '@/app/api/dakmeting/route'
import type { Dakscan, Dakvlak, Windrichting } from '@/lib/dakscan'
import { hoofdGebouw } from '@/lib/dak'

export type PerceelSelectie = PerceelKlikResultaat

export type KaartFase = 'zoeken' | 'meten' | 'klaar' | 'leeg'
type Fase = KaartFase

interface DakKaartProps {
  lat: number
  lng: number
  onPerceelSelect: (data: PerceelSelectie) => void
  onFase?: (fase: KaartFase) => void
}

const CODES = '0123456789abcdefghijklmnopqrstuvwxyz'

// Kleur volgens de zon: noord grijsblauw → oost/west licht oranje → zuid oranje. Plat: wit.
const NOORD: [number, number, number] = [148, 163, 184]
const MIDDEN: [number, number, number] = [254, 215, 170]
const ZUID: [number, number, number] = [249, 115, 22]
const PLAT: [number, number, number] = [255, 255, 255]

function meng(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as [number, number, number]
}

function vlakKleur(v: Dakvlak): [number, number, number] {
  if (v.richting === null) return PLAT
  return v.zon >= 0.5 ? meng(MIDDEN, ZUID, (v.zon - 0.5) / 0.5) : meng(NOORD, MIDDEN, v.zon / 0.5)
}

const rgb = ([r, g, b]: [number, number, number], a = 1) => `rgba(${r}, ${g}, ${b}, ${a})`

const KORT: Record<Windrichting, string> = {
  noord: 'Noord', noordoost: 'Noordoost', oost: 'Oost', zuidoost: 'Zuidoost',
  zuid: 'Zuid', zuidwest: 'Zuidwest', west: 'West', noordwest: 'Noordwest',
}

const getal = (n: number, decimalen = 0) =>
  n.toLocaleString('nl-BE', { minimumFractionDigits: decimalen, maximumFractionDigits: decimalen })

// Gekleurde dakvlakken als beeld, met witte lijnen waar twee vlakken elkaar raken (nok, kil, knik).
// Het raster (25 cm) wordt bilineair verfijnd, zodat grenzen vloeiend lopen in plaats van in trapjes.
function tekenScan(scan: Dakscan): string | null {
  const r = scan.raster
  if (!r) return null
  const S = 6
  const B = r.breedte * S
  const H = r.hoogte * S
  const canvas = document.createElement('canvas')
  canvas.width = B
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const code = (rij: number, kol: number) =>
    r.cellen[Math.min(Math.max(rij, 0), r.hoogte - 1) * r.breedte + Math.min(Math.max(kol, 0), r.breedte - 1)]

  // Fijn label per pixel: het vlak met het grootste bilineaire gewicht van de 4 omliggende cellen
  const fijn = new Array<string>(B * H)
  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / S - 0.5
    const r0 = Math.floor(v), tv = v - r0
    for (let x = 0; x < B; x++) {
      const u = (x + 0.5) / S - 0.5
      const k0 = Math.floor(u), tu = u - k0
      const a = code(r0, k0), b = code(r0, k0 + 1), c = code(r0 + 1, k0), d = code(r0 + 1, k0 + 1)
      if (a === b && a === c && a === d) { fijn[y * B + x] = a; continue }
      const gewicht = new Map<string, number>()
      gewicht.set(a, (gewicht.get(a) ?? 0) + (1 - tu) * (1 - tv))
      gewicht.set(b, (gewicht.get(b) ?? 0) + tu * (1 - tv))
      gewicht.set(c, (gewicht.get(c) ?? 0) + (1 - tu) * tv)
      gewicht.set(d, (gewicht.get(d) ?? 0) + tu * tv)
      let beste = a, max = -1
      gewicht.forEach((w, k) => { if (w > max) { max = w; beste = k } })
      fijn[y * B + x] = beste
    }
  }

  const perCode = new Map(scan.vlakken.map((v) => [CODES[v.nr], v]))
  const beeld = ctx.createImageData(B, H)
  for (let i = 0; i < B * H; i++) {
    const v = perCode.get(fijn[i])
    if (!v) continue
    const x = i % B, y = (i / B) | 0
    // Grens met een ander vlak (niet met de buitenkant): witte lijn van ±2 px
    const rechts = x + 1 < B ? fijn[i + 1] : '.'
    const onder = y + 1 < H ? fijn[i + B] : '.'
    const links = x > 0 ? fijn[i - 1] : '.'
    const boven = y > 0 ? fijn[i - B] : '.'
    const grens = [rechts, onder, links, boven].some((n) => n !== '.' && n !== fijn[i])
    const [rr, gg, bb] = grens ? [255, 255, 255] : vlakKleur(v)
    beeld.data[i * 4] = rr
    beeld.data[i * 4 + 1] = gg
    beeld.data[i * 4 + 2] = bb
    beeld.data[i * 4 + 3] = grens ? 240 : v.richting === null ? 140 : 200
  }
  ctx.putImageData(beeld, 0, 0)
  return canvas.toDataURL('image/png')
}

function binnen([lat, lng]: [number, number], ring: [number, number][]): boolean {
  let ja = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ai, bi] = ring[i]
    const [aj, bj] = ring[j]
    if ((ai > lat) !== (aj > lat) && lng < ((bj - bi) * (lat - ai)) / (aj - ai) + bi) ja = !ja
  }
  return ja
}

// Het gebouw onder het punt; anders het dichtstbijzijnde middelpunt
function aangeduidGebouw(gebouwen: GebouwInfo[], punt: [number, number]): number {
  const raak = gebouwen.findIndex((g) => g.grenzen.length > 2 && binnen(punt, g.grenzen))
  if (raak >= 0) return raak
  let beste = -1, afstand = Infinity
  gebouwen.forEach((g, i) => {
    if (g.grenzen.length < 3) return
    const lat = g.grenzen.reduce((s, p) => s + p[0], 0) / g.grenzen.length
    const lng = g.grenzen.reduce((s, p) => s + p[1], 0) / g.grenzen.length
    const d = Math.hypot(lat - punt[0], (lng - punt[1]) * 0.63)
    if (d < afstand) { afstand = d; beste = i }
  })
  return beste
}

export default function DakKaart({ lat, lng, onPerceelSelect, onFase }: DakKaartProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const callbackRef = useRef(onPerceelSelect)
  callbackRef.current = onPerceelSelect
  const faseRef = useRef(onFase)
  faseRef.current = onFase

  const [luchtfoto, setLuchtfoto] = useState(false)
  const [fase, zetFase] = useState<Fase>('zoeken')
  const setFase = (f: Fase) => { zetFase(f); faseRef.current?.(f) }
  const [selectie, setSelectie] = useState<PerceelSelectie | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 19,
      maxZoom: 21,
      zoomControl: true,
      // Op gsm: één vinger scrolt de pagina, niet de kaart (inzoomen met twee vingers blijft)
      dragging: !L.Browser.mobile,
    })
    mapInstance.current = map

    const foto = L.tileLayer.wms('https://geo.api.vlaanderen.be/OMWRGBMRVL/wms', {
      layers: 'Ortho',
      format: 'image/jpeg',
      transparent: false,
      maxZoom: 21,
      attribution: '© Digitaal Vlaanderen',
    }).addTo(map)
    foto.once('load', () => setLuchtfoto(true))

    L.circleMarker([lat, lng], {
      radius: 6,
      color: '#ffffff',
      fillColor: '#0f172a',
      fillOpacity: 1,
      weight: 2,
    }).addTo(map).bindTooltip('Uw adres', {
      permanent: true,
      direction: 'top',
      offset: [0, -8],
      className: 'dakkaart-adres',
    })

    const lagen = L.layerGroup().addTo(map)
    const labelLaag = L.layerGroup().addTo(map)
    let labels: { waar: [number, number]; tekst: string }[] = []
    let verzoek = 0

    // Labels zonder overlap: een label dat te dicht bij een vorig label staat, valt weg
    function plaatsLabels() {
      labelLaag.clearLayers()
      // Het label "Uw adres" staat boven de adresstip
      const geplaatst: L.Point[] = [map.latLngToContainerPoint([lat, lng]).subtract([0, 22])]
      for (const label of labels) {
        const p = map.latLngToContainerPoint(label.waar)
        if (geplaatst.some((q) => Math.abs(q.x - p.x) < 96 && Math.abs(q.y - p.y) < 28)) continue
        geplaatst.push(p)
        L.tooltip({ permanent: true, direction: 'center', className: 'dakvlak-label', interactive: false })
          .setLatLng(label.waar)
          .setContent(label.tekst)
          .addTo(labelLaag)
      }
    }
    map.on('zoomend', plaatsLabels)

    async function zoekOp(punt: [number, number]) {
      const dit = ++verzoek
      lagen.clearLayers()
      labels = []
      labelLaag.clearLayers()
      setFase('zoeken')
      setSelectie(null)

      const kring = L.circleMarker(punt, { radius: 10, color: '#ffffff', weight: 2, dashArray: '4 4', fill: false }).addTo(lagen)

      let data: PerceelSelectie | null = null
      try {
        const res = await fetch(`/api/dakmeting?click_lat=${punt[0]}&click_lng=${punt[1]}`)
        if (res.ok) data = await res.json()
      } catch { /* hieronder afgehandeld */ }
      if (dit !== verzoek) return
      lagen.removeLayer(kring)

      if (!data || data.error || data.gebouwen.length === 0) {
        setFase('leeg')
        return
      }

      const hoofdIndex = aangeduidGebouw(data.gebouwen, punt)
      // Standaard telt enkel het aangeduide gebouw mee; andere gebouwen op het perceel worden vermeld
      const gebouwen = data.gebouwen.map((g, i) => ({ ...g, aangeduid: i === hoofdIndex, meetellen: i === hoofdIndex }))
      let huidig: PerceelSelectie = { ...data, gebouwen }

      // Perceel: dunne witte stippellijn; gebouwen: witte omtrek
      if (data.perceelGrenzen && data.perceelGrenzen.length > 2) {
        L.polygon(data.perceelGrenzen, { color: '#ffffff', weight: 1.5, opacity: 0.8, dashArray: '6 5', fill: false, interactive: false }).addTo(lagen)
      }
      const omtrekken = gebouwen.map((g) =>
        g.grenzen.length > 2
          ? L.polygon(g.grenzen, {
              color: '#ffffff',
              weight: g.meetellen ? 3 : 1.5,
              opacity: g.meetellen ? 1 : 0.75,
              fillColor: '#ffffff',
              fillOpacity: g.meetellen ? 0.15 : 0.08,
              interactive: false,
            }).addTo(lagen)
          : null,
      )
      const hoofd = gebouwen[hoofdIndex]
      if (hoofd && hoofd.grenzen.length > 2) {
        map.flyToBounds(L.latLngBounds(hoofd.grenzen).pad(0.15), { maxZoom: 21, duration: 0.6 })
      }

      setSelectie(huidig)
      setFase('meten')
      callbackRef.current(huidig)

      // Dakscan per gebouw (laserhoogtemeting)
      const scans = await Promise.all(
        gebouwen.map(async (g): Promise<Dakscan | null> => {
          if (!g.id) return null
          try {
            const res = await fetch(`/api/dakscan?gebouw=${g.id}`)
            return res.ok ? await res.json() : null
          } catch {
            return null
          }
        }),
      )
      if (dit !== verzoek) return

      scans.forEach((scan, i) => {
        if (!gebouwen[i].meetellen || !scan?.meetbaar || !scan.raster) return
        const beeld = tekenScan(scan)
        if (beeld) {
          L.imageOverlay(beeld, [[scan.raster.zuid, scan.raster.west], [scan.raster.noord, scan.raster.oost]], {
            className: 'dakscan-laag',
            interactive: false,
          }).addTo(lagen)
        }
        omtrekken[i]?.setStyle({ fillOpacity: 0 })
        omtrekken[i]?.bringToFront()

        // Labels op de grootste vlakken van het aangeduide gebouw
        if (!gebouwen[i].aangeduid) return
        labels = scan.vlakken
          .filter((v) => v.grondOppervlak >= 8)
          .slice(0, 3)
          .map((v) => ({ waar: v.midden, tekst: v.richting ? `${KORT[v.richting]} · ${v.helling}°` : 'Plat' }))
      })
      plaatsLabels()

      huidig = {
        ...huidig,
        gebouwen: gebouwen.map((g, i) => {
          const scan = scans[i]
          return scan?.meetbaar && scan.dakOppervlak ? { ...g, dakOppervlak: scan.dakOppervlak, scan } : { ...g, scan }
        }),
      }
      setSelectie(huidig)
      setFase('klaar')
      callbackRef.current(huidig)
    }

    map.on('click', (e: L.LeafletMouseEvent) => void zoekOp([e.latlng.lat, e.latlng.lng]))
    void zoekOp([lat, lng])

    return () => {
      verzoek++
      map.remove()
      mapInstance.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const gebouwen = selectie?.gebouwen ?? []
  const hoofd = hoofdGebouw(gebouwen)
  const scan = hoofd?.scan?.meetbaar ? hoofd.scan : null
  const toonLegende = fase === 'klaar' && gebouwen.some((g) => g.scan?.meetbaar)

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="relative">
        <div ref={mapRef} className="h-[300px] w-full sm:h-[360px]" />

        {toonLegende && (
          <div className="pointer-events-none absolute right-2 top-2 z-[500] flex items-center gap-3 rounded-md bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-navy shadow-sm">
            <span className="flex items-center gap-1.5">
              Noord
              <span
                className="h-2 w-12 rounded-full"
                style={{ background: `linear-gradient(90deg, ${rgb(NOORD)}, ${rgb(MIDDEN)}, ${rgb(ZUID)})` }}
                aria-hidden
              />
              Zuid
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm border border-slate-300 bg-white" aria-hidden />
              Plat
            </span>
          </div>
        )}
      </div>

      {fase === 'leeg' ? (
        <p role="status" className="border-t border-slate-200 px-4 py-4 text-sm text-slate-700 sm:px-5">
          Op deze plek vonden we geen gebouw. Tik op de kaart op het dak van uw woning.
        </p>
      ) : fase !== 'klaar' ? (
        <ul role="status" aria-live="polite" className="space-y-2.5 border-t border-slate-200 px-4 py-4 text-sm sm:px-5">
          <Stap klaar={luchtfoto} tekst={luchtfoto ? 'Luchtfoto van uw buurt' : 'Luchtfoto ophalen'} />
          <Stap
            klaar={fase === 'meten'}
            tekst={fase === 'meten' ? 'Gebouw gevonden op uw perceel' : 'Uw gebouw zoeken'}
          />
          <Stap klaar={false} wacht={fase === 'zoeken'} tekst="Dak meten met de laserhoogtemeting" />
        </ul>
      ) : (
        <Meetstaat gebouwen={gebouwen} hoofd={hoofd} scan={scan} />
      )}

      <style jsx global>{`
        .dakkaart-adres {
          background: #0f172a;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 600;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.35);
        }
        .dakkaart-adres::before { border-top-color: #0f172a; }
        .dakvlak-label {
          background: rgba(15, 23, 42, 0.88);
          color: #ffffff;
          border: none;
          border-radius: 999px;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.3);
        }
        .dakvlak-label::before { display: none; }
        /* Eén moment: de gemeten vlakken schuiven van boven naar onder in beeld */
        @media (prefers-reduced-motion: no-preference) {
          .dakscan-laag { animation: dakscan-in 900ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        }
        @keyframes dakscan-in {
          from { clip-path: inset(0 0 100% 0); }
          to { clip-path: inset(0 0 0 0); }
        }
      `}</style>
    </div>
  )
}

function Stap({ klaar, wacht = false, tekst }: { klaar: boolean; wacht?: boolean; tekst: string }) {
  return (
    <li className={`flex items-center gap-2.5 ${wacht ? 'text-slate-500' : 'text-navy'}`}>
      {klaar ? (
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-navy text-white">
          <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
        </span>
      ) : (
        <LoaderCircle className={`h-5 w-5 flex-shrink-0 ${wacht ? '' : 'animate-spin'}`} aria-hidden />
      )}
      <span className={klaar ? 'font-semibold' : ''}>{tekst}</span>
    </li>
  )
}

function Meetstaat({ gebouwen, hoofd, scan }: { gebouwen: GebouwInfo[]; hoofd: GebouwInfo | null; scan: Dakscan | null }) {
  const opp = (g: GebouwInfo) => g.dakOppervlak ?? g.oppervlakte ?? 0
  const mee = gebouwen.filter((g) => g.meetellen !== false)
  const totaal = mee.reduce((s, g) => s + opp(g), 0)
  const anderen = gebouwen.filter((g) => g.meetellen === false)
  const totaalAnderen = anderen.reduce((s, g) => s + opp(g), 0)

  const samenvatting = scan
    ? [
        scan.dakvorm && scan.dakvorm.charAt(0).toUpperCase() + scan.dakvorm.slice(1),
        scan.helling !== null && `helling\u00a0±${scan.helling}°`,
        scan.nokhoogte !== null && `nokhoogte ${getal(scan.nokhoogte, 1)}\u00a0m`,
      ].filter(Boolean).join(' · ')
    : null

  // Vlakken met dezelfde richting (bv. twee platte delen) als één rij; de kaart toont ze apart
  const perRichting = new Map<string, Dakvlak[]>()
  for (const v of scan?.vlakken.filter((v) => v.grondOppervlak >= 3) ?? []) {
    const sleutel = v.richting ?? 'plat'
    perRichting.set(sleutel, [...(perRichting.get(sleutel) ?? []), v])
  }
  const rijen = [...perRichting.values()]
    .map((groep) => {
      const opp = groep.reduce((s, v) => s + v.dakOppervlak, 0)
      const helling = Math.round(groep.reduce((s, v) => s + v.helling * v.dakOppervlak, 0) / (opp || 1))
      return { ...groep[0], dakOppervlak: opp, helling, delen: groep }
    })
    .sort((a, b) => b.dakOppervlak - a.dakOppervlak)
  const getoond = rijen.slice(0, 4)
  const getoondeDelen = getoond.flatMap((r) => r.delen)
  const rest = scan ? scan.vlakken.filter((v) => !getoondeDelen.includes(v)) : []
  const restOpp = rest.reduce((s, v) => s + v.dakOppervlak, 0)
  const scanMislukt = !scan && hoofd?.scan === null

  return (
    <div className="border-t border-slate-200 px-4 py-4 sm:px-5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-semibold text-slate-600">
          {mee.length > 1 ? `Dakoppervlakte, ${mee.length} gebouwen` : 'Dakoppervlakte'}
        </p>
        <p className="text-3xl font-black tabular-nums tracking-tight text-navy">±{getal(totaal)}{'\u00a0'}m²</p>
      </div>
      {samenvatting && <p className="mt-1 text-sm text-slate-700">{samenvatting}</p>}

      {getoond.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 border-y border-slate-100">
          {getoond.map((v) => (
            <li key={v.richting ?? 'plat'} className="flex items-center gap-3 py-2 text-sm">
              <span
                className="h-3.5 w-3.5 flex-shrink-0 rounded-sm border border-slate-300"
                style={{ background: rgb(vlakKleur(v)) }}
                aria-hidden
              />
              <span className="flex-1 font-semibold text-navy">{v.richting ? KORT[v.richting] : 'Plat'}</span>
              <span className="w-10 text-right tabular-nums text-slate-600">{v.richting ? `${v.helling}°` : ''}</span>
              <span className="w-16 text-right font-semibold tabular-nums text-navy">{getal(v.dakOppervlak)}{'\u00a0'}m²</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 space-y-1 text-xs leading-relaxed text-slate-600">
        {rest.length > 0 && restOpp > 0 && (
          <p>
            Plus {rest.length === 1 ? 'een klein dakdeel' : `${rest.length} kleine dakdelen`} ({getal(restOpp)} m²), bijvoorbeeld een dakkapel of goot.
          </p>
        )}
        {anderen.length > 0 && (
          <p>
            Op uw perceel {anderen.length === 1 ? 'staat nog een gebouw' : `staan nog ${anderen.length} gebouwen`} ({getal(totaalAnderen)} m² dak).
            {anderen.length === 1 ? ' Dat telt' : ' Die tellen'} nu niet mee.
          </p>
        )}
        {scan ? (
          <p>Gemeten met de laserhoogtemeting van de Vlaamse overheid (2013–2015). Sindsdien verbouwd? Dan kan het afwijken.</p>
        ) : scanMislukt ? (
          <p>De laserhoogtemeting is nu niet bereikbaar. De oppervlakte is geschat uit het grondvlak.</p>
        ) : (
          <p>
            Voor dit gebouw is er geen laserhoogtemeting, vermoedelijk omdat het na 2015 gebouwd of verbouwd werd.
            De oppervlakte is geschat uit het grondvlak.
          </p>
        )}
      </div>
    </div>
  )
}
