import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'

export function Scene4Offerte() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' })
  const docScale = spring({ frame, fps, config: { damping: 12, stiffness: 70 }, from: 0.7, to: 1 })
  const checkOpacity = interpolate(frame, [40, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const lines = [
    { label: 'Dakoppervlakte', value: '127 m²' },
    { label: 'Type werk', value: 'Daklekkage herstelling' },
    { label: 'Materialen', value: 'Belgische leien' },
    { label: 'Garantie', value: '10 jaar' },
    { label: 'Totaalprijs (excl. BTW)', value: '€ 3.840' },
  ]

  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity, fontFamily: 'Inter, system-ui, sans-serif', padding: '40px 80px' }}>

      <div style={{ background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.5)', borderRadius: 20, padding: '6px 20px', marginBottom: 24 }}>
        <span style={{ color: '#fbbf24', fontSize: 14, fontWeight: 700 }}>STAP 3 van 3</span>
      </div>

      <h2 style={{ color: '#f8fafc', fontSize: 40, fontWeight: 900, textAlign: 'center', margin: 0, marginBottom: 36 }}>
        Uw gepersonaliseerde offerte
      </h2>

      {/* PDF document mockup */}
      <div style={{ transform: `scale(${docScale})`, background: 'white', borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 480, boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid #f1f5f9' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#1e3a5f' }}>Dakwerken OV</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Offerte #2026-042</div>
          </div>
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '4px 12px', fontSize: 13, color: '#c2410c', fontWeight: 700 }}>
            Geldig 30 dagen
          </div>
        </div>

        {/* Lijnen */}
        {lines.map((line, i) => {
          const lineOpacity = interpolate(frame, [20 + i * 8, 35 + i * 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          return (
            <div key={line.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', opacity: lineOpacity }}>
              <span style={{ color: '#475569', fontSize: 14 }}>{line.label}</span>
              <span style={{ color: '#1e293b', fontSize: 14, fontWeight: 600 }}>{line.value}</span>
            </div>
          )
        })}

        {/* Totaal */}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#1e3a5f', borderRadius: 10, opacity: checkOpacity }}>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: 700 }}>TOTAAL (incl. 6% BTW)</span>
          <span style={{ color: '#fbbf24', fontSize: 18, fontWeight: 900 }}>€ 4.070</span>
        </div>
      </div>

      {/* Check animatie */}
      <div style={{ marginTop: 24, opacity: checkOpacity, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✓</div>
        <span style={{ color: '#86efac', fontWeight: 700 }}>Verzonden naar uw e-mailadres</span>
      </div>
    </div>
  )
}
