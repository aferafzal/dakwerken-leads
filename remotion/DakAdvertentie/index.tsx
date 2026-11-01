/**
 * DakAdvertentie — advertentie voor sociale media (9:16, 1080×1920, 30 fps, ±19 s, zonder geluid).
 * Kerngedachte: elke vraag over uw dak beantwoordt u door uw adres in te vullen.
 *   "Hoe groot is mijn dak?" → adres → ±118 m²
 *   "Hoeveel kost mijn dak?" → zelfde adres → prijsvork
 *   "Heb ik recht op premies?" → zelfde adres → premies zoals het rapport ze noemt
 * Renderen: npx tsx scripts/render-advertentie.ts → advertenties/ (niet in git)
 *
 * Enkel echte cijfers van het voorbeeldadres (dakscan en prijsmodel van de site op 1 november 2026)
 * en bevestigde claims. Premies: "mogelijk", afhankelijk van woning en inkomen, zoals in het rapport.
 * Belangrijke tekst blijft tussen y 230 en 1460: daarbuiten tonen Instagram en TikTok hun knoppen.
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

const NAVY = '#0f172a'
const AMBER = '#f97316'
const FONT = "'Inter', system-ui, sans-serif"
const klem = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

// Het voorbeeldadres en wat de site er op 1 november 2026 voor berekende
const ADRES = 'Markt 59, Eeklo'
const DAK = { m2: 118, vorm: 'Zadeldak', helling: 44, nok: '13,2' }
const PRIJS = { werk: 'Nieuwe dakbedekking', min: 9800, max: 26200 }

// Begin van elke vraag (in beelden)
const V = [0, 170, 310]
const SLOT = 450
const EINDE = 570

// Waar alles staat (1080×1920)
const L = { vraagTop: 250, veldTop: 610, veldH: 140, knopTop: 770, knopH: 116, antwoordTop: 930, antwoordH: 520 }

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

const euro = (n: number) => `€${Math.round(n).toLocaleString('nl-BE')}`

// ─── Achtergrond: het dronebeeld, gedimd ──────────────────────────────

function Achtergrond({ heroUrl }: { heroUrl: string | null }) {
  return (
    <AbsoluteFill style={{ background: NAVY }}>
      {heroUrl && <OffthreadVideo src={heroUrl} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.86) 0%, rgba(15,23,42,0.78) 45%, rgba(15,23,42,0.92) 100%)' }} />
    </AbsoluteFill>
  )
}

// ─── De vraag bovenaan ────────────────────────────────────────────────

function Vraag({ tekst, nadruk, duur, opening = false }: { tekst: string; nadruk: string; duur: number; opening?: boolean }) {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  // De opening staat er vanaf beeld 0 groot in het midden (dat is ook de miniatuur in de feed)
  // en schuift naar boven zodra het adresveld binnenkomt. De andere vragen springen op hun plaats.
  const binnen = opening ? 1 : spring({ frame: f, fps, config: { damping: 15, mass: 0.7 } })
  const omhoog = opening ? interpolate(f, [10, 30], [0, 1], { ...klem, easing: Easing.bezier(0.65, 0, 0.35, 1) }) : 1
  const weg = interpolate(f, [duur - 10, duur], [0, 1], { ...klem, easing: Easing.in(Easing.cubic) })
  const [voor, na] = tekst.split(nadruk)
  return (
    <div
      style={{
        position: 'absolute', left: 80, right: 80, top: L.vraagTop, fontFamily: FONT, textAlign: 'center',
        color: '#fff', fontSize: 118, fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.035em',
        opacity: 1 - weg,
        scale: String(interpolate(binnen, [0, 1], [0.86, 1]) * interpolate(omhoog, [0, 1], [1.04, 1])),
        translate: `0px ${interpolate(omhoog, [0, 1], [580, 0]) - weg * 80}px`,
      }}
    >
      {voor}<span style={{ color: AMBER }}>{nadruk}</span>{na}
    </div>
  )
}

// ─── Het adresveld: één keer typen, daarna telkens opnieuw invullen ───

function Adresveld() {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const binnen = spring({ frame: f - 18, fps, config: { damping: 200 } })

  // Hoeveel tekens er staan: typen bij vraag 1, wissen en snel opnieuw invullen bij vraag 2 en 3
  let n = Math.round(interpolate(f, [34, 74], [0, ADRES.length], klem))
  for (const start of V.slice(1)) {
    if (f >= start) {
      n = Math.round(interpolate(f, [start + 2, start + 10, start + 16, start + 30], [ADRES.length, 0, 0, ADRES.length], klem))
    }
  }
  const tik = [V[0] + 82, V[1] + 36, V[2] + 36]
  const ingedrukt = tik.some((t) => f >= t - 2 && f <= t + 4)

  return (
    <div style={{ position: 'absolute', left: 90, right: 90, top: L.veldTop, opacity: binnen, translate: `0px ${interpolate(binnen, [0, 1], [120, 0])}px`, fontFamily: FONT }}>
      <div
        style={{
          height: L.veldH, borderRadius: 32, background: '#fff', border: `5px solid ${n > 0 && n < ADRES.length ? '#c2410c' : 'transparent'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', boxSizing: 'border-box',
          boxShadow: '0 30px 60px rgba(0,0,0,0.35)',
        }}
      >
        <span style={{ fontSize: 54, fontWeight: 600, color: n ? NAVY : '#94a3b8', whiteSpace: 'nowrap' }}>
          {n ? ADRES.slice(0, n) : 'Uw adres'}
          {n < ADRES.length && <span style={{ display: 'inline-block', width: 4, height: 58, marginLeft: 4, verticalAlign: 'middle', background: NAVY, opacity: Math.floor(f / 8) % 2 ? 1 : 0 }} />}
        </span>
        <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></svg>
      </div>
      <div
        style={{
          marginTop: L.knopTop - L.veldTop - L.veldH, height: L.knopH, borderRadius: 30, background: AMBER, color: NAVY,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50, fontWeight: 800,
          scale: ingedrukt ? '0.96' : '1', filter: ingedrukt ? 'brightness(0.92)' : 'none',
        }}
      >
        Bereken mijn dak
      </div>
      {tik.map((t) => <Tik key={t} op={t} />)}
    </div>
  )
}

function Tik({ op }: { op: number }) {
  const f = useCurrentFrame()
  const t = f - op
  if (t < -12 || t > 20) return null
  const x = 760, y = L.knopTop - L.veldTop + L.knopH / 2
  const nadert = interpolate(t, [-12, -2], [0, 1], { ...klem, easing: Easing.bezier(0.16, 1, 0.3, 1) })
  return (
    <>
      <div style={{ position: 'absolute', left: x - 70, top: y - 70, width: 140, height: 140, borderRadius: 999, border: `8px solid #fff`, scale: String(interpolate(t, [0, 18], [0.5, 1.8], klem)), opacity: interpolate(t, [0, 18], [0.9, 0], klem) }} />
      <div style={{ position: 'absolute', left: x - 48, top: y - 48, width: 96, height: 96, borderRadius: 999, background: 'rgba(255,255,255,0.9)', boxShadow: '0 10px 30px rgba(0,0,0,0.35)', opacity: Math.min(nadert, interpolate(t, [8, 20], [1, 0], klem)), scale: String(interpolate(t, [-2, 2, 6], [1, 0.8, 1], klem)), translate: `${interpolate(nadert, [0, 1], [80, 0])}px ${interpolate(nadert, [0, 1], [120, 0])}px` }} />
    </>
  )
}

// ─── De antwoorden ────────────────────────────────────────────────────

function Kaart({ children, duur }: { children: React.ReactNode; duur: number }) {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const binnen = spring({ frame: f, fps, config: { damping: 14, mass: 0.8 } })
  const weg = interpolate(f, [duur - 8, duur], [0, 1], klem)
  return (
    <div
      style={{
        position: 'absolute', left: 90, right: 90, top: L.antwoordTop, height: L.antwoordH, borderRadius: 40, overflow: 'hidden',
        background: '#fff', boxShadow: '0 40px 80px rgba(0,0,0,0.45)', fontFamily: FONT,
        opacity: Math.min(binnen * 1.4, 1 - weg), scale: String(interpolate(binnen, [0, 1], [0.8, 1])), translate: `0px ${interpolate(binnen, [0, 1], [80, 0])}px`,
      }}
    >
      {children}
    </div>
  )
}

function Teller({ tot, van = 0, duur = 24, vorm = (n: number) => String(Math.round(n)) }: { tot: number; van?: number; duur?: number; vorm?: (n: number) => string }) {
  const f = useCurrentFrame()
  return <>{vorm(interpolate(f, [4, 4 + duur], [van, tot], { ...klem, easing: Easing.out(Easing.cubic) }))}</>
}

function AntwoordGrootte({ duur }: { duur: number }) {
  return (
    <Kaart duur={duur}>
      <Img src={staticFile('kaart.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 0%' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '28px 40px 34px', background: 'linear-gradient(180deg, rgba(15,23,42,0) 0%, rgba(15,23,42,0.92) 38%)', color: '#fff' }}>
        <div style={{ fontSize: 132, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
          ±<Teller tot={DAK.m2} /> m²
        </div>
        <div style={{ marginTop: 10, fontSize: 36, fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>
          {DAK.vorm} · helling {DAK.helling}° · nok {DAK.nok} m
        </div>
      </div>
      <div style={{ position: 'absolute', right: 22, bottom: 14, color: 'rgba(255,255,255,0.55)', fontSize: 18, fontWeight: 600 }}>
        Luchtfoto © Digitaal Vlaanderen
      </div>
    </Kaart>
  )
}

function AntwoordPrijs({ duur }: { duur: number }) {
  const keuzes = ['Herstelling', PRIJS.werk, 'Volledig nieuw dak']
  return (
    <Kaart duur={duur}>
      <div style={{ padding: '44px 48px', color: NAVY, height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 28, fontWeight: 600, color: '#64748b' }}>Kies wat u wilt laten doen</div>
        <div style={{ marginTop: 14, display: 'flex', gap: 10, whiteSpace: 'nowrap' }}>
          {keuzes.map((k) => (
            <span key={k} style={{ padding: '9px 16px', borderRadius: 999, fontSize: 24, fontWeight: 700, background: k === PRIJS.werk ? NAVY : '#f1f5f9', color: k === PRIJS.werk ? '#fff' : '#475569' }}>{k}</span>
          ))}
        </div>
        <div style={{ marginTop: 'auto', fontSize: 34, fontWeight: 600, color: '#475569' }}>{PRIJS.werk}, {DAK.m2} m²</div>
        <div style={{ marginTop: 8, fontSize: 80, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
          <Teller tot={PRIJS.min} van={0} vorm={(n) => euro(Math.round(n / 100) * 100)} />
          <span style={{ color: '#94a3b8', fontWeight: 600 }}> – </span>
          <Teller tot={PRIJS.max} van={0} vorm={(n) => euro(Math.round(n / 100) * 100)} />
        </div>
        <div style={{ marginTop: 12, fontSize: 30, fontWeight: 600, color: '#64748b' }}>Indicatief, excl. btw · met wat erin zit</div>
      </div>
    </Kaart>
  )
}

function AntwoordPremies({ duur }: { duur: number }) {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const regels = ['Mijn VerbouwPremie voor het dak', 'Mijn VerbouwLening', '6% btw in plaats van 21%']
  return (
    <Kaart duur={duur}>
      <div style={{ padding: '46px 48px', color: NAVY, height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 76, fontWeight: 900, letterSpacing: '-0.03em' }}>Mogelijk wel.</div>
        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 22 }}>
          {regels.map((r, i) => {
            const s = spring({ frame: f - 8 - i * 7, fps, config: { damping: 200 } })
            return (
              <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 22, fontSize: 40, fontWeight: 700, opacity: s, translate: `${interpolate(s, [0, 1], [40, 0])}px 0px` }}>
                <span style={{ width: 54, height: 54, flexShrink: 0, borderRadius: 999, background: AMBER, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="3.5"><path d="M5 12l5 5 9-10" /></svg>
                </span>
                {r}
              </div>
            )
          })}
        </div>
        <div style={{ marginTop: 'auto', fontSize: 28, fontWeight: 600, color: '#64748b' }}>Afhankelijk van uw woning en uw inkomen</div>
      </div>
    </Kaart>
  )
}

// ─── Slot: de kerngedachte en waar het kan ────────────────────────────

function Slot() {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const a = spring({ frame: f, fps, config: { damping: 200 } })
  const b = spring({ frame: f - 14, fps, config: { damping: 12 } })
  const c = spring({ frame: f - 30, fps, config: { damping: 200 } })
  return (
    <AbsoluteFill style={{ background: 'rgba(15,23,42,0.94)', opacity: interpolate(f, [0, 10], [0, 1], klem), alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: FONT, padding: '0 80px' }}>
      <div style={{ color: '#fff', fontSize: 104, fontWeight: 900, lineHeight: 1.02, letterSpacing: '-0.035em', opacity: a, translate: `0px ${interpolate(a, [0, 1], [40, 0])}px` }}>
        Al uw vragen over uw dak.
      </div>
      <div style={{ marginTop: 24, color: AMBER, fontSize: 150, fontWeight: 900, letterSpacing: '-0.04em', opacity: b, scale: String(interpolate(b, [0, 1], [0.7, 1])) }}>
        Eén adres.
      </div>
      <div style={{ marginTop: 80, opacity: c, translate: `0px ${interpolate(c, [0, 1], [30, 0])}px` }}>
        <div style={{ display: 'inline-block', padding: '30px 56px', borderRadius: 30, background: AMBER, color: NAVY, fontSize: 52, fontWeight: 900 }}>Gratis dakrapport</div>
        <div style={{ marginTop: 34, color: '#fff', fontSize: 46, fontWeight: 800 }}>dakwerken-oostvlaanderen.be</div>
        <div style={{ marginTop: 16, color: 'rgba(255,255,255,0.7)', fontSize: 32, fontWeight: 600 }}>Op basis van officiële Vlaamse gegevens · zonder verplichting</div>
      </div>
    </AbsoluteFill>
  )
}

// ─── Het geheel ───────────────────────────────────────────────────────

export function DakAdvertentie({ heroUrl }: { heroUrl: string | null }) {
  const vragen = [
    { tekst: 'Hoe groot is mijn dak?', nadruk: 'groot', Antwoord: AntwoordGrootte, antwoordVan: 90 },
    { tekst: 'Hoeveel kost mijn dak?', nadruk: 'kost', Antwoord: AntwoordPrijs, antwoordVan: 44 },
    { tekst: 'Heb ik recht op premies?', nadruk: 'premies', Antwoord: AntwoordPremies, antwoordVan: 44 },
  ]
  return (
    <AbsoluteFill style={{ backgroundColor: NAVY }}>
      <Lettertype />
      <Achtergrond heroUrl={heroUrl} />
      {vragen.map((v, i) => {
        const tot = i < 2 ? V[i + 1] : SLOT
        return (
          <React.Fragment key={v.tekst}>
            <Sequence from={V[i]} durationInFrames={tot - V[i]} name={v.tekst}>
              <Vraag tekst={v.tekst} nadruk={v.nadruk} duur={tot - V[i]} opening={i === 0} />
            </Sequence>
            <Sequence from={V[i] + v.antwoordVan} durationInFrames={tot - V[i] - v.antwoordVan} name={`Antwoord: ${v.tekst}`}>
              <v.Antwoord duur={tot - V[i] - v.antwoordVan} />
            </Sequence>
          </React.Fragment>
        )
      })}
      <Sequence from={0} durationInFrames={SLOT + 10} name="Adresveld">
        <Adresveld />
      </Sequence>
      <Sequence from={SLOT} durationInFrames={EINDE - SLOT} name="Slot">
        <Slot />
      </Sequence>
    </AbsoluteFill>
  )
}

export function RemotionRoot() {
  return (
    <Composition
      id="DakAdvertentie"
      component={DakAdvertentie}
      durationInFrames={EINDE}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ heroUrl: null as string | null }}
    />
  )
}

registerRoot(RemotionRoot)
