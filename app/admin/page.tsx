'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'

interface Empresa {
  id: string
  razon_social: string
  rfc: string
  tipo_persona: string
  giro: string
  status: string
  created_at: string
}

interface Metrics {
  total: number
  pending: number
  in_review: number
  approved: number
  rejected: number
}

export default function AdminDashboard() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [metrics, setMetrics] = useState<Metrics>({ total: 0, pending: 0, in_review: 0, approved: 0, rejected: 0 })
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ nombre: string; email: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from('profiles').select('nombre, email').eq('id', user.id).single()
      setProfile(p)
    }

    const { data } = await supabase.from('kyc_empresas').select('*').order('created_at', { ascending: false })
    if (data) {
      setEmpresas(data)
      setMetrics({
        total: data.length,
        pending: data.filter(e => e.status === 'pending').length,
        in_review: data.filter(e => e.status === 'in_review').length,
        approved: data.filter(e => e.status === 'approved').length,
        rejected: data.filter(e => e.status === 'rejected').length,
      })
    }
    setLoading(false)
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('kyc_empresas').update({ status }).eq('id', id)
    loadData()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const filtered = filter === 'all' ? empresas : empresas.filter(e => e.status === filter)

  const statusColor: Record<string, string> = {
    pending: '#FFAA00',
    in_review: '#4A9EFF',
    approved: '#00FF88',
    rejected: '#FF3232',
  }

  const statusLabel: Record<string, string> = {
    pending: 'Pendiente',
    in_review: 'En revisión',
    approved: 'Aprobado',
    rejected: 'Rechazado',
  }

  const s = styles

  return (
    <div style={s.container}>
      <div style={s.grid} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '1100px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00FF88', boxShadow: '0 0 12px #00FF88' }} />
              <span style={{ color: '#00FF88', fontSize: '0.7rem', letterSpacing: '0.2em' }}>SUPER ADMIN</span>
            </div>
            <h1 style={{ color: '#F0F0F0', fontSize: '1.6rem', fontWeight: '400', margin: '0 0 0.25rem' }}>
              crowdlink<span style={{ color: '#00FF88' }}>—</span>compliance
            </h1>
            <p style={{ color: '#4A5568', fontSize: '0.75rem', margin: 0 }}>
              {profile?.nombre || profile?.email}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <a href="/hub" style={{ ...s.secondaryBtn, textDecoration: 'none', display: 'inline-block' }}>
              Hub →
            </a>
            <button onClick={handleLogout} style={s.secondaryBtn}>Salir</button>
          </div>
        </div>

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'TOTAL', value: metrics.total, color: '#F0F0F0' },
            { label: 'PENDIENTES', value: metrics.pending, color: '#FFAA00' },
            { label: 'EN REVISIÓN', value: metrics.in_review, color: '#4A9EFF' },
            { label: 'APROBADOS', value: metrics.approved, color: '#00FF88' },
            { label: 'RECHAZADOS', value: metrics.rejected, color: '#FF3232' },
          ].map(m => (
            <div key={m.label} style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px', padding: '1.25rem',
            }}>
              <div style={{ color: '#2D3748', fontSize: '0.65rem', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>{m.label}</div>
              <div style={{ color: m.color, fontSize: '2rem', fontWeight: '400' }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {['all', 'pending', 'in_review', 'approved', 'rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? 'rgba(0,255,136,0.1)' : 'transparent',
              border: filter === f ? '1px solid rgba(0,255,136,0.3)' : '1px solid rgba(255,255,255,0.06)',
              borderRadius: '6px', padding: '0.4rem 0.8rem',
              color: filter === f ? '#00FF88' : '#4A5568',
              cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.08em',
              fontFamily: 'inherit',
            }}>
              {f === 'all' ? 'Todas' : statusLabel[f]}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1.2fr 1.5fr',
            background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1.25rem',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            {['Razón Social', 'RFC', 'Tipo', 'Giro', 'Status', 'Acciones'].map(h => (
              <span key={h} style={{ color: '#2D3748', fontSize: '0.65rem', letterSpacing: '0.12em' }}>{h}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#2D3748', fontSize: '0.8rem' }}>
              Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#2D3748', fontSize: '0.8rem' }}>
              Sin empresas registradas
            </div>
          ) : filtered.map((e, i) => (
            <div key={e.id} style={{
              display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1.2fr 1.5fr',
              padding: '1rem 1.25rem', alignItems: 'center',
              borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <span style={{ color: '#F0F0F0', fontSize: '0.85rem' }}>{e.razon_social}</span>
              <span style={{ color: '#4A5568', fontSize: '0.8rem', fontFamily: 'monospace' }}>{e.rfc}</span>
              <span style={{ color: '#4A5568', fontSize: '0.8rem' }}>{e.tipo_persona}</span>
              <span style={{ color: '#4A5568', fontSize: '0.8rem' }}>{e.giro || '—'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor[e.status], flexShrink: 0 }} />
                <span style={{ color: statusColor[e.status], fontSize: '0.75rem' }}>{statusLabel[e.status]}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {e.status !== 'approved' && (
                  <button onClick={() => updateStatus(e.id, 'approved')} style={{
                    background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)',
                    borderRadius: '4px', padding: '0.3rem 0.6rem', color: '#00FF88',
                    cursor: 'pointer', fontSize: '0.65rem', fontFamily: 'inherit',
                  }}>✓</button>
                )}
                {e.status !== 'in_review' && e.status !== 'approved' && (
                  <button onClick={() => updateStatus(e.id, 'in_review')} style={{
                    background: 'rgba(74,158,255,0.08)', border: '1px solid rgba(74,158,255,0.2)',
                    borderRadius: '4px', padding: '0.3rem 0.6rem', color: '#4A9EFF',
                    cursor: 'pointer', fontSize: '0.65rem', fontFamily: 'inherit',
                  }}>↺</button>
                )}
                {e.status !== 'rejected' && (
                  <button onClick={() => updateStatus(e.id, 'rejected')} style={{
                    background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)',
                    borderRadius: '4px', padding: '0.3rem 0.6rem', color: '#FF6060',
                    cursor: 'pointer', fontSize: '0.65rem', fontFamily: 'inherit',
                  }}>✕</button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '1rem', color: '#2D3748', fontSize: '0.7rem', textAlign: 'right' }}>
          {filtered.length} empresa(s) · Score Ekatena próximamente
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
  secondaryBtn: {
    background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
    color: '#4A5568', padding: '0.5rem 1rem', borderRadius: '6px',
    cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '0.08em', fontFamily: 'inherit',
  },
}
