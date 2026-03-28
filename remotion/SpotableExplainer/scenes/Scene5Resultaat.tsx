import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'

export function Scene5Resultaat() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' })
  const houseScale = spring({ frame, fps, config: { damping: 10, stiffness: 60 }, from: 0.6, to: 1 })
  const starsOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const ctaOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const ctaScale = spring({ frame: frame - 50, fps, config: { damping: 12, stiffness: 80 }, from: 0.8, to: 1 })

  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity, fontFamily: 'Inter, system-ui, sans-serif', padding: '40px 80px', textAlign: 'center' }}>

      {/* Woning */}
      <div style={{ transform: `scale(${houseScale})`, fontSize: 100, lineHeight: 1 }}>🏠</div>

      <h2 style={{ color: '#f8fafc', fontSize: 44, fontWeight: 900, margin: '20px 0 8px', lineHeight: 1.2 }}>
        Uw dak is in perfecte staat
      </h2>
      <p style={{ color: 'rgba(248,250,252,0.6)', fontSize: 20, margin: 0 }}>
        Professioneel uitgevoerd door gecertificeerde vaklui
      </p>

      {/* Sterren */}
      <div style={{ display: 'flex', gap: 6, marginTop: 20, opacity: starsOpacity }}>
        {Array(5).fill(0).map((_, i) => (
          <span key={i} style={{ fontSize: 32, color: '#fbbf24' }}>★</span>
        ))}
      </div>
      <p style={{ color: '#fbbf24', fontWeight: 700, marginTop: 8, fontSize: 16, opacity: starsOpacity }}>
        "Uitstekend werk! Aanrader." — Jan V., Gent
      </p>

      {/* CTA */}
      <div style={{ marginTop: 32, opacity: ctaOpacity, transform: `scale(${ctaScale})` }}>
        <div style={{ background: '#f59e0b', borderRadius: 14, padding: '16px 40px', fontSize: 20, fontWeight: 900, color: '#0f172a', boxShadow: '0 8px 32px rgba(245, 158, 11, 0.4)' }}>
          Vraag nu uw gratis offerte aan →
        </div>
        <p style={{ color: 'rgba(248,250,252,0.5)', marginTop: 12, fontSize: 14 }}>
          dakwerken-oostvlaanderen.be
        </p>
      </div>
    </div>
  )
}
