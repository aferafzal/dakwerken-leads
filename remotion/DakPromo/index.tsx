/**
 * DakPromo — promofilmpje voor de homepage (16:9, 30 fps, ±35 s, zonder geluid: het speelt gedempt).
 * Bronbeelden: remotion/DakPromo/beelden (opgenomen met scripts/promo-opname.ts, met posities.json).
 * Renderen: npx tsx scripts/render-promo.ts → public/promo.mp4 + public/promo-poster.jpg
 *
 * Enkel echte schermbeelden en bevestigde claims (zie het claimbeleid): gratis, zonder verplichting,
 * gegevens van de Vlaamse overheid, gecontroleerde dakwerkers. Geen verzonnen prijs, garantie of klantental.
 */

import React, { useEffect, useState } from 'react'
import {
  AbsoluteFill,
  Composition,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  registerRoot,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import posities from './beelden/posities.json'

const NAVY = '#0f172a'
const AMBER = '#f97316'
const FONT = "'Inter', system-ui, sans-serif"
const FPS = 30

// Begin van elke scène (in beelden)
const T = { intro: 0, adres: 105, scan: 255, werk: 420, prijs: 555, rapport: 735, slot: 900, einde: 1035 }
const OVERGANG = 12

type Doos = { x: number; y: number; b: number; h: number }
const P = posities as unknown as Record<string, Doos> & { adresTekst: string; prijs: string }

const zacht = Easing.bezier(0.16, 1, 0.3, 1)
const klem = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

// Inter laden voordat er gerenderd wordt
function Lettertype() {
  const [handle] = useState(() => delayRender('Inter laden'))
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&display=block'
    link.onload = () => { document.fonts.ready.then(() => continueRender(handle)) }
    link.onerror = () => continueRender(handle)
    document.head.appendChild(link)
  }, [handle])
  return null
}

// ─── Achtergrond: navy met een zachte oranje gloed achter de gsm ─────────

function Achtergrond() {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(900px 700px at 72% 52%, rgba(249,115,22,0.16), transparent 70%), linear-gradient(160deg, #111c33 0%, ${NAVY} 60%)`,
      }}
    />
  )
}

// ─── Titel links per stap ─────────────────────────────────────────────

function StapTekst({ stap, titel, uitleg, duur, breed = 700 }: { stap: string; titel: string; uitleg: string; duur: number; breed?: number }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const binnen = spring({ frame: frame - 4, fps, config: { damping: 200 } })
  const buiten = interpolate(frame, [duur - 10, duur], [1, 0], klem)
  return (
    <div style={{ position: 'absolute', left: 150, top: 0, bottom: 0, width: breed, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontFamily: FONT, opacity: Math.min(binnen, buiten) }}>
      <div
        style={{
          alignSelf: 'flex-start', padding: '10px 22px', borderRadius: 999, background: 'rgba(249,115,22,0.14)', color: AMBER,
          fontSize: 28, fontWeight: 800, letterSpacing: '0.02em', translate: `0px ${interpolate(binnen, [0, 1], [24, 0])}px`,
        }}
      >
        {stap}
      </div>
      <div
        style={{
          marginTop: 28, color: '#fff', fontSize: 88, fontWeight: 900, lineHeight: 1.02, letterSpacing: '-0.03em',
          translate: `0px ${interpolate(spring({ frame: frame - 8, fps, config: { damping: 200 } }), [0, 1], [36, 0])}px`,
        }}
      >
        {titel}
      </div>
      <div
        style={{
          marginTop: 28, color: 'rgba(255,255,255,0.74)', fontSize: 36, fontWeight: 500, lineHeight: 1.35, maxWidth: 640,
          opacity: interpolate(frame, [14, 30], [0, 1], klem),
        }}
      >
        {uitleg}
      </div>
    </div>
  )
}

// ─── De gsm met de echte funnel ───────────────────────────────────────

const GSM = { b: 440, h: 900, rand: 14 }
const SCHERM = { b: GSM.b - 2 * GSM.rand, h: GSM.h - 2 * GSM.rand }
const BALK = 52 // statusbalk met het camera-eiland: de site begint eronder, zoals op een echte gsm
const ZICHT = SCHERM.h - BALK
const S = SCHERM.b / 390 // van CSS-pixels (390 breed) naar het scherm in het filmpje

