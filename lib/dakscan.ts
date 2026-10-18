/**
 * Dakscan: echte dakvlakken uit het Digitaal Hoogtemodel Vlaanderen II (laserhoogtemeting, 1 m).
 *
 * Per gebouw uit het Gebouwenregister:
 *   1. gebouwomtrek (Lambert72) ophalen,
 *   2. oppervlaktemodel (DSM) en terreinmodel (DTM) ophalen → hoogte boven maaiveld,
 *   3. verfijnen naar een raster van 25 cm en per cel helling en richting berekenen,
 *   4. cellen groeperen tot dakvlakken (zelfde richting, aaneengesloten),
 *   5. per vlak: helling, richting, grondoppervlak en werkelijke dakoppervlakte.
 *
 * De metingen dateren van 2013–2015. Een gebouw dat er toen nog niet stond,
 * heeft geen hoogte in het model: dan is `meetbaar` false en valt de funnel terug op de schatting.
 */

import { fromArrayBuffer } from 'geotiff'
import { extractCoordsFromGml, naarWgs84, shoelace } from '@/lib/lambert'
import { zoekErfgoed, type Erfgoed } from '@/lib/erfgoed'

const WCS = 'https://geo.api.vlaanderen.be/DHMV/wcs'
const BASISREG = 'https://api.basisregisters.vlaanderen.be/v2'

export const DAKSCAN_BRON = 'Digitaal Hoogtemodel Vlaanderen II, opgemeten 2013–2015'

export type Windrichting =
  | 'noord' | 'noordoost' | 'oost' | 'zuidoost' | 'zuid' | 'zuidwest' | 'west' | 'noordwest'

const WINDRICHTINGEN: Windrichting[] = ['noord', 'noordoost', 'oost', 'zuidoost', 'zuid', 'zuidwest', 'west', 'noordwest']

export type Dakvlak = {
  nr: number                   // index in raster.cellen (0-9, a-z)
  richting: Windrichting | null // waar het vlak naartoe afloopt; null = plat
  helling: number              // graden
  grondOppervlak: number       // m², bovenaanzicht
  dakOppervlak: number         // m², gecorrigeerd voor de helling
  zon: number                  // 0 (noord) … 1 (zuid); plat = 0.7
  midden: [number, number]     // [lat, lng] voor het label op de kaart
}

export type Dakscan = {
  gebouwId: string
  meetbaar: boolean
  grondOppervlak: number       // m², uit de gebouwomtrek
  dakOppervlak: number | null  // m², som van de dakvlakken (null als niet meetbaar)
  dakvorm: string | null
  helling: number | null       // hoofdhelling in graden (null bij plat dak)
  nokhoogte: number | null     // m boven maaiveld
  vlakken: Dakvlak[]
  raster: {
    noord: number; zuid: number; west: number; oost: number  // WGS84-grenzen van het beeld
    lambert: [number, number, number, number]                 // x0, y0, x1, y1 (Lambert72) — exact, voor het rapport
    breedte: number; hoogte: number
    cellen: string             // rij per rij van noord naar zuid; '.' = buiten het gebouw
  } | null
  bron: string
  erfgoed: Erfgoed[]           // beschermd monument, stadsgezicht, … (Onroerend Erfgoed)
}

type Raster = { data: Float32Array; breedte: number; hoogte: number; x0: number; y0: number }

const CODES = '0123456789abcdefghijklmnopqrstuvwxyz'
const PLAT_ONDER = 10        // graden: vlakker telt als plat dak
const MAX_HELLING = 65       // steiler = muur, geen dakvlak
const RAND_M = 1.2           // binnen deze afstand van de gevel vervaagt de meting (1 m-raster)
const RAND_HELLING = 55      // steile cellen aan de rand zijn de val naar de grond, geen dakvlak
const MIN_VLAK_M2 = 1.5      // kleinere stukjes worden bij de buur gevoegd

// ─── Ophalen ────────────────────────────────────────────────────────

