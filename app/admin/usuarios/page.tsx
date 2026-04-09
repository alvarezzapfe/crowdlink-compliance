'use client'
import { useState, useEffect } from 'react'
import { cl, sharedStyles } from '@/lib/design'
import { ROLE_LABELS, ROLE_COLORS, type Role } from '@/lib/permissions'
import { createClient } from '@/lib/supabase-client'

interface Usuario {
  id: string; email: string; nombre: string | null; apellidos: string | null
  role: Role; activo: boolean; last_login: string | null; created_at: string
}
interface Invitacion {
  id: string; email: string; nombre: string | null; role: Role
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  created_at: string; expires_at: string
}

export default function UsuariosPage() {
  const [tab, setTab] = useState<'usuarios' | 'invitaciones'>('usuarios')
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteNombre, setInviteNombre] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('readonly')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ url: string; email: string } | null>(null)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) { setToken(session.access_token); loadData(session.access_token) }
    })
  }, [])

  async function loadData(t: string) {
    setLoading(true)
    const [uRes, iRes] = await Promise.all([
      fetch('/api/admin/usuarios', { headers: { Authorization: `Bearer ${t}` } }),
      fetch('/api/admin/invitaciones', { headers: { Authorization: `Bearer ${t}` } }),
    ])
    if (uRes.ok) { const d = await uRes.json(); setUsuarios(d.usuarios || []) }
    if (iRes.ok) { const d = await iRes.json(); setInvitaciones(d.invitaciones || []) }
    setLoading(false)
  }

  async function handleInvitar() {
    if (!inviteEmail || !inviteRole) return
    setInviteLoading(true)
    const res = await fetch('/api/admin/invitaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: inviteEmail, nombre: inviteNombre, role: inviteRole }),
    })
    const data = await res.json()
    setInviteLoading(false)
    if (res.ok) { setInviteResult({ url: data.register_url, email: inviteEmail }); setInviteEmail(''); setInviteNombre(''); loadData(token) }
    else alert('Error: ' + data.error)
  }

  async function handleToggleActivo(user: Usuario) {
    await fetch('/api/admin/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: user.id, activo: !user.activo }),
    })
    loadData(token)
  }

  async function handleCambiarRol(user: Usuario, role: Role) {
    await fetch('/api/admin/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: user.id, role }),
    })
    loadData(token)
  }

  async function handleRevocarInvite(id: string) {
    if (!confirm('¿Revocar esta invitación?')) return
    await fetch('/api/admin/invitaciones', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    })
    loadData(token)
  }

  const statusInvStyle: Record<string, { color: string; bg: string; label: string }> = {
    pending:  { color: '#D97706', bg: '#FFFBEB', label: 'Pendiente' },
    accepted: { color: '#059669', bg: '#ECFDF5', label: 'Aceptada' },
    expired:  { color: '#64748B', bg: '#F1F5F9', label: 'Expirada' },
    revoked:  { color: '#EF4444', bg: '#FEF2F2', label: 'Revocada' },
  }

  return (
    <div style={{ minHeight: '100vh', background: cl.gray50, fontFamily: cl.fontFamily }}>
      <div style={{ background: cl.white, borderBottom: `1px solid ${cl.gray200}`, padding: '0 2rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '22px', width: 'auto' }} />
          <div style={{ width: '1px', height: '18px', background: cl.gray200 }} />
          <a href="/gate" style={{ color: cl.gray400, fontSize: '0.82rem', fontWeight: '500', textDecoration: 'none' }}>Compliance Hub</a>
          <span style={{ color: cl.gray300 }}>/</span>
          <span style={{ color: cl.gray700, fontSize: '0.82rem', fontWeight: '600' }}>Usuarios</span>
        </div>
      </div>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3EE8A0' }} />
            <span style={{ color: cl.gray500, fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.06em' }}>GESTIÓN DE USUARIOS</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ color: cl.gray900, fontSize: '1.75rem', fontWeight: '800', margin: '0 0 0.3rem', letterSpacing: '-0.02em' }}>Usuarios</h1>
              <p style={{ color: cl.gray500, fontSize: '0.9rem', margin: 0 }}>Gestiona acceso y roles del Compliance Hub</p>
            </div>
            <button onClick={() => { setShowInviteForm(true); setInviteResult(null) }} style={{ ...sharedStyles.btnPrimary, fontSize: '0.85rem' }}>+ Invitar usuario</button>
          </div>
        </div>
        {showInviteForm && (
          <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '14px', padding: '1.75rem', marginBottom: '1.5rem' }}>
            {inviteResult ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p style={{ color: cl.gray800, fontWeight: '600', fontSize: '0.95rem', margin: '0 0 0.5rem' }}>Invitación enviada a {inviteResult.email}</p>
                <p style={{ color: cl.gray400, fontSize: '0.8rem', margin: '0 0 1rem' }}>También puedes compartir el link directamente:</p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                  <code style={{ background: cl.gray100, padding: '0.5rem 0.75rem', borderRadius: '7px', fontSize: '0.72rem', color: cl.gray600, maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                    {inviteResult.url}
                  </code>
                  <button onClick={() => { navigator.clipboard.writeText(inviteResult.url); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }}
                    style={{ background: cl.blueLight, color: cl.blue, border: `1px solid #BFDBFE`, borderRadius: '7px', padding: '0.5rem 0.85rem', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' }}>
                    {copiado ? '✓ Copiado' : '🔗 Copiar'}
                  </button>
                </div>
                <button onClick={() => { setShowInviteForm(false); setInviteResult(null) }} style={{ marginTop: '1.25rem', ...sharedStyles.btnGhost, fontSize: '0.82rem' }}>Cerrar</button>
              </div>
            ) : (
              <div>
                <h3 style={{ color: cl.gray800, fontSize: '1rem', fontWeight: '700', margin: '0 0 1.25rem' }}>Nueva invitación</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.85rem', alignItems: 'end' }}>
                  <div>
                    <label style={sharedStyles.label}>Email *</label>
                    <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="usuario@empresa.com" type="email" style={sharedStyles.input} />
                  </div>
                  <div>
                    <label style={sharedStyles.label}>Nombre</label>
                    <input value={inviteNombre} onChange={e => setInviteNombre(e.target.value)} placeholder="Nombre" style={sharedStyles.input} />
                  </div>
                  <div>
                    <label style={sharedStyles.label}>Rol *</label>
                    <select value={inviteRole} onChange={e => setInviteRole(e.target.value as Role)} style={{ ...sharedStyles.input, appearance: 'auto' }}>
                      <option value="admin">Administrador</option>
                      <option value="compliance_officer">Compliance Officer</option>
                      <option value="readonly">Solo lectura</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setShowInviteForm(false)} style={sharedStyles.btnGhost}>✕</button>
                    <button onClick={handleInvitar} disabled={!inviteEmail || inviteLoading}
                      style={{ ...sharedStyles.btnPrimary, opacity: (!inviteEmail || inviteLoading) ? 0.5 : 1 }}>
                      {inviteLoading ? 'Enviando…' : 'Invitar →'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '10px', padding: '0.3rem', width: 'fit-content' }}>
          {(['usuarios', 'invitaciones'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ background: tab === t ? cl.blue : 'transparent', color: tab === t ? cl.white : cl.gray500, border: 'none', borderRadius: '7px', padding: '0.5rem 1.25rem', fontSize: '0.82rem', fontWeight: tab === t ? '600' : '400', cursor: 'pointer', fontFamily: cl.fontFamily, transition: 'all 0.15s' }}>
              {t === 'usuarios' ? `Usuarios (${usuarios.length})` : `Invitaciones (${invitaciones.filter(i => i.status === 'pending').length} pendientes)`}
            </button>
          ))}
        </div>

        {tab === 'usuarios' && (
          <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '14px', overflow: 'hidden' }}>
            {loading ? <div style={{ padding: '2rem', textAlign: 'center', color: cl.gray400 }}>Cargando…</div>
            : usuarios.map(u => {
              const rolCfg = ROLE_COLORS[u.role] || ROLE_COLORS.readonly
              return (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: `1px solid ${cl.gray50}`, gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: rolCfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: rolCfg.color, fontWeight: '700', fontSize: '0.9rem' }}>{(u.nombre || u.email)[0].toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                      <p style={{ color: cl.gray800, fontWeight: '600', fontSize: '0.88rem', margin: 0 }}>{u.nombre ? `${u.nombre} ${u.apellidos || ''}`.trim() : u.email}</p>
                      <span style={{ background: rolCfg.bg, color: rolCfg.color, fontSize: '0.62rem', fontWeight: '700', padding: '0.1rem 0.45rem', borderRadius: '4px' }}>{ROLE_LABELS[u.role]}</span>
                      <span style={{ background: u.activo ? '#ECFDF5' : '#FEF2F2', color: u.activo ? '#059669' : '#EF4444', fontSize: '0.62rem', fontWeight: '700', padding: '0.1rem 0.45rem', borderRadius: '4px' }}>{u.activo ? 'ACTIVO' : 'INACTIVO'}</span>
                    </div>
                    <p style={{ color: cl.gray400, fontSize: '0.72rem', margin: 0 }}>{u.nombre ? u.email : ''}{u.last_login ? ` · Último acceso: ${new Date(u.last_login).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}` : ' · Nunca ha accedido'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                    {u.role !== 'super_admin' && (
                      <select value={u.role} onChange={e => handleCambiarRol(u, e.target.value as Role)}
                        style={{ background: cl.gray50, border: `1px solid ${cl.gray200}`, borderRadius: '7px', padding: '0.35rem 0.5rem', fontSize: '0.72rem', color: cl.gray600, cursor: 'pointer', fontFamily: cl.fontFamily }}>
                        <option value="admin">Admin</option>
                        <option value="compliance_officer">Compliance Officer</option>
                        <option value="readonly">Solo lectura</option>
                      </select>
                    )}
                    {u.role !== 'super_admin' && (
                      <button onClick={() => handleToggleActivo(u)}
                        style={{ background: u.activo ? '#FEF2F2' : '#ECFDF5', color: u.activo ? '#EF4444' : '#059669', border: `1px solid ${u.activo ? '#FECACA' : '#A7F3D0'}`, borderRadius: '7px', padding: '0.35rem 0.75rem', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer' }}>
                        {u.activo ? 'Desactivar' : '✓ Activar'}
                      </button>
                    )}
                    {u.role === 'super_admin' && <span style={{ color: cl.gray400, fontSize: '0.72rem', fontStyle: 'italic' }}>Super Admin</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'invitaciones' && (
          <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '14px', overflow: 'hidden' }}>
            {loading ? <div style={{ padding: '2rem', textAlign: 'center', color: cl.gray400 }}>Cargando…</div>
            : invitaciones.length === 0 ? <div style={{ padding: '3rem', textAlign: 'center' }}><p style={{ color: cl.gray400, margin: 0 }}>No hay invitaciones</p></div>
            : invitaciones.map(inv => {
              const st = statusInvStyle[inv.status]
              const rolCfg = ROLE_COLORS[inv.role] || ROLE_COLORS.readonly
              return (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', padding: '0.9rem 1.5rem', borderBottom: `1px solid ${cl.gray50}`, gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                      <p style={{ color: cl.gray800, fontWeight: '600', fontSize: '0.88rem', margin: 0 }}>{inv.email}</p>
                      <span style={{ background: rolCfg.bg, color: rolCfg.color, fontSize: '0.62rem', fontWeight: '700', padding: '0.1rem 0.45rem', borderRadius: '4px' }}>{ROLE_LABELS[inv.role]}</span>
                      <span style={{ background: st.bg, color: st.color, fontSize: '0.62rem', fontWeight: '700', padding: '0.1rem 0.45rem', borderRadius: '4px' }}>{st.label.toUpperCase()}</span>
                    </div>
                    <p style={{ color: cl.gray400, fontSize: '0.72rem', margin: 0 }}>
                      {new Date(inv.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {inv.status === 'pending' && ` · Expira: ${new Date(inv.expires_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`}
                    </p>
                  </div>
                  {inv.status === 'pending' && (
                    <button onClick={() => handleRevocarInvite(inv.id)}
                      style={{ background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA', borderRadius: '7px', padding: '0.35rem 0.75rem', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer' }}>
                      Revocar
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>
    </div>
  )
}
