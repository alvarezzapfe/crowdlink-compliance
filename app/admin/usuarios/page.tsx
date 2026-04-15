'use client'
import { useState, useEffect, useRef } from 'react'
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

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'compliance_officer', label: 'Compliance Officer' },
  { value: 'readonly', label: 'Solo lectura' },
]

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  pending:  { color: '#D97706', bg: '#FFFBEB', label: 'Pendiente' },
  accepted: { color: '#059669', bg: '#ECFDF5', label: 'Aceptada' },
  expired:  { color: '#94A3B8', bg: '#F1F5F9', label: 'Expirada' },
  revoked:  { color: '#EF4444', bg: '#FEF2F2', label: 'Revocada' },
}

function Avatar({ name, email, roleColor }: { name: string | null; email: string; roleColor: string }) {
  const letter = (name || email)[0].toUpperCase()
  return (
    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: roleColor + '22', border: `1.5px solid ${roleColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color: roleColor, fontWeight: '700', fontSize: '0.88rem' }}>{letter}</span>
    </div>
  )
}

function Badge({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span style={{ background: bg, color, fontSize: '0.6rem', fontWeight: '700', padding: '0.15rem 0.5rem', borderRadius: '5px', letterSpacing: '0.04em' }}>{children}</span>
  )
}

function ActionMenu({ user, token, onRefresh, isSelf }: { user: Usuario; token: string; onRefresh: () => void; isSelf: boolean }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function doAction(action: string, label: string, confirm_msg?: string) {
    if (confirm_msg && !confirm(confirm_msg)) return
    setLoading(action); setOpen(false)
    try {
      if (action === 'toggle') {
        await fetch('/api/admin/usuarios', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ user_id: user.id, activo: !user.activo }),
        })
      } else if (action === 'reset_password') {
        await fetch('/api/admin/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'reset_password', email: user.email }),
        })
      } else if (action === 'reset_totp') {
        await fetch('/api/admin/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'reset_totp', user_id: user.id }),
        })
      } else if (action === 'delete') {
        await fetch('/api/admin/usuarios', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ user_id: user.id }),
        })
      }
      setToast(label + ' exitoso')
      setTimeout(() => setToast(null), 2500)
      onRefresh()
    } finally {
      setLoading(null)
    }
  }

  if (user.role === 'super_admin') return <span style={{ color: cl.gray300, fontSize: '0.72rem', fontStyle: 'italic', paddingRight: '0.5rem' }}>Super Admin</span>

  const menuItems = [
    { id: 'toggle', label: user.activo ? '⏸ Desactivar acceso' : '▶ Activar acceso', danger: user.activo },
    { id: 'reset_password', label: '🔑 Enviar reset de contraseña', danger: false },
    { id: 'reset_totp', label: '📱 Resetear 2FA', danger: false, confirm: `¿Resetear el 2FA de ${user.email}? Deberá configurarlo de nuevo.` },
    { id: 'delete', label: '🗑 Eliminar usuario', danger: true, confirm: `¿Eliminar permanentemente a ${user.email}? Esta acción no se puede deshacer.` },
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', background: '#0F172A', color: '#fff', padding: '0.65rem 1.25rem', borderRadius: '10px', fontSize: '0.82rem', fontWeight: '500', zIndex: 999, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          ✓ {toast}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        disabled={!!loading}
        style={{ background: open ? cl.gray100 : 'transparent', border: `1px solid ${open ? cl.gray300 : cl.gray200}`, borderRadius: '8px', padding: '0.35rem 0.6rem', cursor: 'pointer', color: cl.gray500, fontSize: '1rem', lineHeight: 1, transition: 'all 0.15s' }}
      >
        {loading ? '···' : '⋯'}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '210px', overflow: 'hidden' }}>
          <div style={{ padding: '0.4rem 0.75rem', borderBottom: `1px solid ${cl.gray100}` }}>
            <p style={{ color: cl.gray400, fontSize: '0.68rem', fontWeight: '600', margin: 0, letterSpacing: '0.05em' }}>ACCIONES</p>
          </div>
          {menuItems.map((item, i) => (
            <button
              key={item.id}
              onClick={() => doAction(item.id, item.label.replace(/^[^ ]+ /, ''), item.confirm)}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '0.6rem 1rem', fontSize: '0.8rem', color: item.danger ? '#EF4444' : cl.gray700, cursor: 'pointer', fontFamily: cl.fontFamily, borderTop: i === menuItems.length - 1 ? `1px solid ${cl.gray100}` : 'none', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = item.danger ? '#FEF2F2' : cl.gray50)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function UsuariosPage() {
  const [tab, setTab] = useState<'usuarios' | 'invitaciones'>('usuarios')
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [selfId, setSelfId] = useState('')
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
      if (session?.access_token) {
        setToken(session.access_token)
        setSelfId(session.user.id)
        loadData(session.access_token)
      }
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

  async function handleRoleChange(user: Usuario, role: Role) {
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

  const pendientes = invitaciones.filter(i => i.status === 'pending').length

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: cl.fontFamily }}>
      {/* Header */}
      <div style={{ background: cl.white, borderBottom: `1px solid ${cl.gray200}`, padding: '0 2rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '20px', width: 'auto' }} />
          <span style={{ color: cl.gray300, fontSize: '0.9rem' }}>/</span>
          <a href="/gate" style={{ color: cl.gray400, fontSize: '0.8rem', fontWeight: '500', textDecoration: 'none' }}>Compliance Hub</a>
          <span style={{ color: cl.gray300, fontSize: '0.9rem' }}>/</span>
          <span style={{ color: cl.gray800, fontSize: '0.8rem', fontWeight: '600' }}>Usuarios</span>
        </div>
        <a href="/gate" style={{ color: cl.gray400, fontSize: '0.78rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          ← Volver al Hub
        </a>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3EE8A0' }} />
              <span style={{ color: cl.gray400, fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.08em' }}>GESTIÓN DE USUARIOS</span>
            </div>
            <h1 style={{ color: cl.gray900, fontSize: '1.6rem', fontWeight: '800', margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>Usuarios & Acceso</h1>
            <p style={{ color: cl.gray400, fontSize: '0.85rem', margin: 0 }}>Administra roles, permisos y credenciales del Compliance Hub</p>
          </div>
          <button
            onClick={() => { setShowInviteForm(v => !v); setInviteResult(null) }}
            style={{ ...sharedStyles.btnPrimary, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Invitar usuario
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
          {[
            { label: 'Total usuarios', value: usuarios.length, icon: '👥', color: '#3B82F6' },
            { label: 'Activos', value: usuarios.filter(u => u.activo).length, icon: '✅', color: '#059669' },
            { label: 'Invitaciones pendientes', value: pendientes, icon: '📨', color: '#D97706' },
          ].map(s => (
            <div key={s.label} style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '12px', padding: '1.1rem 1.4rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '1.4rem' }}>{s.icon}</div>
              <div>
                <p style={{ color: cl.gray400, fontSize: '0.7rem', fontWeight: '600', margin: '0 0 0.15rem', letterSpacing: '0.05em' }}>{s.label.toUpperCase()}</p>
                <p style={{ color: s.color, fontSize: '1.6rem', fontWeight: '800', margin: 0, lineHeight: 1 }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Invite form */}
        {showInviteForm && (
          <div style={{ background: cl.white, border: `1.5px solid ${cl.blue}22`, borderRadius: '14px', padding: '1.75rem', marginBottom: '1.5rem', boxShadow: `0 0 0 4px ${cl.blue}08` }}>
            {inviteResult ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p style={{ color: cl.gray800, fontWeight: '700', fontSize: '0.95rem', margin: '0 0 0.4rem' }}>Invitación enviada a {inviteResult.email}</p>
                <p style={{ color: cl.gray400, fontSize: '0.8rem', margin: '0 0 1.25rem' }}>También puedes compartir el link directamente:</p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                  <code style={{ background: cl.gray50, border: `1px solid ${cl.gray200}`, padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.72rem', color: cl.gray600, maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                    {inviteResult.url}
                  </code>
                  <button onClick={() => { navigator.clipboard.writeText(inviteResult.url); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }}
                    style={{ background: copiado ? '#ECFDF5' : cl.blueLight, color: copiado ? '#059669' : cl.blue, border: `1px solid ${copiado ? '#A7F3D0' : '#BFDBFE'}`, borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
                    {copiado ? '✓ Copiado' : '🔗 Copiar link'}
                  </button>
                </div>
                <button onClick={() => { setShowInviteForm(false); setInviteResult(null) }} style={{ marginTop: '1.25rem', ...sharedStyles.btnGhost, fontSize: '0.82rem' }}>Cerrar</button>
              </div>
            ) : (
              <div>
                <h3 style={{ color: cl.gray800, fontSize: '0.95rem', fontWeight: '700', margin: '0 0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cl.blue} strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Nueva invitación
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr auto', gap: '0.85rem', alignItems: 'end' }}>
                  <div>
                    <label style={sharedStyles.label}>Email *</label>
                    <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleInvitar()} placeholder="usuario@empresa.com" type="email" style={sharedStyles.input} />
                  </div>
                  <div>
                    <label style={sharedStyles.label}>Nombre</label>
                    <input value={inviteNombre} onChange={e => setInviteNombre(e.target.value)} placeholder="Nombre completo" style={sharedStyles.input} />
                  </div>
                  <div>
                    <label style={sharedStyles.label}>Rol *</label>
                    <select value={inviteRole} onChange={e => setInviteRole(e.target.value as Role)} style={{ ...sharedStyles.input, appearance: 'auto' }}>
                      {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setShowInviteForm(false)} style={{ ...sharedStyles.btnGhost, padding: '0.5rem 0.75rem' }}>✕</button>
                    <button onClick={handleInvitar} disabled={!inviteEmail || inviteLoading}
                      style={{ ...sharedStyles.btnPrimary, opacity: (!inviteEmail || inviteLoading) ? 0.5 : 1, fontSize: '0.82rem' }}>
                      {inviteLoading ? '···' : 'Invitar →'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '1rem', background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '10px', padding: '0.3rem', width: 'fit-content' }}>
          {(['usuarios', 'invitaciones'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ background: tab === t ? cl.blue : 'transparent', color: tab === t ? cl.white : cl.gray500, border: 'none', borderRadius: '7px', padding: '0.45rem 1.1rem', fontSize: '0.8rem', fontWeight: tab === t ? '600' : '400', cursor: 'pointer', fontFamily: cl.fontFamily, transition: 'all 0.15s' }}>
              {t === 'usuarios' ? `Usuarios (${usuarios.length})` : `Invitaciones${pendientes > 0 ? ` (${pendientes} pendientes)` : ''}`}
            </button>
          ))}
        </div>

        {/* Usuarios table */}
        {tab === 'usuarios' && (
          <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '14px', overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr auto', gap: '1rem', padding: '0.65rem 1.5rem', background: cl.gray50, borderBottom: `1px solid ${cl.gray200}` }}>
              {['Usuario', 'Rol', 'Estado', 'Último acceso', 'Miembro desde', ''].map((h, i) => (
                <span key={i} style={{ color: cl.gray400, fontSize: '0.68rem', fontWeight: '700', letterSpacing: '0.06em' }}>{h.toUpperCase()}</span>
              ))}
            </div>
            {loading
              ? <div style={{ padding: '3rem', textAlign: 'center', color: cl.gray300 }}>Cargando…</div>
              : usuarios.map((u, idx) => {
                  const rolCfg = ROLE_COLORS[u.role] || ROLE_COLORS.readonly
                  const isSelf = u.id === selfId
                  return (
                    <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr auto', gap: '1rem', padding: '0.9rem 1.5rem', borderBottom: idx < usuarios.length - 1 ? `1px solid ${cl.gray50}` : 'none', alignItems: 'center', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {/* Usuario */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <Avatar name={u.nombre} email={u.email} roleColor={rolCfg.color} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ color: cl.gray800, fontWeight: '600', fontSize: '0.85rem', margin: '0 0 0.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {u.nombre ? `${u.nombre} ${u.apellidos || ''}`.trim() : u.email}
                            {isSelf && <span style={{ background: '#EFF6FF', color: '#3B82F6', fontSize: '0.58rem', fontWeight: '700', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>TÚ</span>}
                          </p>
                          {u.nombre && <p style={{ color: cl.gray400, fontSize: '0.72rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>}
                        </div>
                      </div>
                      {/* Rol */}
                      <div>
                        {u.role !== 'super_admin' ? (
                          <select value={u.role} onChange={e => handleRoleChange(u, e.target.value as Role)}
                            style={{ background: rolCfg.bg, color: rolCfg.color, border: `1px solid ${rolCfg.color}33`, borderRadius: '7px', padding: '0.3rem 0.5rem', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer', fontFamily: cl.fontFamily, width: '100%' }}>
                            {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        ) : (
                          <Badge color={rolCfg.color} bg={rolCfg.bg}>SUPER ADMIN</Badge>
                        )}
                      </div>
                      {/* Estado */}
                      <div>
                        <Badge color={u.activo ? '#059669' : '#EF4444'} bg={u.activo ? '#ECFDF5' : '#FEF2F2'}>
                          {u.activo ? '● ACTIVO' : '○ INACTIVO'}
                        </Badge>
                      </div>
                      {/* Último acceso */}
                      <span style={{ color: cl.gray500, fontSize: '0.75rem' }}>
                        {u.last_login ? new Date(u.last_login).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </span>
                      {/* Miembro desde */}
                      <span style={{ color: cl.gray400, fontSize: '0.75rem' }}>
                        {new Date(u.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      {/* Acciones */}
                      <ActionMenu user={u} token={token} onRefresh={() => loadData(token)} isSelf={isSelf} />
                    </div>
                  )
                })}
          </div>
        )}

        {/* Invitaciones table */}
        {tab === 'invitaciones' && (
          <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '1rem', padding: '0.65rem 1.5rem', background: cl.gray50, borderBottom: `1px solid ${cl.gray200}` }}>
              {['Email', 'Rol', 'Estado', 'Expira', ''].map((h, i) => (
                <span key={i} style={{ color: cl.gray400, fontSize: '0.68rem', fontWeight: '700', letterSpacing: '0.06em' }}>{h.toUpperCase()}</span>
              ))}
            </div>
            {loading
              ? <div style={{ padding: '3rem', textAlign: 'center', color: cl.gray300 }}>Cargando…</div>
              : invitaciones.length === 0
                ? <div style={{ padding: '3rem', textAlign: 'center' }}><p style={{ color: cl.gray300, margin: 0, fontSize: '0.85rem' }}>No hay invitaciones registradas</p></div>
                : invitaciones.map((inv, idx) => {
                    const st = STATUS_STYLE[inv.status]
                    const rolCfg = ROLE_COLORS[inv.role] || ROLE_COLORS.readonly
                    return (
                      <div key={inv.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '1rem', padding: '0.9rem 1.5rem', borderBottom: idx < invitaciones.length - 1 ? `1px solid ${cl.gray50}` : 'none', alignItems: 'center' }}>
                        <div>
                          <p style={{ color: cl.gray800, fontWeight: '600', fontSize: '0.85rem', margin: '0 0 0.1rem' }}>{inv.email}</p>
                          {inv.nombre && <p style={{ color: cl.gray400, fontSize: '0.72rem', margin: 0 }}>{inv.nombre}</p>}
                        </div>
                        <Badge color={rolCfg.color} bg={rolCfg.bg}>{ROLE_LABELS[inv.role]}</Badge>
                        <Badge color={st.color} bg={st.bg}>{st.label.toUpperCase()}</Badge>
                        <span style={{ color: cl.gray400, fontSize: '0.75rem' }}>
                          {inv.status === 'pending' ? new Date(inv.expires_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '—'}
                        </span>
                        {inv.status === 'pending' && (
                          <button onClick={() => handleRevocarInvite(inv.id)}
                            style={{ background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA', borderRadius: '7px', padding: '0.3rem 0.7rem', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer' }}>
                            Revocar
                          </button>
                        )}
                        {inv.status !== 'pending' && <span />}
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