export async function gebouwOmtrek(id: string): Promise<[number, number][] | null> {
  const res = await fetch(`${BASISREG}/gebouwen/${id}`, { next: { revalidate: 86400 } })
  if (!res.ok) return null
  const gebouw = await res.json()
  return extractCoordsFromGml(gebouw.gebouwPolygoon?.geometrie?.gml ?? '')
}

async function leesHoogte(coverage: string, x0: number, y0: number, x1: number, y1: number): Promise<Raster | null> {
  const url = `${WCS}?SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID=${coverage}` +
    `&FORMAT=image/tiff&SUBSET=x(${x0},${x1})&SUBSET=y(${y0},${y1})`
  const res = await fetch(url, { next: { revalidate: 2592000 } })
  if (!res.ok) return null
  const bytes = new Uint8Array(await res.arrayBuffer())
  // Het antwoord is multipart (GML + GeoTIFF): zoek het begin van de TIFF
  let start = -1
  for (let i = 0; i < bytes.length - 3; i++) {
    if ((bytes[i] === 0x49 && bytes[i + 1] === 0x49 && bytes[i + 2] === 0x2a && bytes[i + 3] === 0) ||
        (bytes[i] === 0x4d && bytes[i + 1] === 0x4d && bytes[i + 2] === 0 && bytes[i + 3] === 0x2a)) { start = i; break }
  }
  if (start < 0) return null
  const tiff = await fromArrayBuffer(bytes.slice(start).buffer)
  const beeld = await tiff.getImage()
  const [band] = await beeld.readRasters()
  const [ox, oy] = beeld.getOrigin()
  return {
    data: Float32Array.from(band as ArrayLike<number>),
    breedte: beeld.getWidth(),
    hoogte: beeld.getHeight(),
    x0: ox,
    y0: oy,
  }
}

// ─── Rekenhulp ──────────────────────────────────────────────────────

function binnenVeelhoek(x: number, y: number, ring: [number, number][]): boolean {
  let binnen = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) binnen = !binnen
  }
  return binnen
}

function afstandTotRand(x: number, y: number, ring: [number, number][]): number {
  let min = Infinity
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[j]
    const [bx, by] = ring[i]
    const dx = bx - ax, dy = by - ay
    const t = dx || dy ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))) : 0
    min = Math.min(min, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)))
  }
  return min
}

