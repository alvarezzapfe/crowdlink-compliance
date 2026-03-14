'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'
import { cl, statusConfig } from '@/lib/design'
import {
  IconSearch, IconBuilding, IconUser, IconDoc, IconZap, IconCreditCard,
  IconNote, IconHistory, IconCheck, IconX, IconClock, IconChevronRight, IconFilter
} from '@/components/Icons'

interface Empresa {
  id: string; razon_social: string; rfc: string; tipo_persona: string
  giro: string; pais: string; rep_legal_nombre: string; rep_legal_curp: string
  acta_constitutiva_url: string; comprobante_domicilio_url: string; identificacion_rep_url: string
  status: string; notas: string; metadata: Record<string, unknown>; created_at: string; updated_at?: string
}
interface HistEvent { status: string; fecha: string; nota: string }

type Tab = 'datos' | 'docs' | 'ekatena' | 'notas' | 'historial' | 'invitaciones'

interface Invitation {
  id: string; token: string; email: string; nombre_empresa: string
  used: boolean; used_at: string | null; expires_at: string; created_at: string
  invite_url?: string
}

const FILTERS = [
  { k: 'all', label: 'Todas' },
  { k: 'pending', label: 'Pendientes' },
  { k: 'in_review', label: 'En revisión' },
  { k: 'approved', label: 'Aprobadas' },
  { k: 'rejected', label: 'Rechazadas' },
]

