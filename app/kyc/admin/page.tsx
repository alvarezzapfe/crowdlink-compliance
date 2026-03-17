'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'
import { cl, statusConfig } from '@/lib/design'
import {
  IconSearch, IconBuilding, IconUser, IconDoc, IconZap, IconCreditCard,
  IconNote, IconHistory, IconCheck, IconX, IconClock, IconFilter, IconShield
} from '@/components/Icons'

interface Empresa {
  id: string; razon_social: string; rfc: string; tipo_persona: string
  giro: string; pais: string; rep_legal_nombre: string; rep_legal_curp: string
  acta_constitutiva_url: string; comprobante_domicilio_url: string; identificacion_rep_url: string
  status: string; notas: string; metadata: Record<string, unknown>; created_at: string; updated_at?: string
}
interface HistEvent { status: string; fecha: string; nota: string }
type Tab = 'datos' | 'docs' | 'ekatena' | 'notas' | 'historial'
interface Invitation {
  id: string; token: string; email: string; nombre_empresa: string
  used: boolean; used_at: string | null; expires_at: string; created_at: string
  invite_url?: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string; border: string }> = {
  pending:   { label: 'Pendiente',   color: '#92400E', bg: '#FFFBEB', dot: '#F59E0B', border: '#FDE68A' },
  in_review: { label: 'En revisión', color: '#1D4ED8', bg: '#EFF6FF', dot: '#3B82F6', border: '#BFDBFE' },
  approved:  { label: 'Aprobada',    color: '#065F46', bg: '#ECFDF5', dot: '#10B981', border: '#6EE7B7' },
  rejected:  { label: 'Rechazada',   color: '#991B1B', bg: '#FEF2F2', dot: '#EF4444', border: '#FECACA' },
}

