import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'

export function Scene3Meting() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' })
  const dakScale = spring({ frame, fps, config: { damping: 10, stiffness: 60 }, from: 0.5, to: 1 })
  const scanProgress = interpolate(frame, [20, 80], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const measureOpacity = interpolate(frame, [70, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const measures = [
    { label: 'Oppervlakte', value: '127 m²', x: '15%', y: '25%' },
    { label: 'Helling', value: '32°', x: '65%', y: '20%' },
    { label: 'Daklengte', value: '14.5 m', x: '40%', y: '75%' },
  ]

  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0f172a 0%, #162032 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity, fontFamily: 'Inter, system-ui, sans-serif', padding: '40px 80px' }}>

      <div style={{ background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.5)', borderRadius: 20, padding: '6px 20px', marginBottom: 24 }}>
        <span style={{ color: '#fbbf24', fontSize: 14, fontWeight: 700 }}>STAP 2 van 3</span>
      </div>

      <h2 style={{ color: '#f8fafc', fontSize: 40, fontWeight: 900, textAlign: 'center', margin: 0, marginBottom: 32 }}>
        Digitale 3D-dakmeting in seconden
      </h2>

      {/* 3D dak mockup */}
      <div style={{ transform: `scale(${dakScale})`, position: 'relative', width: 500, height: 260 }}>
        {/* Dak svg */}
        <svg viewBox="0 0 500 260" style={{ width: '100%', height: '100%' }}>
          {/* Dak vlakken */}
          <polygon points="250,20 480,140 480,240 20,240 20,140" fill="rgba(30,58,95,0.9)" stroke="rgba(245,158,11,0.6)" strokeWidth="2" />
          <polygon points="250,20 480,140 20,140" fill="rgba(15,30,60,0.95)" stroke="rgba(245,158,11,0.8)" strokeWidth="2" />
          {/* Nok */}
          <line x1="250" y1="20" x2="250" y2="140" stroke="rgba(245,158,11,0.9)" strokeWidth="2" strokeDasharray="8 4" />
          {/* Scan lijn */}
          <line
            x1="20"
            y1={20 + (scanProgress / 100) * 220}
            x2="480"
            y2={20 + (scanProgress / 100) * 220}
            stroke="#38bdf8"
            strokeWidth="2"
            opacity={scanProgress < 100 ? 1 : 0}
          />
          {/* Grid overlay */}
          {[60, 120, 180, 240, 300, 360, 420].map((x) => (
            <line key={x} x1={x} y1="20" x2={x} y2="240" stroke="rgba(56,189,248,0.1)" strokeWidth="1" />
          ))}
          {[60, 100, 140, 180, 220].map((y) => (
            <line key={y} x1="20" y1={y} x2="480" y2={y} stroke="rgba(56,189,248,0.1)" strokeWidth="1" />
          ))}
        </svg>

        {/* Meetpunten */}
        {measures.map((m) => (
          <div key={m.label} style={{ position: 'absolute', left: m.x, top: m.y, opacity: measureOpacity, background: 'rgba(245, 158, 11, 0.9)', borderRadius: 8, padding: '4px 10px', fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
            {m.label}: {m.value}
          </div>
        ))}
      </div>

      {/* Voortgangsbalk */}
      <div style={{ marginTop: 24, width: '100%', maxWidth: 500 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: 'rgba(248,250,252,0.6)', fontSize: 13 }}>Satellietdata verwerken...</span>
          <span style={{ color: '#fbbf24', fontSize: 13, fontWeight: 700 }}>{Math.round(scanProgress)}%</span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 999, height: 6 }}>
          <div style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderRadius: 999, height: '100%', width: `${scanProgress}%`, transition: 'width 0.1s' }} />
        </div>
      </div>
    </div>
  )
}
