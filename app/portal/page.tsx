'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'

interface Empresa {
  id: string
  razon_social: string
  rfc: string
  status: string
  created_at: string
  giro: string
  notas: string
}

interface Notificacion {
  id: string
  tipo: string
  titulo: string
  mensaje: string
  leida: boolean
  created_at: string
}

export default function PortalEmpresa() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [notifs, setNotifs] = useState<Notificacion[]>([])
  const [profile, setProfile] = useState<{ nombre: string; email: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'status' | 'notificaciones' | 'onboarding'>('status')
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: p } = await supabase.from('profiles').select('nombre, email, empresa_id').eq('id', user.id).single()
    setProfile(p)

    if (p?.empresa_id) {
      const { data: e } = await supabase.from('kyc_empresas').select('*').eq('id', p.empresa_id).single()
      setEmpresa(e)

      const { data: n } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setNotifs(n || [])
    }
    setLoading(false)
  }

  const marcarLeida = async (id: string) => {
    await supabase.from('notificaciones').update({ leida: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const statusConfig: Record<string, { color: string; label: string; desc: string }> = {
    pending: { color: '#FFAA00', label: 'Pendiente de revisión', desc: 'Tu solicitud fue recibida. Nuestro equipo la revisará pronto.' },
    in_review: { color: '#4A9EFF', label: 'En revisión', desc: 'Tu expediente está siendo analizado por nuestro equipo de compliance.' },
    approved: { color: '#00FF88', label: 'Aprobado', desc: '¡Tu empresa ha sido verificada y aprobada exitosamente!' },
    rejected: { color: '#FF3232', label: 'Requiere atención', desc: 'Tu solicitud necesita información adicional. Revisa las notas.' },
  }

  const noLeidas = notifs.filter(n => !n.leida).length
  const s = styles

  return (
    <div style={s.container}>
      <div style={s.grid} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '800px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ color: '#F0F0F0', fontSize: '1.4rem', fontWeight: '400', margin: '0 0 0.25rem' }}>
              crowdlink<span style={{ color: '#00FF88' }}>—</span>compliance
            </h1>
            <p style={{ color: '#4A5568', fontSize: '0.75rem', margin: 0 }}>
              {profile?.nombre || profile?.email}
            </p>
          </div>
          <button onClick={handleLogout} style={s.secondaryBtn}>Salir</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { id: 'status', label: 'Mi Status' },
            { id: 'notificaciones', label: `Notificaciones${noLeidas > 0 ? ` (${noLeidas})` : ''}` },
            { id: 'onboarding', label: empresa ? 'Mi Expediente' : 'Iniciar Registro' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)} style={{
              background: 'transparent', border: 'none',
              padding: '0.75rem 1.25rem', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '0.8rem', letterSpacing: '0.08em',
              color: tab === t.id ? '#00FF88' : '#4A5568',
              borderBottom: tab === t.id ? '2px solid #00FF88' : '2px solid transparent',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#2D3748', fontSize: '0.8rem' }}>Cargando...</div>
        ) : (
          <>
            {/* STATUS TAB */}
            {tab === 'status' && (
              <div>
                {!empresa ? (
                  <div style={{ ...s.card, textAlign: 'center', padding: '3rem' }}>
                    <div style={{ color: '#4A5568', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                      Aún no has iniciado tu registro de empresa.
                    </div>
                    <button onClick={() => setTab('onboarding')} style={s.primaryBtn}>
                      → Iniciar Registro
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Status card */}
                    <div style={{
                      ...s.card,
                      border: `1px solid ${statusConfig[empresa.status]?.color}33`,
                      marginBottom: '1rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{
                          width: '12px', height: '12px', borderRadius: '50%',
                          background: statusConfig[empresa.status]?.color,
                          boxShadow: `0 0 16px ${statusConfig[empresa.status]?.color}`,
                        }} />
                        <span style={{ color: statusConfig[empresa.status]?.color, fontSize: '0.9rem' }}>
                          {statusConfig[empresa.status]?.label}
                        </span>
                      </div>
                      <p style={{ color: '#4A5568', fontSize: '0.8rem', margin: '0 0 1.5rem', lineHeight: 1.7 }}>
                        {statusConfig[empresa.status]?.desc}
                      </p>
                      {empresa.notas && (
                        <div style={{
                          background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.2)',
                          borderRadius: '8px', padding: '0.75rem 1rem',
                        }}>
                          <div style={{ color: '#FFAA00', fontSize: '0.7rem', letterSpacing: '0.1em', marginBottom: '0.35rem' }}>NOTA DEL EQUIPO</div>
                          <div style={{ color: '#F0F0F0', fontSize: '0.8rem' }}>{empresa.notas}</div>
                        </div>
                      )}
                    </div>

                    {/* Empresa info */}
                    <div style={s.card}>
                      <div style={{ color: '#2D3748', fontSize: '0.65rem', letterSpacing: '0.15em', marginBottom: '1rem' }}>DATOS DE LA EMPRESA</div>
                      {[
                        { label: 'Razón Social', value: empresa.razon_social },
                        { label: 'RFC', value: empresa.rfc },
                        { label: 'Giro', value: empresa.giro || '—' },
                        { label: 'Registrada', value: new Date(empresa.created_at).toLocaleDateString('es-MX') },
                      ].map(row => (
                        <div key={row.label} style={{
                          display: 'flex', justifyContent: 'space-between',
                          padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}>
                          <span style={{ color: '#4A5568', fontSize: '0.8rem' }}>{row.label}</span>
                          <span style={{ color: '#F0F0F0', fontSize: '0.8rem' }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* NOTIFICACIONES TAB */}
            {tab === 'notificaciones' && (
              <div>
                {notifs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#2D3748', fontSize: '0.8rem' }}>
                    Sin notificaciones
                  </div>
                ) : notifs.map(n => (
                  <div key={n.id} onClick={() => !n.leida && marcarLeida(n.id)} style={{
                    ...s.card, marginBottom: '0.75rem', cursor: n.leida ? 'default' : 'pointer',
                    opacity: n.leida ? 0.6 : 1,
                    border: `1px solid ${n.leida ? 'rgba(255,255,255,0.06)' : 'rgba(0,255,136,0.15)'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{
                        color: n.tipo === 'aprobado' ? '#00FF88' : n.tipo === 'rechazado' ? '#FF6060' : n.tipo === 'accion' ? '#FFAA00' : '#4A9EFF',
                        fontSize: '0.75rem', letterSpacing: '0.1em',
                      }}>
                        {n.titulo}
                      </span>
                      <span style={{ color: '#2D3748', fontSize: '0.7rem' }}>
                        {new Date(n.created_at).toLocaleDateString('es-MX')}
                      </span>
                    </div>
                    <p style={{ color: '#F0F0F0', fontSize: '0.8rem', margin: 0, lineHeight: 1.6 }}>{n.mensaje}</p>
                    {!n.leida && (
                      <div style={{ color: '#4A5568', fontSize: '0.65rem', marginTop: '0.5rem' }}>Click para marcar como leída</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ONBOARDING TAB */}
            {tab === 'onboarding' && (
              <div style={{ ...s.card, textAlign: 'center', padding: '3rem' }}>
                {empresa ? (
                  <div>
                    <div style={{ color: '#00FF88', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Expediente registrado</div>
                    <div style={{ color: '#4A5568', fontSize: '0.8rem' }}>
                      Tu empresa fue registrada el {new Date(empresa.created_at).toLocaleDateString('es-MX')}.<br />
                      Para actualizaciones, contacta a tu gestor.
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ color: '#F0F0F0', marginBottom: '1rem', fontSize: '0.9rem' }}>Inicia tu proceso KYC</div>
                    <div style={{ color: '#4A5568', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                      Registra los datos de tu empresa para comenzar el proceso de verificación.
                    </div>
                    <a href="/hub" style={{ ...s.primaryBtn, textDecoration: 'none', display: 'inline-block' }}>
                      → Ir al Wizard de Registro
                    </a>
                  </div>
                )}
              </div>
            )}
          </>
        )}
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
  card: {
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px', padding: '1.5rem',
  },
  primaryBtn: {
    background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)',
    color: '#00FF88', padding: '0.75rem 1.5rem', borderRadius: '8px',
    cursor: 'pointer', fontSize: '0.8rem', letterSpacing: '0.1em', fontFamily: 'inherit',
  },
  secondaryBtn: {
    background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
    color: '#4A5568', padding: '0.5rem 1rem', borderRadius: '6px',
    cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '0.08em', fontFamily: 'inherit',
  },
}