type Scherm = {
  beeld: string
  hoogte: number                         // CSS-pixels van de afbeelding
  van: number; tot: number               // zichtbaar (beelden, binnen de gsm-reeks)
  scroll: [number, number, number, number] // [vanBeeld, totBeeld, vanY, totY]
}

// Tijden binnen de gsm-reeks (die start bij T.adres)
const A = (t: number) => t - T.adres
const SCHERMEN: Scherm[] = [
  { beeld: '1-hero.jpg', hoogte: 844, van: 0, tot: A(T.adres) + 78, scroll: [0, 1, 0, 0] },
  { beeld: '1-hero-getypt.jpg', hoogte: 844, van: A(T.adres) + 70, tot: A(T.scan) + OVERGANG, scroll: [0, 1, 0, 0] },
  { beeld: '2-scan.jpg', hoogte: 1700, van: A(T.scan), tot: A(T.werk) + OVERGANG, scroll: [0, 1, P.paneelScan.y - 24, P.paneelScan.y - 24] },
  { beeld: '3-werk.jpg', hoogte: 1700, van: A(T.werk), tot: A(T.prijs) + OVERGANG, scroll: [0, 1, P.paneelWerk.y - 24, P.paneelWerk.y - 24] },
  { beeld: '4-prijs.jpg', hoogte: 1700, van: A(T.prijs), tot: A(T.rapport) + 20, scroll: [A(T.prijs) + 40, A(T.prijs) + 95, P.paneelPrijs.y - 24, P.prijskaart.y + P.prijskaart.h + 24 - ZICHT / S] },
]

// Tikken: waar (CSS-pixels in de afbeelding) en wanneer
const TIKKEN: { beeld: string; doos: Doos; op: number }[] = [
  { beeld: '1-hero-getypt.jpg', doos: P.optie, op: A(T.adres) + 112 },
  { beeld: '3-werk.jpg', doos: P.keuze, op: A(T.werk) + 95 },
]

function scrollVan(s: Scherm, f: number) {
  return interpolate(f, [s.scroll[0], s.scroll[1]], [s.scroll[2], s.scroll[3]], { ...klem, easing: Easing.inOut(Easing.cubic) })
}

function Vinger({ x, y, op }: { x: number; y: number; op: number }) {
  const f = useCurrentFrame()
  const t = f - op
  if (t < -14 || t > 22) return null
  const nadert = interpolate(t, [-14, -2], [0, 1], { ...klem, easing: zacht })
  const druk = interpolate(t, [-2, 2, 6], [1, 0.82, 1], klem)
  const ring = interpolate(t, [0, 20], [0.6, 2.2], klem)
  return (
    <>
      <div style={{ position: 'absolute', left: x - 34, top: y - 34, width: 68, height: 68, borderRadius: 999, border: `5px solid ${AMBER}`, scale: String(ring), opacity: interpolate(t, [0, 20], [0.9, 0], klem) }} />
      <div
        style={{
          position: 'absolute', left: x - 26, top: y - 26, width: 52, height: 52, borderRadius: 999,
          background: 'rgba(255,255,255,0.92)', boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          opacity: Math.min(nadert, interpolate(t, [10, 22], [1, 0], klem)),
          scale: String(druk), translate: `${interpolate(nadert, [0, 1], [40, 0])}px ${interpolate(nadert, [0, 1], [60, 0])}px`,
        }}
      />
    </>
  )
}

// Het adres dat in het lege veld getypt wordt (daarna neemt de echte schermafbeelding het over)
function Typen() {
  const f = useCurrentFrame()
  const tekst = 'Markt 59 Eeklo'
  const n = Math.round(interpolate(f, [20, 62], [0, tekst.length], klem))
  const zichtbaar = interpolate(f, [12, 18], [0, 1], klem)
  const v = P.veld
  return (
    <div
      style={{
        position: 'absolute', left: v.x * S, top: v.y * S, width: v.b * S, height: v.h * S, borderRadius: 14 * S,
        background: '#fff', border: `${3 * S}px solid #c2410c`, display: 'flex', alignItems: 'center', paddingLeft: 16 * S,
        fontFamily: FONT, fontSize: 17 * S, color: NAVY, opacity: zichtbaar, boxSizing: 'border-box',
      }}
    >
      {tekst.slice(0, n)}
      <span style={{ width: 2, height: 22 * S, marginLeft: 2, background: NAVY, opacity: Math.floor(f / 8) % 2 ? 1 : 0 }} />
    </div>
  )
}

