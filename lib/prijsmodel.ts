/**
 * Prijsmodel: van dakscan + antwoorden naar een prijsvork per soort werk.
 *
 * De nauwkeurigheid is letterlijk de breedte van de prijsvork: (max − min) / (max + min).
 * Elk antwoord vervangt een brede marktprijs door de smallere prijs die bij dat antwoord hoort,
 * of haalt een onzekere post weg. Nauwkeuriger dan ±10% tonen we nooit: dat kan pas na een plaatsbezoek.
 *
 * PRIJSTABEL: voorstel op basis van publieke Belgische richtprijzen (2026), na te kijken door Afer.
 */

export type Werk = 'dakbedekking' | 'isolatie' | 'plat_dak' | 'goten' | 'lekkage' | 'advies'
export type Materiaal = 'betonpannen' | 'keramische_pannen' | 'natuurleien' | 'kunstleien' | 'golfplaten' | 'epdm' | 'roofing' | 'zink' | 'weet_niet'
export type Bouwjaar = 'voor_1980' | '1980_2000' | '2000_2015' | 'na_2015' | 'onbekend'
export type Isolatie = 'geen' | 'beetje' | 'goed' | 'weet_niet'
export type Zolder = 'bewoond' | 'niet_bewoond' | 'weet_niet'
export type Woningtype = 'vrijstaand' | 'halfopen' | 'rij' | 'weet_niet'
export type Goot = 'zink' | 'pvc' | 'bakgoot' | 'weet_niet'
export type Start = 'zo_snel_mogelijk' | 'binnen_3_maanden' | 'dit_jaar' | 'orienterend'

export type Antwoorden = {
  werken?: Werk[]
  materiaal?: Materiaal
  bouwjaar?: Bouwjaar
  isolatie?: Isolatie
  zolder?: Zolder
  dakramen?: number | null       // null = weet niet
  dakkapellen?: number | null
  schoorstenen?: number | null
  zonnepanelen?: number | null
  woningtype?: Woningtype
  goot?: Goot
  start?: Start
}

export type DakMaten = {
  hellend: number              // m² hellend dak
  plat: number                 // m² plat dak
  nokhoogte: number | null     // m
  gootlengte: number | null    // m
}

type Vork = [number, number]

// ─── Prijstabel (voorstel, excl. btw, incl. plaatsing) ───────────────────────
export const PRIJSTABEL = {
  btwInbegrepen: false,
  // Hellend dak, per m² dak: afbraak oude bedekking, nieuw onderdak, latten en nieuwe bedekking
  dakbedekking: {
    betonpannen: [75, 105],
    keramische_pannen: [90, 130],
    natuurleien: [125, 180],
    kunstleien: [80, 115],
    golfplaten: [60, 100],
    weet_niet: [75, 135],
  } as Record<string, Vork>,
  // Plat dak, per m²: afbraak en nieuwe dakbedekking (isolatie apart)
  platDak: {
    epdm: [75, 115],
    roofing: [65, 100],
    zink: [140, 220],
    weet_niet: [65, 120],
  } as Record<string, Vork>,
  isolatie: {
    binnenOnbewoond: [40, 70] as Vork,    // zolder niet bewoond: langs binnen, zonder afwerking
    binnenBewoond: [70, 110] as Vork,     // zolder bewoond: langs binnen, incl. afwerking
    buiten: [55, 90] as Vork,             // langs buiten, samen met nieuwe dakbedekking (meerprijs)
    onbekend: [40, 110] as Vork,
    platDak: [35, 60] as Vork,            // isolatie plat dak, per m²
  },
  asbestPerM2: [15, 35] as Vork,          // verwijderen en afvoeren
  dakraam: [250, 450] as Vork,            // bestaand dakraam opnieuw aansluiten
  dakkapel: [600, 1500] as Vork,          // aansluiting van een bestaande dakkapel
  schoorsteen: [300, 700] as Vork,        // loodwerk en aansluiting
  zonnepaneel: [45, 85] as Vork,          // de- en hermonteren, per paneel
  steiger: {
    vrijstaand: [900, 1800],
    halfopen: [800, 1500],
    rij: [700, 1300],
    weet_niet: [700, 1800],
  } as Record<Woningtype, Vork>,
  steigerHoogToeslag: 1.3,                // nok hoger dan 10 m
  gootPerMeter: {
    zink: [65, 110],
    pvc: [30, 55],
    bakgoot: [120, 200],
    weet_niet: [30, 110],
  } as Record<Goot, Vork>,
  lekkage: [150, 450] as Vork,            // onderzoek ter plaatse
  // Als een antwoord ontbreekt, rekenen we met een gangbare bandbreedte
  onbekend: { dakramen: [0, 2] as Vork, dakkapellen: [0, 1] as Vork, schoorstenen: [0, 1] as Vork, zonnepanelen: [0, 8] as Vork },
  minNauwkeurigheid: 10,                  // ±%: nooit nauwkeuriger tonen
}

