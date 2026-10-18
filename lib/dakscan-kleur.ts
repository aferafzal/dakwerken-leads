// Kleuren en tekening van de dakscan (kaart in de funnel en beeld in het rapport).
// tekenScan gebruikt een canvas en werkt dus enkel in de browser.

import type { Dakscan, Dakvlak } from '@/lib/dakscan'

export const CODES = '0123456789abcdefghijklmnopqrstuvwxyz'

// Kleur volgens de zon: noord grijsblauw → oost/west licht oranje → zuid oranje. Plat: wit.
export const NOORD: [number, number, number] = [148, 163, 184]
export const MIDDEN: [number, number, number] = [254, 215, 170]
export const ZUID: [number, number, number] = [249, 115, 22]
export const PLAT: [number, number, number] = [255, 255, 255]

function meng(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as [number, number, number]
}

export function vlakKleur(v: Dakvlak): [number, number, number] {
  if (v.richting === null) return PLAT
  return v.zon >= 0.5 ? meng(MIDDEN, ZUID, (v.zon - 0.5) / 0.5) : meng(NOORD, MIDDEN, v.zon / 0.5)
}

export const rgb = ([r, g, b]: [number, number, number], a = 1) => `rgba(${r}, ${g}, ${b}, ${a})`

// Gekleurde dakvlakken als beeld, met witte lijnen waar twee vlakken elkaar raken (nok, kil, knik).
// Het raster (25 cm) wordt bilineair verfijnd, zodat grenzen vloeiend lopen in plaats van in trapjes.
export function tekenScan(scan: Dakscan): string | null {
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