// Oranje kader rond de prijskaart, zodra die in beeld geschoven is
function PrijsKader() {
  const f = useCurrentFrame()
  const s = SCHERMEN[4]
  const t = f - (A(T.prijs) + 100)
  if (t < 0) return null
  const y = (P.prijskaart.y - scrollVan(s, f)) * S
  const k = P.prijskaart
  return (
    <div
      style={{
        position: 'absolute', left: (k.x - 6) * S, top: y - 6 * S, width: (k.b + 12) * S, height: (k.h + 12) * S,
        borderRadius: 22 * S, border: `${4}px solid ${AMBER}`, opacity: interpolate(t, [0, 10, 60, 75], [0, 1, 1, 0.6], klem),
        boxShadow: `0 0 0 ${interpolate(t, [0, 30], [0, 14], klem)}px rgba(249,115,22,0.18)`,
      }}
    />
  )
}

function GsmScherm() {
  const f = useCurrentFrame()
  return (
    <div style={{ position: 'absolute', inset: GSM.rand, borderRadius: 52, overflow: 'hidden', background: NAVY }}>
      <Statusbalk />
      <div style={{ position: 'absolute', left: 0, right: 0, top: BALK, bottom: 0, overflow: 'hidden' }}>
      {SCHERMEN.map((s) => {
        if (f < s.van || f > s.tot) return null
        const zicht = interpolate(f, [s.van, s.van + OVERGANG], [0, 1], klem)
        return (
          <Img
            key={s.beeld}
            src={staticFile(s.beeld)}
            style={{ position: 'absolute', left: 0, top: 0, width: SCHERM.b, height: s.hoogte * S, opacity: s.van === 0 ? 1 : zicht, translate: `0px ${-scrollVan(s, f) * S}px` }}
          />
        )
      })}
      {f < 80 && <Typen />}
      {TIKKEN.map((t) => {
        const s = SCHERMEN.find((x) => x.beeld === t.beeld)!
        const y = (t.doos.y + t.doos.h / 2 - scrollVan(s, t.op)) * S
        return <Vinger key={t.beeld} x={(t.doos.x + t.doos.b / 2) * S} y={y} op={t.op} />
      })}
      <PrijsKader />
      </div>
    </div>
  )
}

function Statusbalk() {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: BALK, background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 34px 0', fontFamily: FONT, color: '#fff' }}>
      <span style={{ fontSize: 17, fontWeight: 700 }}>9:41</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {[7, 10, 13, 16].map((h) => <span key={h} style={{ width: 4, height: h, borderRadius: 2, background: '#fff' }} />)}
        <span style={{ marginLeft: 6, width: 26, height: 13, borderRadius: 4, border: '2px solid rgba(255,255,255,0.8)', padding: 1, boxSizing: 'border-box' }}>
          <span style={{ display: 'block', width: '75%', height: '100%', borderRadius: 2, background: '#fff' }} />
        </span>
      </span>
    </div>
  )
}

function Gsm({ duur }: { duur: number }) {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const binnen = spring({ frame: f, fps, config: { damping: 18, mass: 0.9 } })
  const weg = interpolate(f, [duur - 30, duur], [0, 1], { ...klem, easing: Easing.in(Easing.cubic) })
  return (
    <div
      style={{
        position: 'absolute', left: 1380 - GSM.b / 2, top: 540 - GSM.h / 2, width: GSM.b, height: GSM.h,
        borderRadius: 64, background: '#05070d', boxShadow: '0 40px 90px rgba(0,0,0,0.55), inset 0 0 0 2px rgba(255,255,255,0.08)',
        translate: `${weg * 700}px ${interpolate(binnen, [0, 1], [500, 0])}px`, opacity: 1 - weg,
      }}
    >
      <GsmScherm />
      {/* Camera-eiland */}
      <div style={{ position: 'absolute', left: GSM.b / 2 - 60, top: 26, width: 120, height: 34, borderRadius: 999, background: '#05070d' }} />
    </div>
  )
}

// ─── Intro: het dronebeeld ────────────────────────────────────────────