export default function KycAdminPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [selected, setSelected] = useState<Empresa | null>(null)
  const [filter, setFilter] = useState('all')
  const [nota, setNota] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [historial, setHistorial] = useState<HistEvent[]>([])
  const [userEmail, setUserEmail] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('datos')
  const [authChecked, setAuthChecked] = useState(false)

  // Invitaciones state
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [invLoading, setInvLoading] = useState(false)
  const [invEmail, setInvEmail] = useState('')
  const [invEmpresa, setInvEmpresa] = useState('')
  const [invCreating, setInvCreating] = useState(false)
  const [invError, setInvError] = useState('')
  const [invJustCreated, setInvJustCreated] = useState<Invitation | null>(null)
  const [invCopied, setInvCopied] = useState(false)
  const [invQrModal, setInvQrModal] = useState<Invitation | null>(null)
  const [sessionToken, setSessionToken] = useState('')
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const loadEmpresas = useCallback(async (token?: string) => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const t = token || session?.access_token
    if (!t) { setLoading(false); return }
    // Use service role via API to bypass RLS
    const res = await fetch('/api/v1/kyc/admin/empresas', {
      headers: { 'Authorization': 'Bearer ' + t }
    })
    if (res.ok) {
      const data = await res.json()
      setEmpresas(data.empresas || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUserEmail(user.email || '')

      // Check profile with retry - profile may not exist yet
      const { data: profile } = await supabase
        .from('profiles').select('role, id').eq('id', user.id).single()

      // If no profile exists, create it as admin for known admin emails
      if (!profile) {
        const adminEmails = ['luis@crowdlink.mx', 'lalvarezzapfe@gmail.com']
        if (adminEmails.includes(user.email || '')) {
          await supabase.from('profiles').upsert({
            id: user.id, email: user.email, nombre: user.email?.split('@')[0], role: 'admin'
          })
        } else {
          window.location.href = '/kyc/wizard'
          return
        }
      } else if (profile.role !== 'admin') {
        window.location.href = '/kyc/wizard'
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) setSessionToken(session.access_token)
      setAuthChecked(true)
      await loadEmpresas(session?.access_token)
    }
    load()
  }, [loadEmpresas])

  const selectEmpresa = (e: Empresa) => {
    setSelected(e); setNota(e.notas || ''); setActiveTab('datos')
    const hist = (e.metadata?.historial as HistEvent[]) || [
      { status: 'pending', fecha: e.created_at, nota: 'Solicitud recibida' }
    ]
    setHistorial(hist)
  }

  const updateStatus = async (status: string) => {
    if (!selected || saving) return
    setSaving(true)
    const sc = statusConfig[status]
    const newEvent: HistEvent = { status, fecha: new Date().toISOString(), nota: nota || `Status actualizado → ${sc?.label}` }
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

  const counts = {
    all: empresas.length,
    pending: empresas.filter(e => e.status === 'pending').length,
    in_review: empresas.filter(e => e.status === 'in_review').length,
    approved: empresas.filter(e => e.status === 'approved').length,
    rejected: empresas.filter(e => e.status === 'rejected').length,
  }

  const filtered = empresas
    .filter(e => filter === 'all' || e.status === filter)
    .filter(e => !search ||
      e.razon_social.toLowerCase().includes(search.toLowerCase()) ||
      e.rfc.toLowerCase().includes(search.toLowerCase()) ||
      (e.giro || '').toLowerCase().includes(search.toLowerCase())
    )

  // ─── Invitaciones helpers ─────────────────────────────────────────────────
  const loadInvitations = async () => {
    setInvLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token || sessionToken
    if (!token) { setInvLoading(false); return }
    const res = await fetch('/api/v1/invitations', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    const base = window.location.origin
    setInvitations((data.invitations || []).map((inv: Invitation) => ({
      ...inv, invite_url: `${base}/invite/${inv.token}`
    })))
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
    const inv: Invitation = { ...data.invitation, invite_url: data.invite_url }
    setInvJustCreated(inv)
    setInvitations(prev => [inv, ...prev])
    setInvEmail(''); setInvEmpresa('')
    setInvCreating(false)
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

  if (!authChecked && !loading) return null

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: cl.fontFamily, background: cl.gray50, overflow: 'hidden' }}>

      {/* TOP NAV */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '56px', background: cl.white, borderBottom: `1px solid ${cl.gray200}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="/gate" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: cl.gray500, textDecoration: 'none', fontSize: '0.82rem', fontWeight: '500', background: cl.gray100, border: `1px solid ${cl.gray200}`, borderRadius: '8px', padding: '0.35rem 0.75rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>
            Módulos
          </a>
          <div style={{ width: '1px', height: '18px', background: cl.gray200 }} />
          <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '20px', width: 'auto' }} />
          <div style={{ width: '1px', height: '18px', background: cl.gray200 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <IconBuilding size={15} color="#0F7BF4" />
            <span style={{ color: cl.gray700, fontSize: '0.82rem', fontWeight: '700' }}>KYC Admin</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: cl.gray50, border: `1px solid ${cl.gray200}`, borderRadius: '9999px', padding: '0.25rem 0.75rem 0.25rem 0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg,#0F7BF4,#3DFFA0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.62rem', fontWeight: '700' }}>
              {userEmail?.[0]?.toUpperCase() || 'A'}
            </div>
            <span style={{ color: cl.gray600, fontSize: '0.75rem', fontWeight: '500' }}>{userEmail}</span>
          </div>
          <button onClick={async () => { const { createClient } = await import('@/lib/supabase-client'); const s = createClient(); await s.auth.signOut(); window.location.href = '/login'; }} style={{ background: 'transparent', border: `1px solid ${cl.gray200}`, borderRadius: '8px', padding: '0.35rem 0.75rem', color: cl.gray500, fontSize: '0.78rem', cursor: 'pointer', fontFamily: cl.fontFamily, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Salir
          </button>
        </div>
      </div>

      {/* MAIN CONTENT - below nav */}
      <div style={{ display: 'flex', flex: 1, marginTop: '56px', overflow: 'hidden' }}>

      {/* LIST PANEL */}
      <div style={{ width: '320px', flexShrink: 0, background: cl.white, borderRight: `1px solid ${cl.gray200}`, display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Header */}
        <div style={{ padding: '0 1.25rem', borderBottom: `1px solid ${cl.gray100}`, height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' as const }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '18px', width: 'auto' }} />
            <div style={{ width: '1px', height: '16px', background: cl.gray200 }} />
            <span style={{ color: cl.gray500, fontSize: '0.75rem', fontWeight: '700' }}>KYC Admin</span>
          </div>
          <button
            onClick={() => { setSelected(null); setActiveTab('invitaciones'); loadInvitations() }}
            title="Invitaciones"
            style={{ background: '#EBF3FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '0.35rem 0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#0F7BF4', fontSize: '0.72rem', fontWeight: '700', fontFamily: cl.fontFamily }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Invitar
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${cl.gray100}` }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
              <IconSearch size={15} color={cl.gray400} />
            </div>
            <input
              placeholder="Buscar empresa, RFC, giro..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', background: cl.gray50, border: `1.5px solid ${cl.gray200}`,
                borderRadius: '9px', padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                color: cl.gray700, fontSize: '0.8rem', fontFamily: cl.fontFamily,
                outline: 'none', boxSizing: 'border-box' as const,
              }}
            />
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ padding: '0.6rem 1rem', borderBottom: `1px solid ${cl.gray100}`, display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {FILTERS.map(f => {
            const count = counts[f.k as keyof typeof counts]
            const isActive = filter === f.k
            return (
              <button key={f.k} onClick={() => setFilter(f.k)} style={{
                background: isActive ? '#EBF3FF' : cl.gray50,
                border: `1.5px solid ${isActive ? '#0F7BF4' : cl.gray200}`,
                borderRadius: '9999px', padding: '0.25rem 0.65rem',
                color: isActive ? '#0F7BF4' : cl.gray500,
                fontSize: '0.72rem', fontWeight: isActive ? '600' : '400',
                cursor: 'pointer', fontFamily: cl.fontFamily,
                display: 'flex', alignItems: 'center', gap: '0.3rem',
              }}>
                {f.label}
                {count > 0 && <span style={{
                  background: isActive ? '#0F7BF4' : cl.gray300,
                  color: isActive ? 'white' : cl.gray600,
                  fontSize: '0.6rem', fontWeight: '700',
                  width: '16px', height: '16px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{count}</span>}
              </button>
            )
          })}
        </div>

        {/* Stats row */}
        <div style={{ padding: '0.6rem 1rem', borderBottom: `1px solid ${cl.gray100}`, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: cl.gray400, fontSize: '0.72rem' }}>{filtered.length} expediente{filtered.length !== 1 ? 's' : ''}</span>
          <span style={{ color: cl.gray400, fontSize: '0.72rem' }}>Hoy: {new Date().toLocaleDateString('es-MX')}</span>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: cl.gray400 }}>
              <div style={{ width: '24px', height: '24px', border: '2.5px solid #EBF3FF', borderTopColor: '#0F7BF4', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 0.75rem' }} />
              <div style={{ fontSize: '0.82rem' }}>Cargando expedientes...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: cl.gray400 }}>
              <IconSearch size={28} color={cl.gray300} />
              <div style={{ fontSize: '0.85rem', marginTop: '0.75rem' }}>Sin resultados</div>
            </div>
          ) : filtered.map(e => {
            const sc = statusConfig[e.status] || statusConfig.pending
            const isSelected = selected?.id === e.id
            return (
              <div key={e.id} onClick={() => selectEmpresa(e)} style={{
                padding: '0.9rem 1.25rem', cursor: 'pointer',
                borderBottom: `1px solid ${cl.gray100}`,
                background: isSelected ? '#EBF3FF' : 'transparent',
                borderLeft: isSelected ? '3px solid #0F7BF4' : '3px solid transparent',
                transition: 'all 0.12s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                  <span style={{ color: isSelected ? '#0F7BF4' : cl.gray900, fontSize: '0.84rem', fontWeight: '600', flex: 1, marginRight: '0.5rem' }}>{e.razon_social}</span>
                  <span style={{
                    background: sc.bg, color: sc.color,
                    fontSize: '0.6rem', fontWeight: '700', padding: '0.18rem 0.5rem', borderRadius: '9999px',
                    flexShrink: 0, whiteSpace: 'nowrap',
                  }}>{sc.label}</span>
                </div>
                <div style={{ color: cl.gray400, fontSize: '0.73rem', fontFamily: 'monospace', letterSpacing: '0.03em', marginBottom: '0.2rem' }}>{e.rfc}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                  <span style={{ color: cl.gray400, fontSize: '0.7rem' }}>{e.giro || e.tipo_persona}</span>
                  <span style={{ color: cl.gray300, fontSize: '0.68rem' }}>{new Date(e.created_at).toLocaleDateString('es-MX')}</span>
                </div>
                {/* Quick actions */}
                {e.status === 'pending' || e.status === 'in_review' ? (
                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.6rem' }} onClick={ev => ev.stopPropagation()}>
                    <button onClick={() => { selectEmpresa(e); updateStatus('approved'); }} style={{ flex: 1, background: '#ECFDF5', border: '1px solid #BBF7D0', borderRadius: '6px', padding: '0.3rem', fontSize: '0.65rem', fontWeight: '700', color: '#065F46', cursor: 'pointer', fontFamily: cl.fontFamily, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                      <IconCheck size={11} color="#059669" strokeWidth={2.5} /> Aprobar
                    </button>
                    <button onClick={() => { selectEmpresa(e); updateStatus('rejected'); }} style={{ flex: 1, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '0.3rem', fontSize: '0.65rem', fontWeight: '700', color: '#991B1B', cursor: 'pointer', fontFamily: cl.fontFamily, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                      <IconX size={11} color="#EF4444" strokeWidth={2.5} /> Rechazar
                    </button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      {/* DETAIL PANEL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', background: cl.gray50 }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: cl.gray100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconBuilding size={28} color={cl.gray300} />
            </div>
            <div style={{ color: cl.gray400, fontSize: '0.9rem', fontWeight: '500' }}>Selecciona un expediente</div>
            <div style={{ color: cl.gray300, fontSize: '0.8rem' }}>{empresas.length} empresa{empresas.length !== 1 ? 's' : ''} registrada{empresas.length !== 1 ? 's' : ''}</div>
          </div>
        ) : (
          <>
            {/* Detail header */}
            <div style={{
              height: '60px', background: cl.white, borderBottom: `1px solid ${cl.gray200}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 1.75rem', flexShrink: 0,
            }}>
              <div>
                <h2 style={{ color: cl.gray900, fontSize: '1rem', fontWeight: '700', margin: 0, letterSpacing: '-0.01em' }}>{selected.razon_social}</h2>
                <div style={{ color: cl.gray400, fontSize: '0.73rem', fontFamily: 'monospace', marginTop: '0.1rem' }}>{selected.rfc} · {selected.tipo_persona}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {(() => { const sc = statusConfig[selected.status]; return (
                  <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.dot}30`, fontSize: '0.78rem', fontWeight: '700', padding: '0.35rem 0.9rem', borderRadius: '9999px' }}>
                    {sc.label}
                  </span>
                )})()}
                {/* Quick actions */}
                {selected.status !== 'approved' && (
                  <button onClick={() => updateStatus('approved')} disabled={saving} style={{ background: '#ECFDF5', border: '1.5px solid #A7F3D0', color: '#065F46', padding: '0.4rem 0.9rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600', fontFamily: cl.fontFamily, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <IconCheck size={14} color="#065F46" /> Aprobar
                  </button>
                )}
                {selected.status !== 'rejected' && (
                  <button onClick={() => updateStatus('rejected')} disabled={saving} style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', color: '#991B1B', padding: '0.4rem 0.9rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600', fontFamily: cl.fontFamily, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <IconX size={14} color="#991B1B" /> Rechazar
                  </button>
                )}
                {selected.status !== 'in_review' && (
                  <button onClick={() => updateStatus('in_review')} disabled={saving} style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1D4ED8', padding: '0.4rem 0.9rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600', fontFamily: cl.fontFamily, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <IconClock size={14} color="#1D4ED8" /> En revisión
                  </button>
                )}
              </div>
            </div>

            {/* Tab bar */}
            <div style={{ background: cl.white, borderBottom: `1px solid ${cl.gray200}`, padding: '0 1.75rem', display: 'flex', gap: '0', flexShrink: 0 }}>
              {([
                { id: 'datos', label: 'Datos', icon: <IconBuilding size={15} /> },
                { id: 'docs', label: 'Documentos', icon: <IconDoc size={15} /> },
                { id: 'ekatena', label: 'Ekatena', icon: <IconZap size={15} /> },
                { id: 'notas', label: 'Notas', icon: <IconNote size={15} /> },
                { id: 'historial', label: 'Historial', icon: <IconHistory size={15} /> },
                { id: 'invitaciones', label: 'Invitaciones', icon: <IconUser size={15} /> },
              ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(tab => (
                <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === 'invitaciones') loadInvitations() }} style={{
                  background: 'none', border: 'none', padding: '0.75rem 1rem',
                  color: activeTab === tab.id ? '#0F7BF4' : cl.gray400,
                  fontWeight: activeTab === tab.id ? '600' : '400',
                  fontSize: '0.82rem', cursor: 'pointer', fontFamily: cl.fontFamily,
                  borderBottom: activeTab === tab.id ? '2px solid #0F7BF4' : '2px solid transparent',
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  transition: 'color 0.15s',
                }}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.75rem', background: cl.gray50 }}>
              <div style={{ maxWidth: '820px' }}>

                {/* DATOS TAB */}
                {activeTab === 'datos' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <Card title="Empresa" icon={<IconBuilding size={16} color="#0F7BF4" />}>
                      <DRow l="Razón Social" v={selected.razon_social} />
                      <DRow l="RFC" v={selected.rfc} mono />
                      <DRow l="Tipo Persona" v={selected.tipo_persona === 'moral' ? 'Persona Moral' : 'Persona Física'} />
                      <DRow l="Giro / Sector" v={selected.giro || '—'} />
                      <DRow l="País" v={selected.pais} />
                      <DRow l="Fecha de solicitud" v={new Date(selected.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })} />
                    </Card>
                    <Card title="Representante Legal" icon={<IconUser size={16} color="#0F7BF4" />}>
                      <DRow l="Nombre completo" v={selected.rep_legal_nombre || '—'} />
                      <DRow l="CURP" v={selected.rep_legal_curp || '—'} mono />
                    </Card>
                  </div>
                )}

                {/* DOCS TAB */}
                {activeTab === 'docs' && (
                  <Card title="Documentos del Expediente" icon={<IconDoc size={16} color="#0F7BF4" />}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', paddingTop: '0.5rem' }}>
                      {[
                        { label: 'Acta Constitutiva', url: selected.acta_constitutiva_url },
                        { label: 'Comprobante de Domicilio', url: selected.comprobante_domicilio_url },
                        { label: 'ID Representante Legal', url: selected.identificacion_rep_url },
                      ].map(doc => (
                        <div key={doc.label} style={{
                          border: `1.5px solid ${doc.url ? '#3DFFA040' : cl.gray200}`,
                          background: doc.url ? '#F0FDF9' : cl.gray50,
                          borderRadius: '12px', padding: '1.25rem', textAlign: 'center',
                        }}>
                          <div style={{ marginBottom: '0.75rem' }}>
                            <IconDoc size={28} color={doc.url ? '#3DFFA0' : cl.gray300} />
                          </div>
                          <div style={{ color: doc.url ? '#065F46' : cl.gray400, fontSize: '0.78rem', fontWeight: '600', marginBottom: '0.5rem' }}>{doc.label}</div>
                          {doc.url
                            ? <a href={doc.url} target="_blank" rel="noreferrer" style={{ color: '#0F7BF4', fontSize: '0.75rem', fontWeight: '600' }}>Ver documento →</a>
                            : <span style={{ color: cl.gray300, fontSize: '0.73rem' }}>No cargado</span>
                          }
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* EKATENA TAB */}
                {activeTab === 'ekatena' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <Card title="Score Ekatena" icon={<IconZap size={16} color="#0F7BF4" />}>
                      <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                        <div style={{ fontSize: '3rem', fontWeight: '800', color: cl.gray200, letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>—</div>
                        {(selected.metadata?.ekatena_conectado as boolean)
                          ? <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '0.6rem', color: '#065F46', fontSize: '0.8rem', fontWeight: '600' }}>
                              ⚡ Ekatena conectado · Procesando score
                            </div>
                          : <div style={{ background: cl.gray50, border: `1px solid ${cl.gray200}`, borderRadius: '8px', padding: '0.6rem', color: cl.gray400, fontSize: '0.78rem' }}>
                              Integración pendiente
                            </div>
                        }
                        {!!(selected.metadata as Record<string,unknown>)?.ekatena_rfc && (
                          <div style={{ color: cl.gray400, fontSize: '0.72rem', marginTop: '0.5rem', fontFamily: 'monospace' }}>
                            RFC consultado: {String((selected.metadata as Record<string,unknown>)?.ekatena_rfc ?? "")}
                          </div>
                        )}
                      </div>
                    </Card>
                    <Card title="Buró de Crédito" icon={<IconCreditCard size={16} color="#0F7BF4" />}>
                      <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                        <div style={{ fontSize: '3rem', fontWeight: '800', color: cl.gray200, letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>—</div>
                        <div style={{ background: cl.gray50, border: `1px solid ${cl.gray200}`, borderRadius: '8px', padding: '0.6rem', color: cl.gray400, fontSize: '0.78rem' }}>
                          Integración pendiente
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* NOTAS TAB */}
                {activeTab === 'notas' && (
                  <Card title="Notas Internas" icon={<IconNote size={16} color="#0F7BF4" />}>
                    <p style={{ color: cl.gray400, fontSize: '0.8rem', margin: '0 0 1rem' }}>
                      Observaciones, documentos faltantes o comentarios de revisión. Solo visibles para el equipo de Crowdlink.
                    </p>
                    <textarea
                      value={nota} onChange={e => setNota(e.target.value)}
                      placeholder="Escribir nota interna..."
                      style={{
                        width: '100%', minHeight: '140px',
                        background: cl.gray50, border: `1.5px solid ${cl.gray200}`,
                        borderRadius: '10px', padding: '0.9rem',
                        color: cl.gray700, fontSize: '0.88rem', fontFamily: cl.fontFamily,
                        outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const,
                        lineHeight: 1.65,
                      }}
                    />
                    <button onClick={saveNota} disabled={saving} style={{
                      marginTop: '0.75rem', background: '#0F7BF4',
                      border: 'none', borderRadius: '9px',
                      padding: '0.6rem 1.25rem', color: 'white',
                      cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600', fontFamily: cl.fontFamily,
                      opacity: saving ? 0.6 : 1,
                    }}>
                      {saving ? 'Guardando...' : 'Guardar nota'}
                    </button>
                  </Card>
                )}

                {/* HISTORIAL TAB */}
                {activeTab === 'historial' && (
                  <Card title="Historial de Cambios" icon={<IconHistory size={16} color="#0F7BF4" />}>
                    <div style={{ paddingTop: '0.5rem' }}>
                      {[...historial].reverse().map((h, i) => {
                        const sc = statusConfig[h.status] || statusConfig.pending
                        return (
                          <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', paddingBottom: '1rem', position: 'relative' }}>
                            <div style={{ flexShrink: 0, marginTop: '2px' }}>
                              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: sc.dot, boxShadow: `0 0 6px ${sc.dot}60` }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                <span style={{ background: sc.bg, color: sc.color, fontSize: '0.72rem', fontWeight: '700', padding: '0.15rem 0.55rem', borderRadius: '9999px' }}>{sc.label}</span>
                                <span style={{ color: cl.gray400, fontSize: '0.72rem' }}>
                                  {new Date(h.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                              {h.nota && <p style={{ color: cl.gray500, fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>{h.nota}</p>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )}

                {/* ── INVITACIONES TAB ── */}
                {activeTab === 'invitaciones' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1rem', alignItems: 'start' }}>

                    {/* Formulario nueva invitación */}
                    <Card title="Nueva Invitación" icon={<IconUser size={16} color="#0F7BF4" />}>
                      {!invJustCreated ? (
                        <div style={{ display: 'grid', gap: '0.9rem' }}>
                          <div>
                            <label style={{ color: cl.gray700, fontSize: '0.78rem', fontWeight: '600', display: 'block', marginBottom: '0.4rem' }}>Email del cliente *</label>
                            <input
                              type="email" value={invEmail}
                              onChange={e => setInvEmail(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleCreateInv()}
                              placeholder="cliente@empresa.com"
                              autoFocus
                              style={{ width: '100%', background: cl.white, border: `1.5px solid ${cl.gray200}`, borderRadius: '8px', padding: '0.65rem 0.9rem', color: cl.gray800, fontSize: '0.85rem', fontFamily: cl.fontFamily, outline: 'none', boxSizing: 'border-box' as const }}
                            />
                          </div>
                          <div>
                            <label style={{ color: cl.gray700, fontSize: '0.78rem', fontWeight: '600', display: 'block', marginBottom: '0.4rem' }}>Empresa (opcional)</label>
                            <input
                              value={invEmpresa}
                              onChange={e => setInvEmpresa(e.target.value)}
                              placeholder="Empresa SA de CV"
                              style={{ width: '100%', background: cl.white, border: `1.5px solid ${cl.gray200}`, borderRadius: '8px', padding: '0.65rem 0.9rem', color: cl.gray800, fontSize: '0.85rem', fontFamily: cl.fontFamily, outline: 'none', boxSizing: 'border-box' as const }}
                            />
                          </div>
                          {invError && (
                            <div style={{ color: '#DC2626', fontSize: '0.75rem', background: '#FEF2F2', padding: '0.5rem 0.75rem', borderRadius: '7px', border: '1px solid #FECACA' }}>{invError}</div>
                          )}
                          <button onClick={handleCreateInv} disabled={invCreating || !invEmail.trim()} style={{ background: '#0F7BF4', color: 'white', border: 'none', borderRadius: '8px', padding: '0.65rem', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', fontFamily: cl.fontFamily, opacity: invCreating || !invEmail.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            {invCreating ? 'Generando...' : (
                              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Generar invitación</>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div style={{ background: '#ECFDF5', border: '1.5px solid #6EE7B7', borderRadius: '10px', padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                            <IconCheck size={18} color="#059669" strokeWidth={2.5} />
                            <div>
                              <div style={{ color: '#065F46', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.2rem' }}>Invitación generada</div>
                              <div style={{ color: '#4B7A60', fontSize: '0.75rem' }}>{invJustCreated.email}</div>
                            </div>
                          </div>
                          <div style={{ background: cl.gray50, border: `1px solid ${cl.gray200}`, borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem' }}>
                            <div style={{ color: cl.gray400, fontSize: '0.63rem', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>LINK</div>
                            <div style={{ color: cl.gray600, fontSize: '0.72rem', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: '0.65rem', lineHeight: 1.5 }}>{invJustCreated.invite_url}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                              <button onClick={() => copyInvLink(invJustCreated.invite_url || '')} style={{ background: invCopied ? '#ECFDF5' : cl.white, border: `1.5px solid ${invCopied ? '#6EE7B7' : cl.gray200}`, borderRadius: '7px', padding: '0.5rem', fontSize: '0.75rem', fontWeight: '700', color: invCopied ? '#065F46' : cl.gray600, cursor: 'pointer', fontFamily: cl.fontFamily }}>
                                {invCopied ? '¡Copiado!' : 'Copiar link'}
                              </button>
                              <button onClick={() => setInvQrModal(invJustCreated)} style={{ background: '#EBF3FF', border: '1.5px solid #BFDBFE', borderRadius: '7px', padding: '0.5rem', fontSize: '0.75rem', fontWeight: '700', color: '#0F7BF4', cursor: 'pointer', fontFamily: cl.fontFamily }}>
                                Ver QR
                              </button>
                            </div>
                          </div>
                          <button onClick={() => setInvJustCreated(null)} style={{ width: '100%', background: cl.gray100, border: `1px solid ${cl.gray200}`, borderRadius: '8px', padding: '0.55rem', fontSize: '0.8rem', fontWeight: '600', color: cl.gray500, cursor: 'pointer', fontFamily: cl.fontFamily }}>
                            Nueva invitación
                          </button>
                        </div>
                      )}
                    </Card>

                    {/* Tabla de invitaciones */}
                    <Card title={`Invitaciones enviadas (${invitations.length})`} icon={<IconHistory size={16} color="#0F7BF4" />}>
                      {invLoading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: cl.gray400, fontSize: '0.82rem' }}>Cargando...</div>
                      ) : invitations.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: cl.gray400, fontSize: '0.82rem' }}>Sin invitaciones generadas</div>
                      ) : (
                        <div>
                          {invitations.map(inv => {
                            const st = invStatus(inv)
                            return (
                              <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', borderBottom: `1px solid ${cl.gray100}` }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ color: cl.gray800, fontSize: '0.82rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.email}</div>
                                  <div style={{ color: cl.gray400, fontSize: '0.72rem', marginTop: '0.1rem' }}>
                                    {inv.nombre_empresa || '—'} · {new Date(inv.created_at).toLocaleDateString('es-MX')}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: '0.75rem' }}>
                                  <span style={{ background: st.bg, color: st.color, fontSize: '0.65rem', fontWeight: '700', padding: '0.15rem 0.5rem', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: st.dot }} />
                                    {st.label}
                                  </span>
                                  {!inv.used && new Date(inv.expires_at) > new Date() && (
                                    <button onClick={() => setInvQrModal(inv)} style={{ background: '#EBF3FF', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.68rem', fontWeight: '700', color: '#0F7BF4', cursor: 'pointer', fontFamily: cl.fontFamily }}>QR</button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </Card>
                  </div>
                )}

              </div>
            </div>
          </>
        )}
      </div>

      </div>{/* end MAIN CONTENT */}

      {/* QR Modal */}
      {mounted && invQrModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setInvQrModal(null)}>
          <div style={{ background: cl.white, borderRadius: '18px', padding: '2rem', width: '100%', maxWidth: '380px', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ color: cl.gray900, fontSize: '1rem', fontWeight: '800', margin: '0 0 0.2rem' }}>Código QR</h3>
                <div style={{ color: cl.gray400, fontSize: '0.78rem' }}>{invQrModal.email}</div>
              </div>
              <button onClick={() => setInvQrModal(null)} style={{ background: cl.gray100, border: 'none', borderRadius: '8px', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconX size={15} color={cl.gray500} />
              </button>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'inline-block', background: 'white', border: `1px solid ${cl.gray200}`, borderRadius: '12px', padding: '1rem' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(invQrModal.invite_url || '')}&color=0F7BF4&bgcolor=ffffff&qzone=2&format=png`}
                  alt="QR" width={200} height={200} style={{ display: 'block' }}
                />
                <div style={{ marginTop: '0.6rem', color: cl.gray400, fontSize: '0.65rem', fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: '200px', lineHeight: 1.4 }}>
                  {invQrModal.invite_url}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(invQrModal.invite_url || '')}&color=0F7BF4&bgcolor=ffffff&qzone=2&format=png`}
                download={`qr-kyc-${invQrModal.email.split('@')[0]}.png`}
                target="_blank" rel="noreferrer"
                style={{ background: '#0F7BF4', color: 'white', borderRadius: '9px', padding: '0.65rem', fontSize: '0.8rem', fontWeight: '700', textAlign: 'center', textDecoration: 'none', display: 'block' }}
              >
                Descargar PNG
              </a>
              <button onClick={() => copyInvLink(invQrModal.invite_url || '')} style={{ background: invCopied ? '#ECFDF5' : cl.gray100, border: `1.5px solid ${invCopied ? '#6EE7B7' : cl.gray200}`, borderRadius: '9px', padding: '0.65rem', fontSize: '0.8rem', fontWeight: '700', color: invCopied ? '#065F46' : cl.gray600, cursor: 'pointer', fontFamily: cl.fontFamily }}>
                {invCopied ? '¡Copiado!' : 'Copiar link'}
              </button>
            </div>
            <div style={{ marginTop: '0.75rem', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '0.55rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <IconClock size={13} color="#B45309" />
              <span style={{ color: '#92400E', fontSize: '0.72rem' }}>Expira: {new Date(invQrModal.expires_at).toLocaleString('es-MX')}</span>
            </div>
          </div>
        </div>
      )}

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); @keyframes spin { to { transform: rotate(360deg); } } input:focus { border-color: #0F7BF4 !important; }`}</style>
    </div>
  )
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ padding: '0.85rem 1.25rem', borderBottom: `1px solid ${cl.gray100}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {icon}
        <span style={{ color: cl.gray700, fontSize: '0.82rem', fontWeight: '700' }}>{title}</span>
      </div>
      <div style={{ padding: '1.1rem 1.25rem' }}>{children}</div>
    </div>
  )
}

function DRow({ l, v, mono }: { l: string; v: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: `1px solid ${cl.gray50}` }}>
      <span style={{ color: cl.gray400, fontSize: '0.78rem', flexShrink: 0, marginRight: '1rem' }}>{l}</span>
      <span style={{ color: cl.gray800, fontSize: mono ? '0.75rem' : '0.82rem', fontFamily: mono ? 'monospace' : cl.fontFamily, fontWeight: '500', textAlign: 'right' }}>{v}</span>
    </div>
  )
}