const ASBEST_MATERIAAL: Materiaal[] = ['kunstleien', 'golfplaten']
const PLAT_MATERIAAL: Materiaal[] = ['epdm', 'roofing', 'zink']

export type Post = { naam: string; min: number; max: number }

export type Prijsregel = {
  werk: Werk
  naam: string
  uitleg: string
  min: number
  max: number
  posten: Post[]
}

export type Prijsresultaat = {
  regels: Prijsregel[]
  min: number
  max: number
  nauwkeurigheid: number      // ±% (afgerond), nooit onder minNauwkeurigheid
  zekerheid: number           // 0–100 voor de meter (100 − ±%)
  btwInbegrepen: boolean
}

const NAAM: Record<Werk, string> = {
  dakbedekking: 'Dakbedekking vernieuwen',
  isolatie: 'Hellend dak isoleren',
  plat_dak: 'Plat dak vernieuwen',
  goten: 'Dakgoten vervangen',
  lekkage: 'Lekkage laten onderzoeken',
  advies: 'Persoonlijk advies',
}

const MATERIAAL_NAAM: Record<Materiaal, string> = {
  betonpannen: 'betonpannen', keramische_pannen: 'keramische pannen', natuurleien: 'natuurleien',
  kunstleien: 'kunstleien', golfplaten: 'golfplaten', epdm: 'EPDM', roofing: 'roofing', zink: 'zink', weet_niet: 'materiaal nog onbekend',
}

const maal = ([a, b]: Vork, f: number): Vork => [a * f, b * f]
const telVork = (n: number | null | undefined, onbekend: Vork): Vork => (n === null || n === undefined ? onbekend : [n, n])
const getal = (n: number) => Math.round(n).toLocaleString('nl-BE')

/** Welke werken we tonen: wat de bezoeker koos, anders wat bij het dak past */
export function gekozenWerken(maten: DakMaten, antwoorden: Antwoorden): Werk[] {
  if (antwoorden.werken && antwoorden.werken.length) return antwoorden.werken
  const w: Werk[] = []
  if (maten.hellend >= 5) w.push('dakbedekking', 'isolatie')
  if (maten.plat >= 5) w.push('plat_dak')
  return w
}

// Asbest kan enkel in kunstleien en golfplaten van vóór 2001. Zolang materiaal of bouwjaar onbekend is,
// rekenen we het als mogelijkheid mee: zo maakt elk antwoord de prijsvork smaller, nooit breder.
function asbestKans(a: Antwoorden): 0 | 'mogelijk' | 'waarschijnlijk' {
  const nieuw = a.bouwjaar === '2000_2015' || a.bouwjaar === 'na_2015'
  const oud = a.bouwjaar === 'voor_1980' || a.bouwjaar === '1980_2000'
  if (nieuw) return 0
  if (!a.materiaal || a.materiaal === 'weet_niet') return 'mogelijk'
  if (!ASBEST_MATERIAAL.includes(a.materiaal)) return 0
  return oud ? 'waarschijnlijk' : 'mogelijk'
}