function Intro({ heroUrl }: { heroUrl: string | null }) {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const titel = spring({ frame: f - 6, fps, config: { damping: 200 } })
  const sub = spring({ frame: f - 26, fps, config: { damping: 200 } })
  return (
    <AbsoluteFill style={{ background: NAVY }}>
      {heroUrl && (
        <AbsoluteFill style={{ scale: String(interpolate(f, [0, T.adres + 20], [1.08, 1.0])) }}>
          <OffthreadVideo src={heroUrl} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ background: 'linear-gradient(90deg, rgba(15,23,42,0.88) 0%, rgba(15,23,42,0.55) 55%, rgba(15,23,42,0.2) 100%)' }} />
      <AbsoluteFill style={{ justifyContent: 'center', paddingLeft: 150, fontFamily: FONT }}>
        <div style={{ color: AMBER, fontSize: 30, fontWeight: 800, letterSpacing: '0.04em', opacity: titel }}>DAKWERKEN OOST-VLAANDEREN</div>
        <div style={{ marginTop: 20, color: '#fff', fontSize: 128, fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1, opacity: titel, translate: `0px ${interpolate(titel, [0, 1], [40, 0])}px` }}>
          Wat kost uw dak?
        </div>
        <div style={{ marginTop: 28, color: 'rgba(255,255,255,0.82)', fontSize: 44, fontWeight: 600, opacity: sub, translate: `0px ${interpolate(sub, [0, 1], [24, 0])}px` }}>
          Een gratis dakrapport, in een paar klikken.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

// ─── Rapport op een laptop, met een mailmelding ───────────────────────

function Laptop() {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const binnen = spring({ frame: f - 8, fps, config: { damping: 200 } })
  const melding = spring({ frame: f - 50, fps, config: { damping: 16 } })
  const W = 1000, H = 625
  return (
    <>
      <div style={{ position: 'absolute', left: 860, top: 200, width: W + 36, opacity: binnen, translate: `${interpolate(binnen, [0, 1], [260, 0])}px 0px` }}>
        <div style={{ borderRadius: 26, background: '#05070d', padding: 18, boxShadow: '0 40px 90px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(255,255,255,0.08)' }}>
          <div style={{ width: W, height: H, borderRadius: 10, overflow: 'hidden' }}>
            <Img src={staticFile('5-rapport.jpg')} style={{ width: W, height: H, scale: String(interpolate(f, [0, 165], [1, 1.06])), transformOrigin: '30% 30%' }} />
          </div>
        </div>
        <div style={{ margin: '0 -60px', height: 22, borderRadius: '0 0 18px 18px', background: 'linear-gradient(#1e293b, #0b1120)' }} />
      </div>
      {/* Mailmelding */}
      <div
        style={{
          position: 'absolute', left: 1180, top: 120, width: 600, padding: '22px 26px', borderRadius: 22, background: 'rgba(255,255,255,0.97)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)', display: 'flex', gap: 20, alignItems: 'center', fontFamily: FONT,
          opacity: melding, translate: `0px ${interpolate(melding, [0, 1], [-120, 0])}px`,
        }}
      >
        <div style={{ width: 64, height: 64, flexShrink: 0, borderRadius: 16, background: NAVY, color: AMBER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 900 }}>D</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 20, fontWeight: 600 }}>
            <span>Dakwerken Oost-Vlaanderen</span><span>nu</span>
          </div>
          <div style={{ marginTop: 4, color: NAVY, fontSize: 25, fontWeight: 800 }}>Uw dakrapport voor {P.adresTekst}</div>
        </div>
      </div>
    </>
  )
}

// ─── Slot ─────────────────────────────────────────────────────────────

