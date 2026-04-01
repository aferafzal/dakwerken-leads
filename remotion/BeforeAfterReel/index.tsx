/**
 * BeforeAfterReel — Instagram Reel (9:16, 30fps, 30s)
 * Gerenderd via: npx ts-node scripts/render-reels.ts
 *
 * Props: { voorPath, naPath, gemeente, type }
 */

import React from 'react'
import {
  Composition,
  Series,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  staticFile,
  registerRoot,
} from 'remotion'

// ── Brand tokens ────────────────────────────────────────────
const NAVY  = '#0d1929'
const AMBER = 'hsl(25, 95%, 53%)'
const WHITE = '#ffffff'

// ── Props ───────────────────────────────────────────────────
interface ReelProps {
  voorPath: string
  naPath:   string
  gemeente: string
  type:     string
}

// ─────────────────────────────────────────────────────────────
// Scene 1 — Intro (60 frames / 2s)
// Brand logo + gemeente + type dakwerk
// ─────────────────────────────────────────────────────────────
function SceneIntro({ gemeente, type }: Pick<ReelProps, 'gemeente' | 'type'>) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const opacity = spring({ frame, fps, config: { damping: 20, stiffness: 80 } })
  const y = interpolate(opacity, [0, 1], [40, 0])

  const labelOpacity = spring({
    frame: frame - 15,
    fps,
    config: { damping: 20, stiffness: 80 },
  })

  return (
    <div style={{
      width: '100%', height: '100%',
      background: NAVY,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Logo mark */}
      <div style={{ opacity, transform: `translateY(${y}px)`, textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 18,
          background: AMBER, margin: '0 auto 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32,
        }}>🏠</div>
        <div style={{ color: WHITE, fontSize: 36, fontWeight: 900, letterSpacing: -1 }}>
          Dakwerken
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 22, fontWeight: 300 }}>
          Oost-Vlaanderen
        </div>
      </div>

      {/* Type + gemeente badge */}
      <div style={{
        marginTop: 48,
        opacity: labelOpacity,
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 40,
        padding: '10px 28px',
        display: 'flex', gap: 12, alignItems: 'center',
      }}>
        <span style={{ color: AMBER, fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>
          {type}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>·</span>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>{gemeente}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Scene 2 — Voor foto (270 frames / 9s)
// ─────────────────────────────────────────────────────────────
function SceneVoor({ voorPath }: Pick<ReelProps, 'voorPath'>) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const slideIn = spring({ frame, fps, config: { damping: 22, stiffness: 70 } })
  const x = interpolate(slideIn, [0, 1], [-120, 0])
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' })

  // Subtiele zoom
  const scale = interpolate(frame, [0, 270], [1.04, 1.0], { extrapolateRight: 'clamp' })

  const labelOpacity = spring({ frame: frame - 20, fps, config: { damping: 20, stiffness: 80 } })

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative', background: '#000' }}>
      {/* Foto */}
      <div style={{ opacity, transform: `translateX(${x}px) scale(${scale})`, width: '100%', height: '100%' }}>
        <Img
          src={staticFile(voorPath)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Donkere gradiënt onderkant */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
      }} />

      {/* VOOR label */}
      <div style={{
        position: 'absolute', top: 48, left: 48,
        opacity: labelOpacity,
        background: 'rgba(0,0,0,0.65)',
        border: '1px solid rgba(255,255,255,0.2)',
        backdropFilter: 'blur(8px)',
        borderRadius: 12,
        padding: '8px 20px',
        color: WHITE,
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: 3,
        textTransform: 'uppercase',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        VOOR
      </div>

      {/* Tekst onderaan */}
      <div style={{
        position: 'absolute', bottom: 60, left: 48, right: 48,
        opacity: labelOpacity,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 16, marginBottom: 6 }}>
          De situatie voor onze interventie
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Scene 3 — Split reveal voor → na (360 frames / 12s)
// ─────────────────────────────────────────────────────────────
function SceneReveal({ voorPath, naPath }: Pick<ReelProps, 'voorPath' | 'naPath'>) {
  const frame = useCurrentFrame()
  const { width, fps } = useVideoConfig()

  // Reveal: 0→100% over 180 frames, dan blijft op 100% tot eind
  const revealProgress = spring({
    frame: frame - 30,
    fps,
    config: { damping: 28, stiffness: 45 },
  })
  const revealX = interpolate(revealProgress, [0, 1], [0, width], { extrapolateRight: 'clamp' })

  const lineOpacity = interpolate(frame, [25, 45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Labels
  const labelOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#000' }}>
      {/* VOOR foto (volledig) */}
      <Img
        src={staticFile(voorPath)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* NA foto — geclipped van links */}
      <div style={{
        position: 'absolute', inset: 0,
        clipPath: `inset(0 0 0 ${revealX}px)`,
      }}>
        <Img
          src={staticFile(naPath)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Schuifbalk */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0,
        left: revealX - 2,
        width: 4,
        background: WHITE,
        opacity: lineOpacity,
        boxShadow: '0 0 20px rgba(255,255,255,0.8)',
      }} />
      {/* Schuifknop */}
      <div style={{
        position: 'absolute', top: '50%', left: revealX - 22,
        width: 44, height: 44,
        borderRadius: '50%',
        background: WHITE,
        opacity: lineOpacity,
        transform: 'translateY(-50%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        fontSize: 14,
        color: NAVY,
        fontWeight: 900,
      }}>
        ◀▶
      </div>

      {/* VOOR / NA labels */}
      <div style={{
        position: 'absolute', top: 48, left: 48,
        opacity: labelOpacity,
        background: 'rgba(0,0,0,0.6)',
        borderRadius: 10, padding: '6px 16px',
        color: WHITE, fontSize: 16, fontWeight: 700,
        letterSpacing: 2, textTransform: 'uppercase',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>VOOR</div>

      <div style={{
        position: 'absolute', top: 48, right: 48,
        opacity: revealProgress > 0.1 ? labelOpacity : 0,
        background: AMBER,
        borderRadius: 10, padding: '6px 16px',
        color: WHITE, fontSize: 16, fontWeight: 700,
        letterSpacing: 2, textTransform: 'uppercase',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>NA</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Scene 4 — CTA (210 frames / 7s)
// Na foto fullscreen + overlay met telefoon + website
// ─────────────────────────────────────────────────────────────
function SceneCTA({ naPath, gemeente, type }: Pick<ReelProps, 'naPath' | 'gemeente' | 'type'>) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const fadeIn = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' })
  const cardY = spring({ frame: frame - 20, fps, config: { damping: 22, stiffness: 70 } })
  const cardOffset = interpolate(cardY, [0, 1], [60, 0])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#000' }}>
      {/* NA foto */}
      <Img
        src={staticFile(naPath)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: fadeIn }}
      />

      {/* Gradiënt overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(13,25,41,0.92) 0%, rgba(13,25,41,0.4) 50%, transparent 75%)',
      }} />

      {/* NA badge rechtsboven */}
      <div style={{
        position: 'absolute', top: 48, right: 48,
        opacity: fadeIn,
        background: AMBER, borderRadius: 10,
        padding: '6px 16px',
        color: WHITE, fontSize: 16, fontWeight: 700,
        letterSpacing: 2, textTransform: 'uppercase',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>NA</div>

      {/* CTA card onderaan */}
      <div style={{
        position: 'absolute', bottom: 60, left: 40, right: 40,
        opacity: fadeIn,
        transform: `translateY(${cardOffset}px)`,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        {/* Checkmarks */}
        <div style={{ marginBottom: 20 }}>
          {[
            `${type} — ${gemeente}`,
            'Gratis offerte binnen 2 uur',
            '10 jaar garantie',
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginBottom: 10,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: AMBER,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, color: WHITE, fontWeight: 900,
                flexShrink: 0,
              }}>✓</div>
              <span style={{ color: WHITE, fontSize: 18, fontWeight: 500 }}>{item}</span>
            </div>
          ))}
        </div>

        {/* CTA knop */}
        <div style={{
          background: AMBER,
          borderRadius: 16,
          padding: '18px 32px',
          textAlign: 'center',
          marginBottom: 20,
        }}>
          <div style={{ color: WHITE, fontSize: 22, fontWeight: 900 }}>
            Bereken uw dak gratis
          </div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, marginTop: 4 }}>
            dakwerken-oostvlaanderen.be
          </div>
        </div>

        {/* Telefoon */}
        <div style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.5)',
          fontSize: 15,
        }}>
          📞 +32 466 43 98 59
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Hoofd Compositie
// ─────────────────────────────────────────────────────────────
function BeforeAfterReel({ voorPath, naPath, gemeente, type }: ReelProps) {
  return (
    <Series>
      <Series.Sequence durationInFrames={60}>
        <SceneIntro gemeente={gemeente} type={type} />
      </Series.Sequence>

      <Series.Sequence durationInFrames={270}>
        <SceneVoor voorPath={voorPath} />
      </Series.Sequence>

      <Series.Sequence durationInFrames={360}>
        <SceneReveal voorPath={voorPath} naPath={naPath} />
      </Series.Sequence>

      <Series.Sequence durationInFrames={210}>
        <SceneCTA naPath={naPath} gemeente={gemeente} type={type} />
      </Series.Sequence>
    </Series>
  )
}

// ─────────────────────────────────────────────────────────────
// Remotion root — registreer de compositie
// ─────────────────────────────────────────────────────────────
export function RemotionRoot() {
  return (
    <Composition
      id="BeforeAfterReel"
      component={BeforeAfterReel}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        voorPath: 'processed/gent-daklekkage-voor-square.jpg',
        naPath:   'processed/gent-daklekkage-na-square.jpg',
        gemeente: 'Gent',
        type:     'Dakrenovatie',
      }}
    />
  )
}

registerRoot(RemotionRoot)
