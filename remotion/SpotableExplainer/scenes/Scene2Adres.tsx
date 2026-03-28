import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'

export function Scene2Adres() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' })
  const inputScale = spring({ frame: frame - 20, fps, config: { damping: 14, stiffness: 90 }, from: 0.9, to: 1 })
  const pinDrop = interpolate(frame, [40, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const pinY = interpolate(frame, [40, 55], [-20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const pulseScale = interpolate(frame % (fps / 2), [0, fps / 4, fps / 2], [1, 1.3, 1])

  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity, fontFamily: 'Inter, system-ui, sans-serif', padding: '0 80px' }}>

      {/* Stap badge */}
      <div style={{ background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.5)', borderRadius: 20, padding: '6px 20px', marginBottom: 32 }}>
        <span style={{ color: '#fbbf24', fontSize: 14, fontWeight: 700 }}>STAP 1 van 3</span>
      </div>

      <h2 style={{ color: '#f8fafc', fontSize: 42, fontWeight: 900, textAlign: 'center', margin: 0, marginBottom: 48 }}>
        Voer het adres in van uw woning
      </h2>

      {/* Adresveld mock */}
      <div style={{ transform: `scale(${inputScale})`, width: '100%', maxWidth: 560 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          <span style={{ fontSize: 20 }}>📍</span>
          <span style={{ color: '#1e293b', fontSize: 18, fontWeight: 500 }}>Kerkstraat 42, 9000 Gent</span>
        </div>
      </div>

      {/* Map placeholder */}
      <div style={{ marginTop: 32, width: '100%', maxWidth: 560, height: 200, background: 'rgba(30, 58, 95, 0.8)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(30,58,95,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(30,58,95,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div style={{ opacity: pinDrop, transform: `translateY(${pinY}px)`, fontSize: 48, zIndex: 1 }}>📍</div>
        {pinDrop > 0.5 && (
          <div style={{ position: 'absolute', bottom: 60, left: '50%', width: 60, height: 60, borderRadius: '50%', border: '3px solid rgba(245, 158, 11, 0.5)', transform: `translateX(-50%) scale(${pulseScale})`, opacity: 0.7 }} />
        )}
      </div>
    </div>
  )
}