/** Welke vragen tellen mee voor de gekozen werken (de andere slaan we over) */
export type Vraag = 'materiaal' | 'bouwjaar' | 'isolatie' | 'zolder' | 'aansluitingen' | 'zonnepanelen' | 'woningtype' | 'goot' | 'start'
export function vragenVoor(werken: Werk[]): Vraag[] {
  const v = new Set<Vraag>()
  if (werken.includes('dakbedekking') || werken.includes('plat_dak')) {
    v.add('materiaal'); v.add('bouwjaar'); v.add('aansluitingen'); v.add('zonnepanelen'); v.add('woningtype')
  }
  if (werken.includes('plat_dak')) v.add('isolatie')
  if (werken.includes('isolatie')) { v.add('isolatie'); if (!werken.includes('dakbedekking')) v.add('zolder'); v.add('bouwjaar') }
  if (werken.includes('goten')) v.add('goot')
  v.add('start')
  const volgorde: Vraag[] = ['materiaal', 'bouwjaar', 'isolatie', 'zolder', 'aansluitingen', 'zonnepanelen', 'woningtype', 'goot', 'start']
  return volgorde.filter((x) => v.has(x))
}

export function berekenPrijs(maten: DakMaten, a: Antwoorden = {}): Prijsresultaat {
  const T = PRIJSTABEL
  const werken = gekozenWerken(maten, a)
  const hellend = Math.round(maten.hellend)
  const plat = Math.round(maten.plat)
  const hoog = (maten.nokhoogte ?? 0) > 10

  // Gemeenschappelijke posten bij werk aan het dak (één keer, bij het eerste dakwerk)
  const steiger = maal(T.steiger[a.woningtype ?? 'weet_niet'], hoog ? T.steigerHoogToeslag : 1)
  const extra = (): Post[] => {
    const posten: Post[] = [{ naam: 'Steiger en veiligheid', min: steiger[0], max: steiger[1] }]
    const ramen = telVork(a.dakramen, T.onbekend.dakramen)
    const kapellen = telVork(a.dakkapellen, T.onbekend.dakkapellen)
    const schouwen = telVork(a.schoorstenen, T.onbekend.schoorstenen)
    const panelen = telVork(a.zonnepanelen, T.onbekend.zonnepanelen)
    if (ramen[1] > 0) posten.push({ naam: `Dakramen aansluiten${a.dakramen ? ` (${a.dakramen})` : ''}`, min: ramen[0] * T.dakraam[0], max: ramen[1] * T.dakraam[1] })
    if (kapellen[1] > 0) posten.push({ naam: `Dakkapel aansluiten${a.dakkapellen ? ` (${a.dakkapellen})` : ''}`, min: kapellen[0] * T.dakkapel[0], max: kapellen[1] * T.dakkapel[1] })
    if (schouwen[1] > 0) posten.push({ naam: `Schoorsteen aansluiten${a.schoorstenen ? ` (${a.schoorstenen})` : ''}`, min: schouwen[0] * T.schoorsteen[0], max: schouwen[1] * T.schoorsteen[1] })
    if (panelen[1] > 0) posten.push({ naam: `Zonnepanelen de- en hermonteren${a.zonnepanelen ? ` (${a.zonnepanelen})` : ''}`, min: panelen[0] * T.zonnepaneel[0], max: panelen[1] * T.zonnepaneel[1] })
    return posten
  }
  let extraGebruikt = false

  const regels: Prijsregel[] = []
  for (const werk of werken) {
    const posten: Post[] = []
    let uitleg = ''

    if (werk === 'dakbedekking' && hellend > 0) {
      const mat = a.materiaal && !PLAT_MATERIAAL.includes(a.materiaal) ? a.materiaal : 'weet_niet'
      const p = T.dakbedekking[mat]
      posten.push({ naam: `Nieuwe dakbedekking, ${getal(hellend)} m²`, min: hellend * p[0], max: hellend * p[1] })
      const kans = asbestKans(a)
      if (kans === 'waarschijnlijk') posten.push({ naam: 'Asbest verwijderen en afvoeren', min: hellend * T.asbestPerM2[0], max: hellend * T.asbestPerM2[1] })
      if (kans === 'mogelijk') posten.push({ naam: 'Mogelijk asbest verwijderen', min: 0, max: hellend * T.asbestPerM2[1] })
      uitleg = `${getal(hellend)} m² ${MATERIAAL_NAAM[mat]}, incl. afbraak, onderdak en latten`
    } else if (werk === 'isolatie' && hellend > 0) {
      if (a.isolatie === 'goed') {
        posten.push({ naam: 'Isolatie nakijken', min: 0, max: 0 })
        uitleg = 'Uw dak is al goed geïsoleerd'
      } else {
        const methode =
          werken.includes('dakbedekking') ? T.isolatie.buiten
          : a.zolder === 'bewoond' ? T.isolatie.binnenBewoond
          : a.zolder === 'niet_bewoond' ? T.isolatie.binnenOnbewoond
          : T.isolatie.onbekend
        posten.push({ naam: `Isolatie, ${getal(hellend)} m²`, min: hellend * methode[0], max: hellend * methode[1] })
        uitleg = werken.includes('dakbedekking')
          ? `${getal(hellend)} m² langs buiten, samen met de nieuwe dakbedekking`
          : `${getal(hellend)} m² ${a.zolder === 'bewoond' ? 'langs binnen, incl. afwerking' : a.zolder === 'niet_bewoond' ? 'langs binnen' : 'langs binnen of buiten'}`
      }
    } else if (werk === 'plat_dak' && plat > 0) {
      const mat = a.materiaal && PLAT_MATERIAAL.includes(a.materiaal) ? a.materiaal : 'weet_niet'
      const p = T.platDak[mat]
      posten.push({ naam: `Nieuwe dakbedekking plat dak, ${getal(plat)} m²`, min: plat * p[0], max: plat * p[1] })
      if (a.isolatie === 'geen' || a.isolatie === 'beetje') posten.push({ naam: 'Isolatie plat dak', min: plat * T.isolatie.platDak[0], max: plat * T.isolatie.platDak[1] })
      if (a.isolatie === undefined || a.isolatie === 'weet_niet') posten.push({ naam: 'Mogelijk isolatie plat dak', min: 0, max: plat * T.isolatie.platDak[1] })
      uitleg = `${getal(plat)} m² ${mat === 'weet_niet' ? 'EPDM of roofing' : MATERIAAL_NAAM[mat]}, incl. afbraak`
    } else if (werk === 'goten') {
      const lengte = maten.gootlengte ?? Math.max(8, Math.round(Math.sqrt(hellend + plat) * 1.6))
      const p = T.gootPerMeter[a.goot ?? 'weet_niet']
      posten.push({ naam: `Dakgoten, ±${lengte} m`, min: lengte * p[0], max: lengte * p[1] })
      uitleg = `±${lengte} m ${a.goot && a.goot !== 'weet_niet' ? (a.goot === 'bakgoot' ? 'bakgoot' : `${a.goot === 'pvc' ? 'PVC' : 'zinken'} goot`) : 'goot'}${maten.gootlengte ? ', gemeten uit uw dakscan' : ''}`
    } else if (werk === 'lekkage') {
      posten.push({ naam: 'Onderzoek ter plaatse', min: T.lekkage[0], max: T.lekkage[1] })
      uitleg = 'Inspectie en opsporen van de oorzaak'
    } else if (werk === 'advies') {
      continue
    } else {
      continue
    }

    // Steiger en aansluitingen één keer, bij het eerste werk aan de dakbedekking
    if (!extraGebruikt && (werk === 'dakbedekking' || werk === 'plat_dak')) {
      posten.push(...extra())
      extraGebruikt = true
    }

    const min = posten.reduce((s, p) => s + p.min, 0)
    const max = posten.reduce((s, p) => s + p.max, 0)
    regels.push({ werk, naam: NAAM[werk], uitleg, min, max, posten })
  }

  const totaalMin = regels.reduce((s, r) => s + r.min, 0)
  const totaalMax = regels.reduce((s, r) => s + r.max, 0)
  const ruw = totaalMax + totaalMin > 0 ? ((totaalMax - totaalMin) / (totaalMax + totaalMin)) * 100 : 50
  const nauwkeurigheid = Math.max(T.minNauwkeurigheid, Math.round(ruw))

  // Afronden op €100; bij een te smalle vork verbreden tot de minimale nauwkeurigheid
  const rond = (r: Prijsregel): Prijsregel => {
    const midden = (r.min + r.max) / 2
    const halve = Math.max((r.max - r.min) / 2, (midden * T.minNauwkeurigheid) / 100)
    return { ...r, min: Math.round((midden - halve) / 100) * 100, max: Math.round((midden + halve) / 100) * 100 }
  }
  const afgerond = regels.map((r) => (r.max > 0 ? rond(r) : r))

  return {
    regels: afgerond,
    min: afgerond.reduce((s, r) => s + r.min, 0),
    max: afgerond.reduce((s, r) => s + r.max, 0),
    nauwkeurigheid,
    zekerheid: 100 - nauwkeurigheid,
    btwInbegrepen: T.btwInbegrepen,
  }
}

