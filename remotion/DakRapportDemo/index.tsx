/**
 * DakRapportDemo — korte demo van de echte tool (16:9, 30 fps, 25 s).
 * Bronbeelden: remotion/DakRapportDemo/beelden (opgenomen met scripts/demo-opname.ts).
 * Renderen: npx tsx scripts/render-demo.ts → public/demo.mp4 + public/demo-poster.jpg
 *
 * Alleen echte schermbeelden en bevestigde claims: geen offerte, garantie of verzonnen prijs.
 */

import React, { useEffect, useState } from 'react'
import {
  AbsoluteFill,
  Composition,
  Easing,
  Img,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  registerRoot,
  staticFile,
  useCurrentFrame,
} from 'remotion'

const NAVY = '#0f172a'
const AMBER = '#f97316'
const FONT = "'Inter', system-ui, sans-serif"

export const FPS = 30
export const SCENE = 165       // 5,5 s per scène
export const OVERGANG = 15     // 0,5 s overvloeien
export const SLOT = 90         // 3 s slotbeeld

type Scene = { beeld: string; nr: number; tekst: string; focus: [number, number]; zoom: number; startZoom?: number }

const SCENES: Scene[] = [
  // Inzoomen vanaf de onderrand: de kop schuift omhoog, onderaan komt ruimte voor de ondertitel
  { beeld: '01-adres.png',     nr: 1, tekst: 'Typ het adres van uw woning',          focus: [960, 1080], zoom: 1.22, startZoom: 1.15 },
  { beeld: '02-kaart.png',     nr: 2, tekst: 'Duid uw dak aan op de kaart',          focus: [960, 380], zoom: 1.15 },
  { beeld: '03-resultaat.png', nr: 3, tekst: 'Zie meteen de oppervlakte van uw dak', focus: [960, 440], zoom: 1.12 },
  { beeld: '04-rapport.png',   nr: 4, tekst: 'Uw rapport komt meteen in uw mailbox', focus: [760, 260], zoom: 1.15 },
]

export const DUUR = SCENES.length * SCENE + SLOT

// Inter laden voordat er gerenderd wordt
function Lettertype() {
  const [handle] = useState(() => delayRender('Inter laden'))
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@600;800;900&display=block'
    link.onload = () => { document.fonts.ready.then(() => continueRender(handle)) }
    link.onerror = () => continueRender(handle)
    document.head.appendChild(link)
  }, [handle])
  return null
}

function SceneBeeld({ scene, eerste }: { scene: Scene; eerste: boolean }) {
  const frame = useCurrentFrame()
  const schaal = interpolate(frame, [0, SCENE + OVERGANG], [scene.startZoom ?? 1, scene.zoom], {
    easing: Easing.inOut(Easing.quad),
    extrapolateRight: 'clamp',
  })
  const zichtbaar = eerste ? 1 : interpolate(frame, [0, OVERGANG], [0, 1], { extrapolateRight: 'clamp' })
  const tekstIn = interpolate(frame, [8, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ opacity: zichtbaar, backgroundColor: NAVY }}>
      <AbsoluteFill style={{ transform: `scale(${schaal})`, transformOrigin: `${scene.focus[0]}px ${scene.focus[1]}px` }}>
        <Img src={staticFile(scene.beeld)} style={{ width: 1920, height: 1080 }} />
      </AbsoluteFill>

      {/* Ondertitel met stapnummer */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          bottom: 80,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          padding: '24px 40px 24px 24px',
          borderRadius: 24,
          backgroundColor: 'rgba(15, 23, 42, 0.94)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
          opacity: tekstIn,
          transform: `translateY(${(1 - tekstIn) * 24}px)`,
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            width: 64, height: 64, borderRadius: 999, backgroundColor: AMBER, color: NAVY,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 900,
          }}
        >
          {scene.nr}
        </div>
        <div style={{ color: '#ffffff', fontSize: 46, fontWeight: 800, letterSpacing: '-0.01em' }}>{scene.tekst}</div>
      </div>
    </AbsoluteFill>
  )
}

function Slotbeeld() {
  const frame = useCurrentFrame()
  const zichtbaar = interpolate(frame, [0, OVERGANG], [0, 1], { extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill
      style={{
        opacity: zichtbaar,
        backgroundColor: NAVY,
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        fontFamily: FONT,
        padding: 160,
      }}
    >
      <div style={{ color: '#ffffff', fontSize: 84, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.02em', maxWidth: 1400 }}>
        Weet wat uw dak kost, vóór u een dakwerker belt.
      </div>
      <div style={{ marginTop: 40, color: 'rgba(255,255,255,0.78)', fontSize: 36, fontWeight: 600 }}>
        Gratis · Zonder account · Op basis van officiële Vlaamse gegevens
      </div>
    </AbsoluteFill>
  )
}

export function DakRapportDemo() {
  return (
    <AbsoluteFill style={{ backgroundColor: NAVY }}>
      <Lettertype />
      {SCENES.map((scene, i) => (
        <Sequence key={scene.beeld} from={i * SCENE} durationInFrames={SCENE + OVERGANG}>
          <SceneBeeld scene={scene} eerste={i === 0} />
        </Sequence>
      ))}
      <Sequence from={SCENES.length * SCENE} durationInFrames={SLOT}>
        <Slotbeeld />
      </Sequence>
    </AbsoluteFill>
  )
}

export function RemotionRoot() {
  return (
    <Composition
      id="DakRapportDemo"
      component={DakRapportDemo}
      durationInFrames={DUUR}
      fps={FPS}
      width={1920}
      height={1080}
    />
  )
}

registerRoot(RemotionRoot)
