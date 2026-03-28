import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'

export function Scene1Probleem() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' })
  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 80 }, from: 0.8, to: 1 })
  const rain = Array.from({ length: 12 }, (_, i) => i)

  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity, fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden', position: 'relative' }}>
      {/* Regendruppels */}
      {rain.map((i) => {
        const x = (i / 12) * 100
        const delay = (i * 7) % fps
        const dropY = interpolate((frame + delay) % fps, [0, fps], [-5, 105])
        return (
          <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${dropY}%`, width: 2, height: 20, background: 'rgba(100, 180, 255, 0.4)', borderRadius: 2 }} />
        )
      })}

      {/* Dak illustratie */}
      <div style={{ transform: `scale(${scale})`, textAlign: 'center' }}>
        <div style={{ fontSize: 120, lineHeight: 1 }}>🏚️</div>
        <div style={{ marginTop: 16, background: 'rgba(239, 68, 68, 0.2)', border: '2px solid rgba(239, 68, 68, 0.6)', borderRadius: 12, padding: '8px 20px' }}>
          <span style={{ color: '#fca5a5', fontSize: 16, fontWeight: 700 }}>⚠️ Daklekkage gedetecteerd</span>
        </div>
      </div>

      {/* Tekst */}
      <div style={{ marginTop: 40, textAlign: 'center', padding: '0 60px' }}>
        <h2 style={{ color: '#f8fafc', fontSize: 36, fontWeight: 900, margin: 0, lineHeight: 1.2 }}>
          Een lekkend dak is een urgent probleem
        </h2>
        <p style={{ color: 'rgba(248, 250, 252, 0.6)', fontSize: 20, marginTop: 16 }}>
          Waterschade, schimmel en hoge energieverliezen — elke dag telt.
        </p>
      </div>
    </div>
  )
}