// ─── Directe beloningen per antwoord (enkel wat we kunnen onderbouwen) ─────

export type Inzicht = { titel: string; tekst: string }

export function inzichten(maten: DakMaten & { zonM2?: number }, a: Antwoorden, prijs: Prijsresultaat): Inzicht[] {
  const uit: Inzicht[] = []
  const midden = (prijs.min + prijs.max) / 2
  if (a.bouwjaar && a.bouwjaar !== 'na_2015' && a.bouwjaar !== 'onbekend' && midden > 0) {
    const besparing = PRIJSTABEL.btwInbegrepen ? midden * (1 - 1.06 / 1.21) : midden * 0.15
    uit.push({ titel: '6% btw in plaats van 21%', tekst: `Voor een woning ouder dan tien jaar geldt meestal 6% btw. Dat scheelt ±€${getal(Math.round(besparing / 100) * 100)} op deze werken.` })
  }
  if (a.bouwjaar === 'voor_1980' || a.bouwjaar === '1980_2000') {
    uit.push({ titel: 'Mogelijk recht op Mijn VerbouwPremie', tekst: 'Uw woning is van vóór 2006: dakisolatie kan in aanmerking komen. Het bedrag hangt af van uw inkomen.' })
  }
  const kans = asbestKans(a)
  if (kans) {
    uit.push({ titel: 'Asbest: meegerekend', tekst: kans === 'waarschijnlijk'
      ? 'Kunstleien en golfplaten van vóór 2001 bevatten vaak asbest. Het veilig verwijderen zit nu in de prijs.'
      : 'Kunstleien en golfplaten van vóór 2001 kunnen asbest bevatten. Het bouwjaar maakt dit duidelijk.' })
  }
  if (a.zonnepanelen === 0 && maten.zonM2 && maten.zonM2 >= 10) {
    const panelen = Math.floor((maten.zonM2 * 0.7) / 1.95)
    if (panelen >= 4) uit.push({ titel: `Ruimte voor ±${panelen} zonnepanelen`, tekst: `Uw dak heeft ±${getal(maten.zonM2)} m² op het zuiden, oosten of westen. Een indicatie; een installateur bepaalt het exacte aantal.` })
  }
  if (maten.gootlengte && a.werken?.includes('goten')) {
    uit.push({ titel: `±${maten.gootlengte} m dakgoot`, tekst: 'Gemeten uit uw dakscan: de randen waar het dak naartoe afloopt.' })
  }
  return uit
}
