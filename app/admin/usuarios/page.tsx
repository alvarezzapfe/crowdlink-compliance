'use client'
import { useState, useEffect, useRef } from 'react'
import { cl, sharedStyles } from '@/lib/design'
import { ROLE_LABELS, ROLE_COLORS, type Role } from '@/lib/permissions'
import { createClient } from '@/lib/supabase-client'

interface Usuario {
  id: string; email: string; nombre: string | null; apellidos: string | null
  role: Role; activo: boolean; last_login: string | null; created_at: string
  totp_verified: boolean
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

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string; label: string }> = {
  pending:  { color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', label: 'Pendiente' },
  accepted: { color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0', label: 'Aceptada' },
  expired:  { color: '#64748B', bg: '#F1F5F9', border: '#CBD5E1', label: 'Expirada' },
  revoked:  { color: '#991B1B', bg: '#FEF2F2', border: '#FECACA', label: 'Revocada' },
}

// ── Icons ────────────────────────────────────────────────────────────────────
const IcUser = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const IcKey = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
const IcShield = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
const IcTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
const IcPause = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
const IcPlay = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
const IcPlus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IcDots = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
const IcCheck = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const IcPhone = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>

function Badge({ children, color, bg, border }: { children: React.ReactNode; color: string; bg: string; border?: string }) {
  return (
    <span style={{ background: bg, color, border: `1px solid ${border || color + '33'}`, fontSize: '0.6rem', fontWeight: '700', padding: '0.18rem 0.5rem', borderRadius: '5px', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
      {children}
    </span>
  )
}

function Toggle2FA({ enabled, userId, token, onRefresh }: { enabled: boolean; userId: string; token: string; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    if (enabled && !confirm('¿Desactivar el 2FA de este usuario? Deberá reconfigurarlo al siguiente acceso.')) return
    setLoading(true)
    await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'reset_totp', user_id: userId }),
    })
    setLoading(false)
    onRefresh()
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <button
        onClick={handleToggle}
        disabled={loading}
        title={enabled ? 'Desactivar 2FA' : '2FA no configurado'}
        style={{
          width: '36px', height: '20px', borderRadius: '10px', border: 'none', cursor: enabled ? 'pointer' : 'default',
          background: enabled ? '#059669' : '#CBD5E1', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          opacity: loading ? 0.5 : 1,
        }}>
        <div style={{
          position: 'absolute', top: '3px', left: enabled ? '19px' : '3px',
          width: '14px', height: '14px', borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
      <span style={{ color: enabled ? '#059669' : '#94A3B8', fontSize: '0.7rem', fontWeight: '600' }}>
        {enabled ? 'Activo' : 'Inactivo'}
      </span>
    </div>
  )
}

function ActionMenu({ user, token, onRefresh }: { user: Usuario; token: string; onRefresh: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 2500)
  }

  async function doAction(action: string, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return
    setLoading(action); setOpen(false)
    try {
      let res
      if (action === 'toggle') {
        res = await fetch('/api/admin/usuarios', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ user_id: user.id, activo: !user.activo }),
        })
        showToast(user.activo ? 'Usuario desactivado' : 'Usuario activado')
      } else if (action === 'reset_password') {
        res = await fetch('/api/admin/usuarios', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'reset_password', email: user.email }),
        })
        showToast('Email de reset enviado a ' + user.email)
      } else if (action === 'delete') {
        res = await fetch('/api/admin/usuarios', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ user_id: user.id }),
        })
        showToast('Usuario eliminado')
      }
      onRefresh()
    } catch {
      showToast('Error al ejecutar la acción', false)
    } finally {
      setLoading(null)
    }
  }

  if (user.role === 'super_admin') return <span style={{ color: cl.gray300, fontSize: '0.7rem', fontStyle: 'italic' }}>—</span>

  const items = [
    { id: 'toggle', label: user.activo ? 'Desactivar acceso' : 'Activar acceso', icon: user.activo ? <IcPause /> : <IcPlay />, danger: user.activo },
    { id: 'reset_password', label: 'Enviar reset de contraseña', icon: <IcKey />, danger: false },
    { id: 'delete', label: 'Eliminar usuario', icon: <IcTrash />, danger: true, confirm: `¿Eliminar permanentemente a ${user.email}? Esta acción no se puede deshacer.` },
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', background: toast.ok ? '#0F172A' : '#7F1D1D', color: '#fff', padding: '0.65rem 1.25rem', borderRadius: '10px', fontSize: '0.82rem', fontWeight: '500', zIndex: 9999, boxShadow: '0 4px 24px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {toast.ok ? <IcCheck /> : '✕'} {toast.msg}
        </div>
      )}
      <button onClick={() => setOpen(!open)} disabled={!!loading}
        style={{ background: open ? cl.gray100 : 'transparent', border: `1px solid ${open ? cl.gray300 : cl.gray200}`, borderRadius: '7px', padding: '0.3rem 0.55rem', cursor: 'pointer', color: cl.gray400, display: 'flex', alignItems: 'center', transition: 'all 0.12s' }}>
        {loading ? <span style={{ fontSize: '0.7rem' }}>···</span> : <IcDots />}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', zIndex: 200, minWidth: '220px', overflow: 'hidden' }}>
          <div style={{ padding: '0.5rem 0.9rem 0.4rem', borderBottom: `1px solid ${cl.gray100}` }}>
            <p style={{ color: cl.gray400, fontSize: '0.65rem', fontWeight: '700', margin: 0, letterSpacing: '0.07em' }}>ACCIONES — {user.email}</p>
          </div>
          {items.map((item, i) => (
            <button key={item.id}
              onClick={() => doAction(item.id, item.confirm)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderTop: i === items.length - 1 ? `1px solid ${cl.gray100}` : 'none', padding: '0.6rem 0.9rem', fontSize: '0.8rem', color: item.danger ? '#EF4444' : cl.gray700, cursor: 'pointer', fontFamily: cl.fontFamily, transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = item.danger ? '#FEF2F2' : cl.gray50)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ color: item.danger ? '#EF4444' : cl.gray400, display: 'flex' }}>{item.icon}</span>
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
  const activos = usuarios.filter(u => u.activo).length
  const con2FA = usuarios.filter(u => u.totp_verified).length

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: cl.fontFamily }}>
      {/* Header */}
      <div style={{ background: cl.white, borderBottom: `1px solid ${cl.gray200}`, padding: '0 2rem', height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '20px', width: 'auto' }} />
          <span style={{ color: cl.gray300 }}>/</span>
          <a href="/gate" style={{ color: cl.gray400, fontSize: '0.8rem', fontWeight: '500', textDecoration: 'none' }}>Compliance Hub</a>
          <span style={{ color: cl.gray300 }}>/</span>
          <span style={{ color: cl.gray800, fontSize: '0.8rem', fontWeight: '600' }}>Usuarios</span>
        </div>
        <a href="/gate" style={{ color: cl.gray400, fontSize: '0.78rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Volver al Hub
        </a>
      </div>

      <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Page title */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3EE8A0' }} />
              <span style={{ color: cl.gray400, fontSize: '0.67rem', fontWeight: '700', letterSpacing: '0.09em' }}>GESTIÓN DE ACCESO</span>
            </div>
            <h1 style={{ color: cl.gray900, fontSize: '1.55rem', fontWeight: '800', margin: '0 0 0.2rem', letterSpacing: '-0.02em' }}>Usuarios</h1>
            <p style={{ color: cl.gray400, fontSize: '0.83rem', margin: 0 }}>Administra roles, permisos y credenciales del Compliance Hub</p>
          </div>
          <button onClick={() => { setShowInviteForm(v => !v); setInviteResult(null) }}
            style={{ ...sharedStyles.btnPrimary, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <IcPlus /> Invitar usuario
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total usuarios', value: usuarios.length, color: '#3B82F6', icon: <IcUser /> },
            { label: 'Activos', value: activos, color: '#059669', icon: <IcPlay /> },
            { label: 'Con 2FA', value: con2FA, color: '#7C3AED', icon: <IcShield /> },
            { label: 'Invitaciones pendientes', value: pendientes, color: '#D97706', icon: <IcPhone /> },
          ].map(s => (
            <div key={s.label} style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: s.color + '14', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <p style={{ color: cl.gray400, fontSize: '0.67rem', fontWeight: '700', margin: '0 0 0.1rem', letterSpacing: '0.05em' }}>{s.label.toUpperCase()}</p>
                <p style={{ color: s.color, fontSize: '1.5rem', fontWeight: '800', margin: 0, lineHeight: 1 }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Invite form */}
        {showInviteForm && (
          <div style={{ background: cl.white, border: `1.5px solid ${cl.blue}33`, borderRadius: '14px', padding: '1.5rem', marginBottom: '1.25rem', boxShadow: `0 0 0 4px ${cl.blue}08` }}>
            {inviteResult ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.85rem', color: '#059669' }}>
                  <IcCheck />
                </div>
                <p style={{ color: cl.gray800, fontWeight: '700', fontSize: '0.9rem', margin: '0 0 0.35rem' }}>Invitación enviada a {inviteResult.email}</p>
                <p style={{ color: cl.gray400, fontSize: '0.78rem', margin: '0 0 1.1rem' }}>También puedes compartir el link directamente:</p>
                <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                  <code style={{ background: cl.gray50, border: `1px solid ${cl.gray200}`, padding: '0.45rem 0.7rem', borderRadius: '7px', fontSize: '0.7rem', color: cl.gray500, maxWidth: '420px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                    {inviteResult.url}
                  </code>
                  <button onClick={() => { navigator.clipboard.writeText(inviteResult.url); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }}
                    style={{ background: copiado ? '#ECFDF5' : cl.blueLight, color: copiado ? '#059669' : cl.blue, border: `1px solid ${copiado ? '#A7F3D0' : '#BFDBFE'}`, borderRadius: '7px', padding: '0.45rem 0.9rem', fontSize: '0.76rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s' }}>
                    {copiado ? 'Copiado' : 'Copiar link'}
                  </button>
                </div>
                <button onClick={() => { setShowInviteForm(false); setInviteResult(null) }} style={{ marginTop: '1.1rem', ...sharedStyles.btnGhost, fontSize: '0.8rem' }}>Cerrar</button>
              </div>
            ) : (
              <div>
                <h3 style={{ color: cl.gray800, fontSize: '0.9rem', fontWeight: '700', margin: '0 0 1.1rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ color: cl.blue, display: 'flex' }}><IcUser /></span> Nueva invitación
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
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
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button onClick={() => setShowInviteForm(false)} style={{ ...sharedStyles.btnGhost, padding: '0.5rem 0.65rem' }}>✕</button>
                    <button onClick={handleInvitar} disabled={!inviteEmail || inviteLoading}
                      style={{ ...sharedStyles.btnPrimary, opacity: (!inviteEmail || inviteLoading) ? 0.5 : 1, fontSize: '0.82rem' }}>
                      {inviteLoading ? '···' : 'Invitar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '1rem', background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '9px', padding: '0.25rem', width: 'fit-content' }}>
          {(['usuarios', 'invitaciones'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ background: tab === t ? cl.blue : 'transparent', color: tab === t ? cl.white : cl.gray500, border: 'none', borderRadius: '6px', padding: '0.42rem 1rem', fontSize: '0.79rem', fontWeight: tab === t ? '600' : '400', cursor: 'pointer', fontFamily: cl.fontFamily, transition: 'all 0.15s' }}>
              {t === 'usuarios' ? `Usuarios (${usuarios.length})` : `Invitaciones${pendientes > 0 ? ` · ${pendientes} pendientes` : ''}`}
            </button>
          ))}
        </div>

        {/* ── Tabla usuarios ── */}
        {tab === 'usuarios' && (
          <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '14px', overflow: 'hidden' }}>
            {/* Cabecera */}
            <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.1fr 0.8fr 0.9fr 1fr 1fr 44px', gap: '1rem', padding: '0.6rem 1.5rem', background: cl.gray50, borderBottom: `1px solid ${cl.gray200}` }}>
              {['Usuario', 'Rol', 'Estado', '2FA', 'Último acceso', 'Miembro desde', ''].map((h, i) => (
                <span key={i} style={{ color: cl.gray400, fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.07em' }}>{h}</span>
              ))}
            </div>
            {loading
              ? <div style={{ padding: '3rem', textAlign: 'center', color: cl.gray300, fontSize: '0.85rem' }}>Cargando usuarios…</div>
              : usuarios.map((u, idx) => {
                  const rolCfg = ROLE_COLORS[u.role] || ROLE_COLORS.readonly
                  const isSelf = u.id === selfId
                  return (
                    <div key={u.id}
                      style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.1fr 0.8fr 0.9fr 1fr 1fr 44px', gap: '1rem', padding: '0.85rem 1.5rem', borderBottom: idx < usuarios.length - 1 ? `1px solid ${cl.gray50}` : 'none', alignItems: 'center', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFC')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                      {/* Usuario */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0 }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: rolCfg.color + '18', border: `1.5px solid ${rolCfg.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ color: rolCfg.color, fontWeight: '700', fontSize: '0.85rem' }}>{(u.nombre || u.email)[0].toUpperCase()}</span>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.1rem' }}>
                            <p style={{ color: cl.gray800, fontWeight: '600', fontSize: '0.83rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {u.nombre ? `${u.nombre} ${u.apellidos || ''}`.trim() : u.email}
                            </p>
                            {isSelf && <Badge color="#3B82F6" bg="#EFF6FF">TÚ</Badge>}
                          </div>
                          {u.nombre && <p style={{ color: cl.gray400, fontSize: '0.7rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>}
                        </div>
                      </div>

                      {/* Rol */}
                      <div>
                        {u.role !== 'super_admin' ? (
                          <select value={u.role} onChange={e => handleRoleChange(u, e.target.value as Role)}
                            style={{ background: rolCfg.bg, color: rolCfg.color, border: `1px solid ${rolCfg.color}33`, borderRadius: '7px', padding: '0.28rem 0.45rem', fontSize: '0.7rem', fontWeight: '600', cursor: 'pointer', fontFamily: cl.fontFamily, width: '100%' }}>
                            {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        ) : (
                          <Badge color={rolCfg.color} bg={rolCfg.bg}>SUPER ADMIN</Badge>
                        )}
                      </div>

                      {/* Estado */}
                      <Badge color={u.activo ? '#065F46' : '#991B1B'} bg={u.activo ? '#ECFDF5' : '#FEF2F2'} border={u.activo ? '#A7F3D0' : '#FECACA'}>
                        {u.activo ? 'ACTIVO' : 'INACTIVO'}
                      </Badge>

                      {/* 2FA toggle */}
                      <Toggle2FA enabled={u.totp_verified} userId={u.id} token={token} onRefresh={() => loadData(token)} />

                      {/* Último acceso */}
                      <span style={{ color: cl.gray500, fontSize: '0.74rem' }}>
                        {u.last_login ? new Date(u.last_login).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </span>

                      {/* Miembro desde */}
                      <span style={{ color: cl.gray400, fontSize: '0.74rem' }}>
                        {new Date(u.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>

                      {/* Acciones */}
                      <ActionMenu user={u} token={token} onRefresh={() => loadData(token)} />
                    </div>
                  )
                })}
          </div>
        )}

        {/* ── Tabla invitaciones ── */}
        {tab === 'invitaciones' && (
          <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '1rem', padding: '0.6rem 1.5rem', background: cl.gray50, borderBottom: `1px solid ${cl.gray200}` }}>
              {['Email', 'Rol', 'Estado', 'Expira', ''].map((h, i) => (
                <span key={i} style={{ color: cl.gray400, fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.07em' }}>{h}</span>
              ))}
            </div>
            {loading
              ? <div style={{ padding: '3rem', textAlign: 'center', color: cl.gray300, fontSize: '0.85rem' }}>Cargando…</div>
              : invitaciones.length === 0
                ? <div style={{ padding: '3rem', textAlign: 'center' }}><p style={{ color: cl.gray300, margin: 0, fontSize: '0.83rem' }}>No hay invitaciones registradas</p></div>
                : invitaciones.map((inv, idx) => {
                    const st = STATUS_STYLE[inv.status]
                    const rolCfg = ROLE_COLORS[inv.role] || ROLE_COLORS.readonly
                    return (
                      <div key={inv.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '1rem', padding: '0.85rem 1.5rem', borderBottom: idx < invitaciones.length - 1 ? `1px solid ${cl.gray50}` : 'none', alignItems: 'center' }}>
                        <div>
                          <p style={{ color: cl.gray800, fontWeight: '600', fontSize: '0.83rem', margin: '0 0 0.1rem' }}>{inv.email}</p>
                          {inv.nombre && <p style={{ color: cl.gray400, fontSize: '0.7rem', margin: 0 }}>{inv.nombre}</p>}
                        </div>
                        <Badge color={rolCfg.color} bg={rolCfg.bg}>{ROLE_LABELS[inv.role]}</Badge>
                        <Badge color={st.color} bg={st.bg} border={st.border}>{st.label.toUpperCase()}</Badge>
                        <span style={{ color: cl.gray400, fontSize: '0.74rem' }}>
                          {inv.status === 'pending' ? new Date(inv.expires_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                        {inv.status === 'pending'
                          ? <button onClick={() => handleRevocarInvite(inv.id)} style={{ background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA', borderRadius: '7px', padding: '0.28rem 0.65rem', fontSize: '0.7rem', fontWeight: '600', cursor: 'pointer' }}>Revocar</button>
                          : <span />}
                      </div>
                    )
                  })}
          </div>
        )}
      </div>
    </div>
  )
}