export default function KycAdminPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [selected, setSelected] = useState<Empresa | null>(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [nota, setNota] = useState('')
  const [historial, setHistorial] = useState<HistEvent[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('datos')
  const [userEmail, setUserEmail] = useState('')
  const [sessionToken, setSessionToken] = useState('')
  const [mounted, setMounted] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  // Invitations
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [invLoading, setInvLoading] = useState(false)
  const [invEmail, setInvEmail] = useState('')
  const [invEmpresa, setInvEmpresa] = useState('')
  const [invCreating, setInvCreating] = useState(false)
  const [invError, setInvError] = useState('')
  const [invJustCreated, setInvJustCreated] = useState<Invitation | null>(null)
  const [invCopied, setInvCopied] = useState(false)
  const [invEmailSent, setInvEmailSent] = useState(false)
  const [invQrModal, setInvQrModal] = useState<Invitation | null>(null)
  const [showInvModal, setShowInvModal] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const loadEmpresas = useCallback(async (token?: string) => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const t = token || session?.access_token
    if (!t) { setLoading(false); return }
    const res = await fetch('/api/v1/kyc/admin/empresas', { headers: { 'Authorization': 'Bearer ' + t } })
    if (res.ok) { const data = await res.json(); setEmpresas(data.empresas || []) }
    setLoading(false)
  }, [])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUserEmail(user.email || '')
      const { data: profile } = await supabase.from('profiles').select('role, id').eq('id', user.id).single()
      if (!profile) {
        const adminEmails = ['luis@crowdlink.mx', 'lalvarezzapfe@gmail.com']
        if (adminEmails.includes(user.email || '')) {
          await supabase.from('profiles').upsert({ id: user.id, email: user.email, nombre: user.email?.split('@')[0], role: 'admin' })
        } else { window.location.href = '/kyc/wizard'; return }
      } else if (profile.role !== 'admin') { window.location.href = '/kyc/wizard'; return }
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) setSessionToken(session.access_token)
      await loadEmpresas(session?.access_token)
    }
    load()
  }, [loadEmpresas])

  const selectEmpresa = (e: Empresa) => {
    setSelected(e); setNota(e.notas || ''); setActiveTab('datos'); setShowDetail(true)
    const hist = (e.metadata?.historial as HistEvent[]) || [{ status: 'pending', fecha: e.created_at, nota: 'Solicitud recibida' }]
    setHistorial(hist)
  }

  const updateStatus = async (status: string) => {
    if (!selected || saving) return
    setSaving(true)
    const sc = STATUS_CONFIG[status]
    const newEvent: HistEvent = { status, fecha: new Date().toISOString(), nota: nota || `Status → ${sc?.label}` }
    const updatedHist = [...historial, newEvent]
    const supabase = createClient()
    await supabase.from('kyc_empresas').update({
      status, notas: nota, updated_at: new Date().toISOString(),
      metadata: { ...selected.metadata, historial: updatedHist },
    }).eq('id', selected.id)
    setHistorial(updatedHist)
    setSelected({ ...selected, status, notas: nota })
    setEmpresas(prev => prev.map(e => e.id === selected.id ? { ...e, status } : e))
    setSaving(false)
  }

  const saveNota = async () => {
    if (!selected || saving) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('kyc_empresas').update({ notas: nota }).eq('id', selected.id)
    setSelected({ ...selected, notas: nota })
    setSaving(false)
  }

  const loadInvitations = async () => {
    setInvLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token || sessionToken
    if (!token) { setInvLoading(false); return }
    const res = await fetch('/api/v1/invitations', { headers: { 'Authorization': `Bearer ${token}` } })
    const data = await res.json()
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    setInvitations((data.invitations || []).map((inv: Invitation) => ({ ...inv, invite_url: `${base}/invite/${inv.token}` })))
    setInvLoading(false)
  }

  const handleCreateInv = async () => {
    if (!invEmail.trim()) { setInvError('Email requerido'); return }
    setInvCreating(true); setInvError(''); setInvJustCreated(null)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token || sessionToken
    const res = await fetch('/api/v1/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ email: invEmail.trim().toLowerCase(), nombre_empresa: invEmpresa.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setInvError(data.error || 'Error'); setInvCreating(false); return }
    const inv: Invitation = { ...data.invitation, invite_url: data.invite_url, email_sent: data.email_sent }
    setInvJustCreated(inv)
    setInvitations(prev => [inv, ...prev])
    setInvEmail(''); setInvEmpresa('')
    setInvCreating(false)
  }

  const [invEmailSending, setInvEmailSending] = useState(false)

  const sendInvEmail = async (inv: Invitation) => {
    setInvEmailSending(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || sessionToken
      const res = await fetch('/api/v1/invitations/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          invitation_id: inv.id,
          email: inv.email,
          invite_url: inv.invite_url,
          nombre_empresa: inv.nombre_empresa,
        }),
      })
      if (res.ok) {
        setInvEmailSent(true)
        setTimeout(() => {
          setShowInvModal(false)
          setInvJustCreated(null)
          setInvEmailSent(false)
        }, 1500)
      } else {
        const data = await res.json()
        setInvError(data.error || 'Error al enviar email')
      }
    } catch { setInvError('Error de conexión') }
    setInvEmailSending(false)
  }

  const copyInvLink = async (url: string) => {
    await navigator.clipboard.writeText(url)
    setInvCopied(true); setTimeout(() => setInvCopied(false), 2000)
  }

  const invStatus = (inv: Invitation) => {
    if (inv.used) return { label: 'Usado', color: '#065F46', bg: '#ECFDF5', dot: '#10B981' }
    if (new Date(inv.expires_at) < new Date()) return { label: 'Expirado', color: '#991B1B', bg: '#FEF2F2', dot: '#EF4444' }
    return { label: 'Activo', color: '#1D4ED8', bg: '#EFF6FF', dot: '#3B82F6' }
  }

  const filtered = empresas.filter(e => {
    if (filter !== 'all' && e.status !== filter) return false
    if (!search) return true
    return (e.razon_social || '').toLowerCase().includes(search.toLowerCase()) ||
           (e.rfc || '').toLowerCase().includes(search.toLowerCase()) ||
           (e.giro || '').toLowerCase().includes(search.toLowerCase())
  })

  const counts = {
    all: empresas.length,
    pending: empresas.filter(e => e.status === 'pending').length,
    in_review: empresas.filter(e => e.status === 'in_review').length,
    approved: empresas.filter(e => e.status === 'approved').length,
    rejected: empresas.filter(e => e.status === 'rejected').length,
  }

  const font = "'DM Sans', system-ui, sans-serif"

  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [sessionWarning, setSessionWarning] = useState(false)

  const resetInactivity = useCallback(() => {
    setSessionWarning(false)
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    if (warningTimer.current) clearTimeout(warningTimer.current)
    warningTimer.current = setTimeout(() => setSessionWarning(true), 25 * 60 * 1000)
    inactivityTimer.current = setTimeout(async () => {
      const { createClient } = await import('@/lib/supabase-client')
      const supabase = createClient()
      await supabase.auth.signOut()
      window.location.href = '/login'
    }, 30 * 60 * 1000)
  }, [])

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetInactivity, { passive: true }))
    resetInactivity()
    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivity))
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      if (warningTimer.current) clearTimeout(warningTimer.current)
    }
  }, [resetInactivity])

  return (
    <>
    {sessionWarning && (
      <div style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: '#7C2D12', border: '1px solid #DC2626', borderRadius: '12px', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 9999 }}>
        <span style={{ color: '#FCA5A5', fontSize: '0.82rem' }}>Sesión expira en 5 min por inactividad</span>
        <button onClick={resetInactivity} style={{ background: '#DC2626', color: 'white', border: 'none', borderRadius: '6px', padding: '0.3rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}>Continuar</button>
      </div>
    )}
    <div style={{ minHeight: '100vh', background: '#F1F5F9', fontFamily: font }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .row-hover:hover { background: #F8FAFC !important; cursor: pointer; }
        .btn-ghost:hover { background: #F1F5F9 !important; }
        input:focus, textarea:focus { outline: none; border-color: #0F7BF4 !important; box-shadow: 0 0 0 3px rgba(15,123,244,0.1); }
      `}</style>

      {/* TOP NAV */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '56px', background: 'white', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 1.5rem', zIndex: 100, gap: '1rem' }}>
        <a href="/gate" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', color: '#64748B', fontSize: '0.8rem', fontWeight: '500', padding: '0.35rem 0.7rem', borderRadius: '7px', border: '1px solid #E2E8F0', background: 'white' }} className="btn-ghost">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
          Módulos
        </a>
        <div style={{ width: '1px', height: '20px', background: '#E2E8F0' }} />
        <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '20px', width: 'auto' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0F7BF4' }} />
          <span style={{ color: '#0F172A', fontSize: '0.85rem', fontWeight: '600' }}>KYC Admin</span>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => { setShowInvModal(true); loadInvitations() }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0F7BF4', color: 'white', border: 'none', borderRadius: '8px', padding: '0.45rem 1rem', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', fontFamily: font }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Invitar empresa
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748B', fontSize: '0.8rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0F7BF4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: '700' }}>
            {userEmail ? userEmail[0].toUpperCase() : 'A'}
          </div>
          {userEmail}
        </div>
        <button onClick={async () => { await createClient().auth.signOut(); window.location.href = '/gate' }} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: '1px solid #E2E8F0', borderRadius: '7px', padding: '0.35rem 0.75rem', color: '#64748B', fontSize: '0.78rem', cursor: 'pointer', fontFamily: font }} className="btn-ghost">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Salir
        </button>
      </div>

      {/* MAIN */}
      <div style={{ paddingTop: '56px', maxWidth: '1400px', margin: '0 auto', padding: '56px 1.5rem 1.5rem' }}>

        {/* STATS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total', value: counts.all, color: '#0F172A', bg: 'white', border: '#E2E8F0' },
            { label: 'Pendientes', value: counts.pending, color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
            { label: 'En revisión', value: counts.in_review, color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
            { label: 'Aprobadas', value: counts.approved, color: '#065F46', bg: '#ECFDF5', border: '#6EE7B7' },
            { label: 'Rechazadas', value: counts.rejected, color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },
          ].map(s => (
            <button key={s.label} onClick={() => setFilter(s.label === 'Total' ? 'all' : Object.entries({ 'Pendientes': 'pending', 'En revisión': 'in_review', 'Aprobadas': 'approved', 'Rechazadas': 'rejected' })[['Pendientes','En revisión','Aprobadas','Rechazadas'].indexOf(s.label)]?.[1] || 'all')} style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: '12px', padding: '1rem 1.25rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s', fontFamily: font }}>
              <div style={{ color: s.color, fontSize: '1.75rem', fontWeight: '700', lineHeight: 1, marginBottom: '0.35rem' }}>{s.value}</div>
              <div style={{ color: '#64748B', fontSize: '0.78rem', fontWeight: '500' }}>{s.label}</div>
            </button>
          ))}
        </div>

        {/* TOOLBAR */}
        <div style={{ background: 'white', borderRadius: '12px 12px 0 0', border: '1px solid #E2E8F0', borderBottom: 'none', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
            <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
              <IconSearch size={15} color="#94A3B8" />
            </div>
            <input placeholder="Buscar empresa, RFC, giro..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '8px', padding: '0.5rem 0.75rem 0.5rem 2.25rem', color: '#1E293B', fontSize: '0.83rem', fontFamily: font }} />
          </div>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {[
              { k: 'all', l: 'Todas' },
              { k: 'pending', l: 'Pendientes' },
              { k: 'in_review', l: 'En revisión' },
              { k: 'approved', l: 'Aprobadas' },
              { k: 'rejected', l: 'Rechazadas' },
            ].map(f => (
              <button key={f.k} onClick={() => setFilter(f.k)} style={{ padding: '0.4rem 0.85rem', borderRadius: '7px', border: filter === f.k ? '1.5px solid #0F7BF4' : '1.5px solid #E2E8F0', background: filter === f.k ? '#EBF3FF' : 'white', color: filter === f.k ? '#0F7BF4' : '#64748B', fontSize: '0.78rem', fontWeight: filter === f.k ? '600' : '400', cursor: 'pointer', fontFamily: font }}>
                {f.l}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', color: '#94A3B8', fontSize: '0.78rem' }}>
            {filtered.length} expediente{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* TABLE */}
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #F1F5F9', background: '#F8FAFC' }}>
                {['Empresa', 'RFC', 'Tipo', 'Giro', 'Rep. Legal', 'Estado', 'Fecha', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', color: '#64748B', fontSize: '0.72rem', fontWeight: '600', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                  <div style={{ width: '24px', height: '24px', border: '2.5px solid #EBF3FF', borderTopColor: '#0F7BF4', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 0.75rem' }} />
                  Cargando expedientes...
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '4rem', color: '#94A3B8' }}>
                  <IconSearch size={32} color="#CBD5E1" />
                  <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', fontWeight: '500' }}>Sin resultados</div>
                </td></tr>
              ) : filtered.map((e, i) => {
                const sc = STATUS_CONFIG[e.status] || STATUS_CONFIG.pending
                const isSelected = selected?.id === e.id
                return (
                  <tr key={e.id} onClick={() => selectEmpresa(e)} className="row-hover"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none', background: isSelected ? '#EBF3FF' : 'white', transition: 'background 0.1s' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: '600', color: '#0F172A', fontSize: '0.88rem' }}>{e.razon_social}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#475569', background: '#F1F5F9', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>{e.rfc}</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748B', fontSize: '0.82rem' }}>
                      {e.tipo_persona === 'moral' ? 'Moral' : 'Física'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748B', fontSize: '0.82rem', maxWidth: '140px' }}>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{e.giro || '—'}</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748B', fontSize: '0.82rem' }}>
                      {e.rep_legal_nombre || '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontSize: '0.7rem', fontWeight: '600', padding: '0.2rem 0.6rem', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: sc.dot }} />
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#94A3B8', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {new Date(e.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }} onClick={ev => ev.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {e.status !== 'approved' && (
                          <button onClick={() => { setSelected(e); updateStatus('approved') }} title="Aprobar"
                            style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <IconCheck size={13} color="#059669" strokeWidth={2.5} />
                          </button>
                        )}
                        {e.status !== 'rejected' && (
                          <button onClick={() => { setSelected(e); updateStatus('rejected') }} title="Rechazar"
                            style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <IconX size={13} color="#EF4444" strokeWidth={2.5} />
                          </button>
                        )}
                        <button onClick={() => selectEmpresa(e)} title="Ver detalle"
                          style={{ background: '#EBF3FF', border: '1px solid #BFDBFE', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0F7BF4" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL PANEL — slide in from right */}
      {showDetail && selected && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', zIndex: 200, animation: 'fadeIn 0.2s ease' }} onClick={() => setShowDetail(false)} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '520px', background: 'white', zIndex: 201, boxShadow: '-8px 0 32px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.25s ease', fontFamily: font }}>

            {/* Panel header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <h2 style={{ color: '#0F172A', fontSize: '1.1rem', fontWeight: '700', margin: '0 0 0.2rem', letterSpacing: '-0.01em' }}>{selected?.razon_social}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#475569', background: '#F1F5F9', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>{selected?.rfc}</span>
                  {(() => { const sc = STATUS_CONFIG[selected?.status || 'pending']; return (
                    <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontSize: '0.68rem', fontWeight: '600', padding: '0.15rem 0.55rem', borderRadius: '9999px' }}>{sc.label}</span>
                  )})()}
                </div>
              </div>
              <button onClick={() => setShowDetail(false)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconX size={15} color="#64748B" />
              </button>
            </div>

            {/* Quick actions */}
            <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              {selected?.status !== 'approved' && (
                <button onClick={() => updateStatus('approved')} disabled={saving} style={{ flex: 1, background: '#ECFDF5', border: '1.5px solid #6EE7B7', color: '#065F46', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', fontFamily: font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <IconCheck size={14} color="#059669" strokeWidth={2.5} /> Aprobar
                </button>
              )}
              {selected?.status !== 'rejected' && (
                <button onClick={() => updateStatus('rejected')} disabled={saving} style={{ flex: 1, background: '#FEF2F2', border: '1.5px solid #FECACA', color: '#991B1B', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', fontFamily: font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <IconX size={14} color="#EF4444" strokeWidth={2.5} /> Rechazar
                </button>
              )}
              {selected?.status !== 'in_review' && (
                <button onClick={() => updateStatus('in_review')} disabled={saving} style={{ flex: 1, background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1D4ED8', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', fontFamily: font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <IconClock size={14} color="#3B82F6" /> En revisión
                </button>
              )}
            </div>

            {/* Tabs */}
            <div style={{ padding: '0 1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: '0', flexShrink: 0 }}>
              {([
                { id: 'datos', label: 'Datos', icon: <IconBuilding size={13} /> },
                { id: 'docs', label: 'Docs', icon: <IconDoc size={13} /> },
                { id: 'ekatena', label: 'Ekatena', icon: <IconZap size={13} /> },
                { id: 'notas', label: 'Notas', icon: <IconNote size={13} /> },
                { id: 'historial', label: 'Historial', icon: <IconHistory size={13} /> },
              ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ background: 'none', border: 'none', padding: '0.7rem 0.9rem', color: activeTab === tab.id ? '#0F7BF4' : '#94A3B8', fontWeight: activeTab === tab.id ? '600' : '400', fontSize: '0.78rem', cursor: 'pointer', fontFamily: font, borderBottom: activeTab === tab.id ? '2px solid #0F7BF4' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>

              {activeTab === 'datos' && (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  <Section title="Empresa">
                    <DR l="Razón Social" v={selected?.razon_social || ''} />
                    <DR l="RFC" v={selected?.rfc || ''} mono />
                    <DR l="Tipo" v={selected?.tipo_persona === 'moral' ? 'Persona Moral' : 'Persona Física'} />
                    <DR l="Giro" v={selected?.giro || '—'} />
                    <DR l="País" v={selected?.pais || ''} />
                    <DR l="Fecha" v={selected?.created_at ? new Date(selected.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : ''} />
                  </Section>
                  <Section title="Representante Legal">
                    <DR l="Nombre" v={selected?.rep_legal_nombre || '—'} />
                    <DR l="CURP" v={selected?.rep_legal_curp || '—'} mono />
                  </Section>
                  {!!(selected?.metadata?.financiero) && ({selected?.metadata?.financiero && ( (
                    <Section title="Perfil Financiero">
                      <DR l="Facturación" v={String((selected.metadata.financiero as Record<string,unknown>)?.nivel_facturacion || '—')} />
                      <DR l="Empleados" v={String((selected.metadata.financiero as Record<string,unknown>)?.num_empleados || '—')} />
                      <DR l="Fuente recursos" v={String((selected.metadata.financiero as Record<string,unknown>)?.fuente_recursos || '—')} />
                      <DR l="Opera en efectivo" v={(selected.metadata.financiero as Record<string,unknown>)?.opera_en_efectivo === 'si' ? 'Sí' : 'No'} />
                    </Section>
                  )}
                </div>
              )}

              {activeTab === 'docs' && (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {[
                    { label: 'Acta Constitutiva', url: selected?.acta_constitutiva_url },
                    { label: 'Comprobante de Domicilio', url: selected?.comprobante_domicilio_url },
                    { label: 'Identificación Rep. Legal', url: selected?.identificacion_rep_url },
                  ].map(doc => (
                    <div key={doc.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: doc.url ? '#ECFDF5' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IconDoc size={16} color={doc.url ? '#059669' : '#94A3B8'} />
                        </div>
                        <div>
                          <div style={{ color: '#0F172A', fontSize: '0.82rem', fontWeight: '500' }}>{doc.label}</div>
                          <div style={{ color: '#94A3B8', fontSize: '0.72rem' }}>{doc.url ? 'Subido' : 'Pendiente'}</div>
                        </div>
                      </div>
                      {doc.url ? (
                        <a href={doc.url} target="_blank" rel="noreferrer" style={{ background: '#EBF3FF', border: '1px solid #BFDBFE', color: '#0F7BF4', fontSize: '0.75rem', fontWeight: '600', padding: '0.3rem 0.7rem', borderRadius: '6px', textDecoration: 'none' }}>Ver</a>
                      ) : (
                        <span style={{ color: '#94A3B8', fontSize: '0.72rem' }}>—</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'ekatena' && (
                <div>
                  <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', textAlign: 'center', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#E2E8F0', letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>—</div>
                    <div style={{ color: '#94A3B8', fontSize: '0.82rem' }}>Score Ekatena</div>
                  </div>
                  {!!(selected?.metadata?.ekatena_conectado) ? (
                    <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: '8px', padding: '0.75rem 1rem', color: '#065F46', fontSize: '0.82rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <IconCheck size={15} color="#059669" /> Ekatena conectado
                      {!!(selected?.metadata?.ekatena_rfc) && <span style={{ color: '#4B7A60', fontWeight: '400', fontSize: '0.75rem' }}>· RFC: {String(selected.metadata.ekatena_rfc)}</span>}
                    </div>
                  ) : (
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.75rem 1rem', color: '#64748B', fontSize: '0.82rem' }}>
                      No conectado — score se solicitará manualmente
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'notas' && (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="Agregar notas internas..."
                    style={{ width: '100%', minHeight: '140px', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '10px', padding: '0.9rem', color: '#1E293B', fontSize: '0.85rem', fontFamily: font, resize: 'vertical' }} />
                  <button onClick={saveNota} disabled={saving} style={{ background: '#0F7BF4', color: 'white', border: 'none', borderRadius: '8px', padding: '0.65rem', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', fontFamily: font, opacity: saving ? 0.5 : 1 }}>
                    {saving ? 'Guardando...' : 'Guardar nota'}
                  </button>
                </div>
              )}

              {activeTab === 'historial' && (
                <div style={{ display: 'grid', gap: '0' }}>
                  {[...historial].reverse().map((h, i) => {
                    const sc = STATUS_CONFIG[h.status] || STATUS_CONFIG.pending
                    return (
                      <div key={i} style={{ display: 'flex', gap: '0.75rem', paddingBottom: '1rem', position: 'relative' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, flexShrink: 0 }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: sc.dot, boxShadow: `0 0 6px ${sc.dot}60`, flexShrink: 0, marginTop: '3px' }} />
                          {i < historial.length - 1 && <div style={{ width: '1.5px', flex: 1, background: '#F1F5F9', marginTop: '4px' }} />}
                        </div>
                        <div style={{ flex: 1, paddingBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                            <span style={{ background: sc.bg, color: sc.color, fontSize: '0.7rem', fontWeight: '600', padding: '0.15rem 0.55rem', borderRadius: '9999px', border: `1px solid ${sc.border}` }}>{sc.label}</span>
                            <span style={{ color: '#94A3B8', fontSize: '0.72rem' }}>{new Date(h.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                          {h.nota && <p style={{ color: '#475569', fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>{h.nota}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* INVITE MODAL */}
      {mounted && showInvModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.15s ease' }} onClick={() => setShowInvModal(false)}>
          <div style={{ background: 'white', borderRadius: '18px', padding: '2rem', width: '100%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.15)', fontFamily: font }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ color: '#0F172A', fontSize: '1.1rem', fontWeight: '700', margin: '0 0 0.2rem' }}>Invitar empresa</h2>
                <p style={{ color: '#64748B', fontSize: '0.8rem', margin: 0 }}>Genera un link único para que completen el KYC</p>
              </div>
              <button onClick={() => setShowInvModal(false)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconX size={15} color="#64748B" />
              </button>
            </div>

            {/* Toast notification */}
            {invEmailSent && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#ECFDF5', border: '1.5px solid #6EE7B7', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span style={{ color: '#065F46', fontSize: '0.85rem', fontWeight: '600' }}>Email enviado a {invJustCreated?.email || ''}</span>
              </div>
            )}

            {!invJustCreated ? (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ color: '#374151', fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.4rem' }}>Email *</label>
                  <input type="email" value={invEmail} onChange={e => setInvEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateInv()} placeholder="cliente@empresa.com" autoFocus
                    style={{ width: '100%', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '9px', padding: '0.7rem 1rem', color: '#1E293B', fontSize: '0.88rem', fontFamily: font }} />
                </div>
                <div>
                  <label style={{ color: '#374151', fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.4rem' }}>Empresa (opcional)</label>
                  <input value={invEmpresa} onChange={e => setInvEmpresa(e.target.value)} placeholder="Empresa SA de CV"
                    style={{ width: '100%', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '9px', padding: '0.7rem 1rem', color: '#1E293B', fontSize: '0.88rem', fontFamily: font }} />
                </div>
                {invError && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.65rem 0.9rem', color: '#DC2626', fontSize: '0.8rem' }}>{invError}</div>}
                <button onClick={handleCreateInv} disabled={invCreating || !invEmail.trim()} style={{ background: invCreating || !invEmail.trim() ? '#E2E8F0' : '#0F7BF4', color: invCreating || !invEmail.trim() ? '#94A3B8' : 'white', border: 'none', borderRadius: '9px', padding: '0.8rem', fontSize: '0.88rem', fontWeight: '600', cursor: invCreating || !invEmail.trim() ? 'not-allowed' : 'pointer', fontFamily: font }}>
                  {invCreating ? 'Generando...' : 'Generar invitación'}
                </button>
              </div>
            ) : (
              <div>
                <div style={{ background: '#ECFDF5', border: '1.5px solid #6EE7B7', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <IconCheck size={18} color="#059669" strokeWidth={2.5} />
                  <div>
                    <div style={{ color: '#065F46', fontSize: '0.88rem', fontWeight: '700' }}>Invitación generada</div>
                    <div style={{ color: '#4B7A60', fontSize: '0.75rem' }}>
                    {invJustCreated.email}
                    {(invJustCreated as Invitation & {email_sent?: boolean}).email_sent && 
                      <span style={{ marginLeft: '0.5rem', background: '#D1FAE5', color: '#065F46', fontSize: '0.65rem', fontWeight: '700', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Email enviado</span>
                    }
                  </div>
                  </div>
                </div>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                  <div style={{ color: '#94A3B8', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>LINK DE INVITACIÓN</div>
                  <div style={{ color: '#475569', fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: '0.75rem', lineHeight: 1.5 }}>{invJustCreated.invite_url}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <button onClick={() => copyInvLink(invJustCreated.invite_url || '')} style={{ background: invCopied ? '#ECFDF5' : 'white', border: `1.5px solid ${invCopied ? '#6EE7B7' : '#E2E8F0'}`, borderRadius: '8px', padding: '0.6rem', fontSize: '0.8rem', fontWeight: '600', color: invCopied ? '#065F46' : '#374151', cursor: 'pointer', fontFamily: font }}>
                      {invCopied ? '¡Copiado!' : 'Copiar link'}
                    </button>
                    <button onClick={() => sendInvEmail(invJustCreated)} disabled={invEmailSending || invEmailSent} style={{ background: invEmailSent ? '#059669' : invEmailSending ? '#6BA8F5' : '#0F7BF4', border: 'none', borderRadius: '8px', padding: '0.6rem', fontSize: '0.8rem', fontWeight: '600', color: 'white', cursor: invEmailSending || invEmailSent ? 'not-allowed' : 'pointer', fontFamily: font }}>
                      {invEmailSent ? '✓ Enviado' : invEmailSending ? 'Enviando...' : 'Enviar email'}
                    </button>
                    <button onClick={() => { setInvQrModal(invJustCreated); setShowInvModal(false) }} style={{ background: '#EBF3FF', border: '1.5px solid #BFDBFE', borderRadius: '8px', padding: '0.6rem', fontSize: '0.8rem', fontWeight: '600', color: '#0F7BF4', cursor: 'pointer', fontFamily: font }}>
                      Ver QR
                    </button>
                  </div>
                </div>
                <button onClick={() => setInvJustCreated(null)} style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '0.7rem', fontSize: '0.82rem', fontWeight: '600', color: '#64748B', cursor: 'pointer', fontFamily: font }}>
                  Nueva invitación
                </button>
              </div>
            )}

            {invitations.length > 0 && (
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid #F1F5F9', paddingTop: '1rem' }}>
                <div style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.75rem' }}>ENVIADAS ANTERIORMENTE ({invitations.length})</div>
                {invitations.slice(0, 5).map(inv => {
                  const st = invStatus(inv)
                  return (
                    <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid #F8FAFC' }}>
                      <div>
                        <div style={{ color: '#1E293B', fontSize: '0.82rem', fontWeight: '500' }}>{inv.email}</div>
                        <div style={{ color: '#94A3B8', fontSize: '0.72rem' }}>{inv.nombre_empresa || '—'}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ background: st.bg, color: st.color, fontSize: '0.65rem', fontWeight: '700', padding: '0.15rem 0.5rem', borderRadius: '9999px' }}>{st.label}</span>
                        {!inv.used && new Date(inv.expires_at) > new Date() && (
                          <button onClick={() => { setInvQrModal(inv); setShowInvModal(false) }} style={{ background: '#EBF3FF', border: '1px solid #BFDBFE', borderRadius: '5px', padding: '0.2rem 0.5rem', fontSize: '0.68rem', fontWeight: '700', color: '#0F7BF4', cursor: 'pointer', fontFamily: font }}>QR</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {mounted && invQrModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.15s ease' }} onClick={() => setInvQrModal(null)}>
          <div style={{ background: 'white', borderRadius: '18px', padding: '2rem', width: '100%', maxWidth: '360px', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', fontFamily: font }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ color: '#0F172A', fontSize: '1rem', fontWeight: '700', margin: '0 0 0.2rem' }}>Código QR</h3>
                <div style={{ color: '#64748B', fontSize: '0.78rem' }}>{invQrModal.email}</div>
              </div>
              <button onClick={() => setInvQrModal(null)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconX size={14} color="#64748B" />
              </button>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'inline-block', background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem' }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(invQrModal.invite_url || '')}&color=0F7BF4&bgcolor=ffffff&qzone=2&format=png`} alt="QR" width={190} height={190} style={{ display: 'block' }} />
                <div style={{ marginTop: '0.6rem', color: '#94A3B8', fontSize: '0.65rem', fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: '190px', lineHeight: 1.4 }}>{invQrModal.invite_url}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <a href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(invQrModal.invite_url || '')}&color=0F7BF4&bgcolor=ffffff&qzone=2&format=png`} download={`qr-kyc-${invQrModal.email.split('@')[0]}.png`} target="_blank" rel="noreferrer"
                style={{ background: '#0F7BF4', color: 'white', borderRadius: '9px', padding: '0.65rem', fontSize: '0.8rem', fontWeight: '600', textAlign: 'center', textDecoration: 'none', display: 'block' }}>
                Descargar
              </a>
              <button onClick={() => copyInvLink(invQrModal.invite_url || '')} style={{ background: invCopied ? '#ECFDF5' : '#F8FAFC', border: `1.5px solid ${invCopied ? '#6EE7B7' : '#E2E8F0'}`, borderRadius: '9px', padding: '0.65rem', fontSize: '0.8rem', fontWeight: '600', color: invCopied ? '#065F46' : '#374151', cursor: 'pointer', fontFamily: font }}>
                {invCopied ? '¡Copiado!' : 'Copiar link'}
              </button>
            </div>
            <div style={{ marginTop: '0.75rem', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '0.55rem 0.8rem', color: '#92400E', fontSize: '0.72rem' }}>
              Expira: {new Date(invQrModal.expires_at).toLocaleString('es-MX')}
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#F8FAFC', borderRadius: '10px', border: '1px solid #F1F5F9', overflow: 'hidden' }}>
      <div style={{ padding: '0.5rem 0.9rem', background: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }}>
        <span style={{ color: '#64748B', fontSize: '0.68rem', fontWeight: '700', letterSpacing: '0.08em' }}>{title.toUpperCase()}</span>
      </div>
      <div style={{ padding: '0.25rem 0' }}>{children}</div>
    </div>
  )
}

function DR({ l, v, mono }: { l: string; v: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.9rem', borderBottom: '1px solid #F1F5F9' }}>
      <span style={{ color: '#64748B', fontSize: '0.78rem' }}>{l}</span>
      <span style={{ color: '#1E293B', fontSize: '0.8rem', fontWeight: '500', fontFamily: mono ? 'monospace' : 'inherit', maxWidth: '60%', textAlign: 'right' }}>{v}</span>
    </div>
  )
}