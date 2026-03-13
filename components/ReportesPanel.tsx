'use client'

export default function ReportesPanel({ onBack }: { onBack: () => void }) {
  const reportes = [
    { clave: 'R01', nombre: 'Operaciones Relevantes', periodicidad: 'Mensual', entidad: 'UIF' },
    { clave: 'R10', nombre: 'Operaciones Inusuales', periodicidad: 'Inmediato', entidad: 'UIF' },
    { clave: 'R27', nombre: 'Operaciones Internas Preocupantes', periodicidad: 'Inmediato', entidad: 'UIF' },
    { clave: 'CNBV-01', nombre: 'Cartera de Crédito', periodicidad: 'Mensual', entidad: 'CNBV' },
  ]

  const s = styles

  return (
    <div style={s.container}>
      <div style={s.grid} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '900px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
          <button onClick={onBack} style={s.backBtn}>← HUB</button>
          <div>
            <h2 style={s.title}>Reportes Regulatorios</h2>
            <p style={s.subtitle}>CNBV · UIF · SAT</p>
          </div>
          <div style={{
            marginLeft: 'auto',
            background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.3)',
            borderRadius: '6px', padding: '0.4rem 0.8rem',
            color: '#FFAA00', fontSize: '0.7rem', letterSpacing: '0.15em',
          }}>
            API EN CONSTRUCCIÓN
          </div>
        </div>

        <div style={{
          background: 'rgba(255,170,0,0.03)', border: '1px solid rgba(255,170,0,0.15)',
          borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem',
        }}>
          <p style={{ color: '#4A5568', fontSize: '0.8rem', lineHeight: 1.8, margin: 0 }}>
            Este módulo conectará con la API de reportes regulatorios de la CNBV y UIF.<br />
            Los reportes se generarán automáticamente a partir de las operaciones registradas en el sistema.
          </p>
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {reportes.map(r => (
            <div key={r.clave} style={{
              display: 'flex', alignItems: 'center', gap: '1.5rem',
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px', padding: '1.25rem 1.5rem',
              opacity: 0.5,
            }}>
              <div style={{
                background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.2)',
                borderRadius: '6px', padding: '0.3rem 0.6rem',
                color: '#FFAA00', fontSize: '0.7rem', letterSpacing: '0.1em', whiteSpace: 'nowrap',
              }}>
                {r.clave}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#F0F0F0', fontSize: '0.85rem' }}>{r.nombre}</div>
                <div style={{ color: '#4A5568', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  {r.entidad} · {r.periodicidad}
                </div>
              </div>
              <div style={{
                color: '#2D3748', fontSize: '0.7rem', letterSpacing: '0.1em',
                border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px',
                padding: '0.3rem 0.6rem',
              }}>
                PRÓXIMAMENTE
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '2rem', textAlign: 'center', color: '#2D3748', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
          ¿Necesitas un reporte específico? Contáctanos para priorizar.
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh', background: '#0A0C10',
    fontFamily: "'DM Mono', 'Fira Code', monospace",
    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem',
  },
  grid: {
    position: 'fixed', inset: 0, zIndex: 0,
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
  },
  backBtn: {
    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
    color: '#4A5568', padding: '0.4rem 0.8rem', borderRadius: '6px',
    cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.1em', fontFamily: 'inherit',
  },
  title: { color: '#F0F0F0', fontSize: '1.4rem', fontWeight: '400', margin: 0 },
  subtitle: { color: '#4A5568', fontSize: '0.7rem', letterSpacing: '0.15em', margin: '0.25rem 0 0' },
}