function hoekVerschil(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

function mediaan(waarden: number[]): number {
  if (waarden.length === 0) return 0
  const s = [...waarden].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function windrichting(graden: number): Windrichting {
  return WINDRICHTINGEN[Math.round(((graden % 360) + 360) % 360 / 45) % 8]
}

// 1 = pal zuid, 0.5 = oost of west, 0 = pal noord
function zonScore(richting: number | null): number {
  if (richting === null) return 0.7
  return (1 + Math.cos(((richting - 180) * Math.PI) / 180)) / 2
}

// ─── Scan ───────────────────────────────────────────────────────────

export async function scanGebouw(gebouwId: string): Promise<Dakscan | null> {
  const ring = await gebouwOmtrek(gebouwId)
  if (!ring) return null
  // Dakmeting en erfgoed tegelijk ophalen
  const [meting, erfgoed] = await Promise.all([
    meetDak(gebouwId, ring),
    zoekErfgoed(ring).catch(() => [] as Erfgoed[]),
  ])
  return { ...meting, erfgoed }
}

async function meetDak(gebouwId: string, ring: [number, number][]): Promise<Omit<Dakscan, 'erfgoed'>> {
  const grondOppervlak = Math.round(shoelace(ring))

  const leeg: Omit<Dakscan, 'erfgoed'> = {
    gebouwId, meetbaar: false, grondOppervlak, dakOppervlak: null, dakvorm: null,
    helling: null, nokhoogte: null, vlakken: [], raster: null, bron: DAKSCAN_BRON,
  }

  const xs = ring.map(([x]) => x)
  const ys = ring.map(([, y]) => y)
  const bx0 = Math.floor(Math.min(...xs)) - 2
  const by0 = Math.floor(Math.min(...ys)) - 2
  const bx1 = Math.ceil(Math.max(...xs)) + 2
  const by1 = Math.ceil(Math.max(...ys)) + 2
  const zijde = Math.max(bx1 - bx0, by1 - by0)
  if (zijde > 400) return leeg // te groot om zinvol te tonen

  const [dsm, dtm] = await Promise.all([
    leesHoogte('DHMVII_DSM_1m', bx0, by0, bx1, by1),
    leesHoogte('DHMVII_DTM_1m', bx0, by0, bx1, by1),
  ])
  if (!dsm || !dtm || dsm.breedte !== dtm.breedte || dsm.hoogte !== dtm.hoogte) return leeg

  // Hoogte boven maaiveld op het 1 m-raster
  const W = dsm.breedte
  const H = dsm.hoogte
  const boven = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) {
    const s = dsm.data[i]
    const t = dtm.data[i]
    const geldigS = s > -100 && s < 1000
    const geldigT = t > -100 && t < 1000
    boven[i] = geldigS && geldigT ? s - t : 0
  }

  // Verfijnen: hoe kleiner het gebouw, hoe fijner (max. ±240 cellen per zijde)
  const f = zijde <= 60 ? 4 : zijde <= 120 ? 2 : 1
  const c = 1 / f
  const BW = W * f
  const BH = H * f
  const z = new Float32Array(BW * BH)
  for (let r = 0; r < BH; r++) {
    const v = Math.min(Math.max((r + 0.5) * c - 0.5, 0), H - 1)
    const r0 = Math.min(Math.floor(v), H - 2)
    const tv = v - r0
    for (let k = 0; k < BW; k++) {
      const u = Math.min(Math.max((k + 0.5) * c - 0.5, 0), W - 1)
      const k0 = Math.min(Math.floor(u), W - 2)
      const tu = u - k0
      const a = boven[r0 * W + k0]
      const b = boven[r0 * W + k0 + 1]
      const d = boven[(r0 + 1) * W + k0]
      const e = boven[(r0 + 1) * W + k0 + 1]
      z[r * BW + k] = (a * (1 - tu) + b * tu) * (1 - tv) + (d * (1 - tu) + e * tu) * tv
    }
  }

  // Binnen het gebouw? (celmiddens) En ligt de cel tegen de gevel?
  const binnen = new Uint8Array(BW * BH)
  const aanRand = new Uint8Array(BW * BH)
  let aantalBinnen = 0
  for (let r = 0; r < BH; r++) {
    const y = dsm.y0 - (r + 0.5) * c
    for (let k = 0; k < BW; k++) {
      const x = dsm.x0 + (k + 0.5) * c
      if (!binnenVeelhoek(x, y, ring)) continue
      binnen[r * BW + k] = 1
      aantalBinnen++
      if (afstandTotRand(x, y, ring) < RAND_M) aanRand[r * BW + k] = 1
    }
  }
  if (aantalBinnen < 16) return leeg

  // Staat het gebouw in de meting? (anders: gebouwd of verbouwd na 2015)
  let hoog = 0
  for (let i = 0; i < BW * BH; i++) if (binnen[i] && z[i] > 2) hoog++
  if (hoog / aantalBinnen < 0.6) return leeg

  // Helling en richting per cel (richting = waar het vlak naartoe afloopt, 0 = noord)
  const helling = new Float32Array(BW * BH)
  const richting = new Float32Array(BW * BH)
  for (let r = 0; r < BH; r++) {
    for (let k = 0; k < BW; k++) {
      const i = r * BW + k
      if (!binnen[i]) continue
      const kl = Math.max(k - 1, 0), kr = Math.min(k + 1, BW - 1)
      const rn = Math.max(r - 1, 0), rz = Math.min(r + 1, BH - 1)
      const dzdx = (z[r * BW + kr] - z[r * BW + kl]) / ((kr - kl) * c)
      const dzdn = (z[rn * BW + k] - z[rz * BW + k]) / ((rz - rn) * c) // naar het noorden
      helling[i] = (Math.atan(Math.hypot(dzdx, dzdn)) * 180) / Math.PI
      richting[i] = ((Math.atan2(-dzdx, -dzdn) * 180) / Math.PI + 360) % 360
    }
  }

  // Onbetrouwbaar: geen dak (te laag), muur, of de val naar de grond aan de gevel
  const onzeker = (i: number) => z[i] < 1.5 || helling[i] > MAX_HELLING || (aanRand[i] === 1 && helling[i] > RAND_HELLING)

  // Hoofdrichtingen zoeken: histogram van de hellende cellen in stappen van 10° (zonder de randcellen)
  const histo = new Float64Array(36)
  let hellend = 0
  for (let i = 0; i < BW * BH; i++) {
    if (!binnen[i] || aanRand[i] || onzeker(i) || helling[i] < PLAT_ONDER) continue
    histo[Math.floor(richting[i] / 10) % 36]++
    hellend++
  }
  const glad = Array.from({ length: 36 }, (_, b) => histo[(b + 35) % 36] + 2 * histo[b] + histo[(b + 1) % 36])
  const drempel = Math.max(hellend * 0.06 * 4, 4 * f * f) // ±6% van de hellende cellen, minstens 4 m²
  const pieken: number[] = []
  for (let b = 0; b < 36; b++) {
    if (glad[b] >= drempel && glad[b] >= glad[(b + 35) % 36] && glad[b] > glad[(b + 1) % 36]) pieken.push(b)
  }
  pieken.sort((a, b) => glad[b] - glad[a])
  const richtingen: number[] = []
  for (const b of pieken) {
    const hoek = b * 10 + 5
    if (richtingen.every((r) => hoekVerschil(r, hoek) >= 35)) richtingen.push(hoek)
    if (richtingen.length === 8) break
  }

  // Label per cel: 0 = plat, 1..n = hoofdrichting, -1 = onzeker (rand, muur), -2 = buiten
  const label = new Int8Array(BW * BH).fill(-2)
  for (let i = 0; i < BW * BH; i++) {
    if (!binnen[i]) continue
    if (onzeker(i)) { label[i] = -1; continue }
    if (helling[i] < PLAT_ONDER || richtingen.length === 0) { label[i] = 0; continue }
    let beste = -1, afstand = 999
    for (let n = 0; n < richtingen.length; n++) {
      const d = hoekVerschil(richting[i], richtingen[n])
      if (d < afstand) { afstand = d; beste = n }
    }
    label[i] = afstand <= 70 ? beste + 1 : -1
  }

  // Meerderheidsfilter (venster ±1 m) tegen ruis en om onzekere cellen in te vullen
  const L = richtingen.length + 1
  const straal = Math.max(1, Math.round(1 / c))
  for (let ronde = 0; ronde < 2; ronde++) {
    const sat = Array.from({ length: L }, () => new Int32Array((BW + 1) * (BH + 1)))
    for (let n = 0; n < L; n++) {
      const s = sat[n]
      for (let r = 0; r < BH; r++) {
        let rij = 0
        for (let k = 0; k < BW; k++) {
          rij += label[r * BW + k] === n ? 1 : 0
          s[(r + 1) * (BW + 1) + k + 1] = s[r * (BW + 1) + k + 1] + rij
        }
      }
    }
    const nieuw = Int8Array.from(label)
    for (let r = 0; r < BH; r++) {
      const ra = Math.max(r - straal, 0), rb = Math.min(r + straal + 1, BH)
      for (let k = 0; k < BW; k++) {
        const i = r * BW + k
        if (!binnen[i]) continue
        const ka = Math.max(k - straal, 0), kb = Math.min(k + straal + 1, BW)
        let beste = label[i], meest = -1
        for (let n = 0; n < L; n++) {
          const s = sat[n]
          const tel = s[rb * (BW + 1) + kb] - s[ra * (BW + 1) + kb] - s[rb * (BW + 1) + ka] + s[ra * (BW + 1) + ka]
          if (tel > meest) { meest = tel; beste = n }
        }
        if (meest > 0) nieuw[i] = beste
      }
    }
    label.set(nieuw)
  }
  for (let i = 0; i < BW * BH; i++) if (binnen[i] && label[i] < 0) label[i] = 0

  // Aaneengesloten stukken = dakvlakken; te kleine stukken gaan naar de grootste buur
  const vlakVan = new Int32Array(BW * BH).fill(-1)
  type Stuk = { label: number; cellen: number[] }
  let stukken: Stuk[] = []
  const zoekStukken = () => {
    vlakVan.fill(-1)
    stukken = []
    for (let i = 0; i < BW * BH; i++) {
      if (!binnen[i] || vlakVan[i] >= 0) continue
      const id = stukken.length
      const stuk: Stuk = { label: label[i], cellen: [] }
      const stapel = [i]
      vlakVan[i] = id
      while (stapel.length) {
        const j = stapel.pop()!
        stuk.cellen.push(j)
        const r = (j / BW) | 0, k = j % BW
        const buren = [r > 0 ? j - BW : -1, r < BH - 1 ? j + BW : -1, k > 0 ? j - 1 : -1, k < BW - 1 ? j + 1 : -1]
        for (const b of buren) {
          if (b >= 0 && binnen[b] && vlakVan[b] < 0 && label[b] === stuk.label) { vlakVan[b] = id; stapel.push(b) }
        }
      }
      stukken.push(stuk)
    }
  }
  const minCellen = Math.ceil(MIN_VLAK_M2 / (c * c))
  for (let ronde = 0; ronde < 4; ronde++) {
    zoekStukken()
    let gewijzigd = false
    for (const stuk of stukken) {
      if (stuk.cellen.length >= minCellen) continue
      const telBuur = new Map<number, number>()
      for (const j of stuk.cellen) {
        const r = (j / BW) | 0, k = j % BW
        for (const b of [r > 0 ? j - BW : -1, r < BH - 1 ? j + BW : -1, k > 0 ? j - 1 : -1, k < BW - 1 ? j + 1 : -1]) {
          if (b >= 0 && binnen[b] && label[b] !== stuk.label) telBuur.set(label[b], (telBuur.get(label[b]) ?? 0) + 1)
        }
      }
      let beste = -1, meest = 0
      telBuur.forEach((n, l) => { if (n > meest) { meest = n; beste = l } })
      if (beste >= 0) { for (const j of stuk.cellen) label[j] = beste; gewijzigd = true }
    }
    if (!gewijzigd) break
  }
  zoekStukken()
  // Grootste eerst; maximaal 36 vlakken (één teken per vlak in het raster)
  const opVolgorde = [...stukken].sort((a, b) => b.cellen.length - a.cellen.length).slice(0, CODES.length)
  const nrVan = new Map<Stuk, number>(opVolgorde.map((s, nr) => [s, nr]))

  const celOpp = c * c
  const vlakken: Dakvlak[] = opVolgorde.map((stuk, nr) => {
    const zeker = stuk.cellen.filter((j) => !onzeker(j))
    const hellingen = (zeker.length ? zeker : stuk.cellen).map((j) => Math.min(helling[j], MAX_HELLING))
    const plat = stuk.label === 0
    const hoek = plat ? Math.min(mediaan(hellingen), PLAT_ONDER - 1) : mediaan(hellingen)
    let sx = 0, sy = 0, mx = 0, my = 0
    for (const j of stuk.cellen) {
      const a = (richting[j] * Math.PI) / 180
      sx += Math.sin(a); sy += Math.cos(a)
      mx += (j % BW) + 0.5; my += ((j / BW) | 0) + 0.5
    }
    const gem = ((Math.atan2(sx, sy) * 180) / Math.PI + 360) % 360
    const grond = stuk.cellen.length * celOpp
    return {
      nr,
      richting: plat ? null : windrichting(gem),
      helling: Math.round(hoek),
      grondOppervlak: Math.round(grond),
      dakOppervlak: Math.round(plat ? grond : grond / Math.cos((hoek * Math.PI) / 180)),
      zon: Math.round(zonScore(plat ? null : gem) * 100) / 100,
      midden: naarWgs84([dsm.x0 + (mx / stuk.cellen.length) * c, dsm.y0 - (my / stuk.cellen.length) * c]),
    }
  })

  // Totaal: verhouding dak/grond uit de vlakken, toegepast op de exacte omtrek
  const somGrond = vlakken.reduce((s, v) => s + v.grondOppervlak, 0)
  const somDak = vlakken.reduce((s, v) => s + v.dakOppervlak, 0)
  const dakOppervlak = somGrond > 0 ? Math.round(grondOppervlak * (somDak / somGrond)) : null

  // Dakvorm uit de vlakken van minstens 8% van het dak
  const grote = vlakken.filter((v) => v.grondOppervlak >= somGrond * 0.08)
  const platAandeel = vlakken.filter((v) => v.richting === null).reduce((s, v) => s + v.grondOppervlak, 0) / (somGrond || 1)
  const schuin = grote.filter((v) => v.richting !== null)
  const tegenover = (a: Dakvlak, b: Dakvlak) =>
    hoekVerschil(WINDRICHTINGEN.indexOf(a.richting!) * 45, WINDRICHTINGEN.indexOf(b.richting!) * 45) >= 135
  let dakvorm = 'samengesteld dak'
  if (platAandeel >= 0.75) dakvorm = 'plat dak'
  else if (platAandeel < 0.3 && schuin.length === 1) dakvorm = 'lessenaarsdak'
  else if (platAandeel < 0.3 && schuin.length === 2 && tegenover(schuin[0], schuin[1])) dakvorm = 'zadeldak'
  else if (platAandeel < 0.3 && schuin.length === 4) {
    const [a, b, d, e] = schuin
    const paren = [[a, b, d, e], [a, d, b, e], [a, e, b, d]]
    if (paren.some(([p, q, r, s]) => tegenover(p, q) && tegenover(r, s))) dakvorm = 'schilddak'
  } else if (platAandeel >= 0.3) dakvorm = 'deels plat, deels hellend'

  const hoofdHelling = schuin.length && dakvorm !== 'plat dak'
    ? Math.round(mediaan(schuin.flatMap((v) => Array(Math.max(1, Math.round(v.grondOppervlak))).fill(v.helling))))
    : null

  // Nokhoogte: 99e percentiel van de hoogte boven maaiveld binnen het gebouw
  const hoogtes: number[] = []
  for (let i = 0; i < BW * BH; i++) if (binnen[i]) hoogtes.push(z[i])
  hoogtes.sort((a, b) => a - b)
  const nokhoogte = Math.round(hoogtes[Math.min(hoogtes.length - 1, Math.floor(hoogtes.length * 0.99))] * 10) / 10

  // Raster voor de kaart (gekleurd in de browser)
  let cellen = ''
  for (let i = 0; i < BW * BH; i++) {
    const nr = binnen[i] && vlakVan[i] >= 0 ? nrVan.get(stukken[vlakVan[i]]) : undefined
    cellen += nr === undefined ? '.' : CODES[nr]
  }

  const hoeken = [
    naarWgs84([dsm.x0, dsm.y0]), naarWgs84([dsm.x0 + W, dsm.y0]),
    naarWgs84([dsm.x0, dsm.y0 - H]), naarWgs84([dsm.x0 + W, dsm.y0 - H]),
  ]
  return {
    gebouwId,
    meetbaar: true,
    grondOppervlak,
    dakOppervlak,
    dakvorm,
    helling: hoofdHelling,
    nokhoogte,
    vlakken,
    raster: {
      noord: Math.max(...hoeken.map(([lat]) => lat)),
      zuid: Math.min(...hoeken.map(([lat]) => lat)),
      west: Math.min(...hoeken.map(([, lng]) => lng)),
      oost: Math.max(...hoeken.map(([, lng]) => lng)),
      lambert: [dsm.x0, dsm.y0 - H, dsm.x0 + W, dsm.y0],
      breedte: BW,
      hoogte: BH,
      cellen,
    },
    bron: DAKSCAN_BRON,
  }
}