function Slot({ heroUrl }: { heroUrl: string | null }) {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const zicht = interpolate(f, [0, OVERGANG], [0, 1], klem)
  const titel = spring({ frame: f - 6, fps, config: { damping: 200 } })
  const chips = ['Gratis', 'Zonder verplichting', 'Gecontroleerde dakwerkers']
  return (
    <AbsoluteFill style={{ opacity: zicht, background: NAVY }}>
      {heroUrl && (
        <AbsoluteFill style={{ opacity: 0.22 }}>
          <OffthreadVideo src={heroUrl} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: FONT, padding: 140 }}>
        <div style={{ color: '#fff', fontSize: 92, fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.03em', maxWidth: 1400, opacity: titel, translate: `0px ${interpolate(titel, [0, 1], [36, 0])}px` }}>
          Weet wat uw dak kost, vóór u een dakwerker belt.
        </div>
        <div style={{ marginTop: 48, display: 'flex', gap: 18 }}>
          {chips.map((c, i) => {
            const s = spring({ frame: f - 22 - i * 6, fps, config: { damping: 200 } })
            return (
              <div key={c} style={{ padding: '14px 28px', borderRadius: 999, border: '2px solid rgba(255,255,255,0.22)', color: '#fff', fontSize: 32, fontWeight: 700, opacity: s, translate: `0px ${interpolate(s, [0, 1], [20, 0])}px` }}>
                {c}
              </div>
            )
          })}
        </div>
        <div style={{ marginTop: 56, padding: '20px 40px', borderRadius: 18, background: AMBER, color: NAVY, fontSize: 40, fontWeight: 900, opacity: spring({ frame: f - 44, fps, config: { damping: 200 } }) }}>
          dakwerken-oostvlaanderen.be
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

// ─── Het geheel ───────────────────────────────────────────────────────

export function DakPromo({ heroUrl }: { heroUrl: string | null }) {
  return (
    <AbsoluteFill style={{ backgroundColor: NAVY }}>
      <Lettertype />
      <Achtergrond />

      <Sequence from={T.adres} durationInFrames={T.rapport - T.adres + 30} name="Gsm">
        <Gsm duur={T.rapport - T.adres + 30} />
      </Sequence>

      <Sequence from={T.adres} durationInFrames={T.scan - T.adres} name="Stap 1 · Adres">
        <StapTekst duur={T.scan - T.adres} stap="Stap 1 · Adres" titel="Typ uw adres." uitleg="U ziet meteen de luchtfoto van uw woning." />
      </Sequence>
      <Sequence from={T.scan} durationInFrames={T.werk - T.scan} name="Stap 2 · Uw dak">
        <StapTekst duur={T.werk - T.scan} stap="Stap 2 · Uw dak" titel="Wij meten uw dak." uitleg="Oppervlakte, helling en nokhoogte, met de laserhoogtemeting van de Vlaamse overheid." />
      </Sequence>
      <Sequence from={T.werk} durationInFrames={T.prijs - T.werk} name="Stap 2 · Uw werken">
        <StapTekst duur={T.prijs - T.werk} stap="Stap 2 · Uw werken" titel="Kies wat u wilt laten doen." uitleg="Een herstelling, een nieuwe dakbedekking, een volledig nieuw dak of isolatie." />
      </Sequence>
      <Sequence from={T.prijs} durationInFrames={T.rapport - T.prijs} name="Stap 2 · Uw prijs">
        <StapTekst duur={T.rapport - T.prijs} stap="Stap 2 · Uw prijs" titel="Zie meteen wat het kost." uitleg="Een prijs per werk, en wat erin zit. Indicatief, zonder verplichting." />
      </Sequence>
      <Sequence from={T.rapport} durationInFrames={T.slot - T.rapport} name="Stap 3 · Rapport">
        <StapTekst duur={T.slot - T.rapport} breed={640} stap="Stap 3 · Rapport" titel="Uw rapport, meteen in uw mailbox." uitleg="Met de luchtfoto, de prijs, premies en aandachtspunten." />
        <Laptop />
      </Sequence>

      <Sequence from={T.intro} durationInFrames={T.adres + OVERGANG} name="Intro">
        <AbsoluteFill style={{ opacity: 1 }}>
          <IntroMetUitgang heroUrl={heroUrl} />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={T.slot} durationInFrames={T.einde - T.slot} name="Slot">
        <Slot heroUrl={heroUrl} />
      </Sequence>
    </AbsoluteFill>
  )
}

// De intro vervaagt naar de gsm-scènes
function IntroMetUitgang({ heroUrl }: { heroUrl: string | null }) {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ opacity: interpolate(f, [T.adres - 6, T.adres + OVERGANG], [1, 0], klem) }}>
      <Intro heroUrl={heroUrl} />
    </AbsoluteFill>
  )
}

export function RemotionRoot() {
  return (
    <Composition
      id="DakPromo"
      component={DakPromo}
      durationInFrames={T.einde}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ heroUrl: null as string | null }}
    />
  )
}

registerRoot(RemotionRoot)
