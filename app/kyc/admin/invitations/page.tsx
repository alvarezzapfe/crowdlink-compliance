'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'
import { cl } from '@/lib/design'
import Nav from '@/components/Nav'
import { IconDoc, IconCheck, IconX, IconClock, IconSearch, IconUser } from '@/components/Icons'

interface Invitation {
  id: string; token: string; email: string; nombre_empresa: string
  used: boolean; used_at: string | null; expires_at: string; created_at: string
  invite_url?: string
}

type Modal = 'create' | 'qr' | null

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [sessionToken, setSessionToken] = useState('')
  const [modal, setModal] = useState<Modal>(null)
  const [search, setSearch] = useState('')
  const [selectedInv, setSelectedInv] = useState<Invitation | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')

  // Create form
  const [newEmail, setNewEmail] = useState('')
  const [newEmpresa, setNewEmpresa] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [justCreated, setJustCreated] = useState<Invitation | null>(null)
  const [copied, setCopied] = useState(false)

  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUserEmail(user.email || '')
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        setSessionToken(session.access_token)
        await loadInvitations(session.access_token)
      }
    }
    load()
  }, [])

  const loadInvitations = async (token: string) => {
    setLoading(true)
    const res = await fetch('/api/v1/invitations', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    const baseUrl = window.location.origin
    setInvitations((data.invitations || []).map((inv: Invitation) => ({
      ...inv,
      invite_url: `${baseUrl}/invite/${inv.token}`,
    })))
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!newEmail.trim()) { setCreateError('Email requerido'); return }
    setCreating(true); setCreateError(''); setJustCreated(null)

    const res = await fetch('/api/v1/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
      body: JSON.stringify({ email: newEmail.trim().toLowerCase(), nombre_empresa: newEmpresa.trim() }),
    })
    const data = await res.json()

    if (!res.ok) { setCreateError(data.error || 'Error al crear'); setCreating(false); return }

    const inv: Invitation = {
      ...data.invitation,
      invite_url: data.invite_url,
    }
    setJustCreated(inv)
    setInvitations(prev => [inv, ...prev])
    setNewEmail(''); setNewEmpresa('')
    setCreating(false)
  }

  const openQR = async (inv: Invitation) => {
    setSelectedInv(inv)
    setModal('qr')
    setQrDataUrl('')
    // Generar QR usando API pública qrserver.com (no requiere librería)
    const url = encodeURIComponent(inv.invite_url || '')
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${url}&color=0F7BF4&bgcolor=ffffff&qzone=2&format=png`
    setQrDataUrl(qrUrl)
  }

  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadQR = () => {
    if (!qrDataUrl || !selectedInv) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `qr-kyc-${selectedInv.email.split('@')[0]}.png`
    a.click()
  }

  const invStatus = (inv: Invitation) => {
    if (inv.used) return { label: 'Usado', color: '#065F46', bg: '#ECFDF5', dot: '#10B981' }
    if (new Date(inv.expires_at) < new Date()) return { label: 'Expirado', color: '#991B1B', bg: '#FEF2F2', dot: '#EF4444' }
    return { label: 'Activo', color: '#1D4ED8', bg: '#EFF6FF', dot: '#3B82F6' }
  }

  const filtered = invitations.filter(inv =>
    !search ||
    inv.email.toLowerCase().includes(search.toLowerCase()) ||
    (inv.nombre_empresa || '').toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: invitations.length,
    active: invitations.filter(i => !i.used && new Date(i.expires_at) > new Date()).length,
    used: invitations.filter(i => i.used).length,
    expired: invitations.filter(i => !i.used && new Date(i.expires_at) < new Date()).length,
  }

  return (
    <div style={{ minHeight: '100vh', background: cl.gray50, fontFamily: cl.fontFamily }}>
      <Nav userEmail={userEmail} back={{ href: '/kyc/admin', label: 'Panel Admin' }} title="Invitaciones KYC" />
      <div style={{ paddingTop: '60px' }}>

        {/* Header */}
        <div style={{ background: cl.white, borderBottom: `1px solid ${cl.gray200}`, padding: '2rem 2rem 1.5rem' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0F7BF4' }} />
                <span style={{ color: '#0F7BF4', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.06em' }}>KYC EMPRESAS</span>
              </div>
              <h1 style={{ color: cl.gray900, fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>Invitaciones</h1>
              <p style={{ color: cl.gray400, fontSize: '0.85rem', margin: 0 }}>Genera links y QRs para que tus clientes completen el KYC</p>
            </div>
            <button onClick={() => { setModal('create'); setJustCreated(null) }} style={{ background: '#0F7BF4', color: 'white', border: 'none', borderRadius: '10px', padding: '0.7rem 1.4rem', fontSize: '0.88rem', fontWeight: '700', cursor: 'pointer', fontFamily: cl.fontFamily, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nueva invitación
            </button>
          </div>
        </div>

        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total', value: stats.total, color: cl.gray700, bg: cl.white },
              { label: 'Activas', value: stats.active, color: '#1D4ED8', bg: '#EFF6FF' },
              { label: 'Usadas', value: stats.used, color: '#065F46', bg: '#ECFDF5' },
              { label: 'Expiradas', value: stats.expired, color: '#991B1B', bg: '#FEF2F2' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, border: `1px solid ${cl.gray200}`, borderRadius: '12px', padding: '1.1rem 1.25rem', textAlign: 'center' }}>
                <div style={{ color: s.color, fontSize: '1.75rem', fontWeight: '800', lineHeight: 1 }}>{s.value}</div>
                <div style={{ color: cl.gray400, fontSize: '0.75rem', marginTop: '0.3rem', fontWeight: '500' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }}>
              <IconSearch size={16} color={cl.gray400} />
            </div>
            <input
              placeholder="Buscar por email o empresa..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', background: cl.white, border: `1.5px solid ${cl.gray200}`, borderRadius: '10px', padding: '0.75rem 1rem 0.75rem 2.75rem', color: cl.gray700, fontSize: '0.88rem', fontFamily: cl.fontFamily, outline: 'none', boxSizing: 'border-box' as const }}
            />
          </div>

          {/* Table */}
          <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: cl.gray50, borderBottom: `1px solid ${cl.gray200}` }}>
                  {['Email', 'Empresa', 'Estado', 'Creada', 'Expira', 'Acciones'].map(h => (
                    <th key={h} style={{ color: cl.gray500, fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.05em', textAlign: 'left', padding: '0.75rem 1.25rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: cl.gray400 }}>Cargando...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: cl.gray400 }}>
                    <IconUser size={32} color={cl.gray200} />
                    <div style={{ marginTop: '0.75rem', fontSize: '0.88rem' }}>Sin invitaciones aún</div>
                  </td></tr>
                ) : filtered.map(inv => {
                  const st = invStatus(inv)
                  return (
                    <tr key={inv.id} style={{ borderBottom: `1px solid ${cl.gray100}` }}>
                      <td style={{ padding: '0.9rem 1.25rem', color: cl.gray800, fontWeight: '600' }}>{inv.email}</td>
                      <td style={{ padding: '0.9rem 1.25rem', color: cl.gray500 }}>{inv.nombre_empresa || '—'}</td>
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <span style={{ background: st.bg, color: st.color, fontSize: '0.68rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: st.dot }} />
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem', color: cl.gray400, fontSize: '0.78rem' }}>
                        {new Date(inv.created_at).toLocaleDateString('es-MX')}
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem', color: cl.gray400, fontSize: '0.78rem' }}>
                        {new Date(inv.expires_at).toLocaleDateString('es-MX')}
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={() => copyLink(inv.invite_url || '')} title="Copiar link" style={{ background: cl.gray100, border: `1px solid ${cl.gray200}`, borderRadius: '7px', padding: '0.4rem 0.7rem', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '600', color: cl.gray600, fontFamily: cl.fontFamily }}>
                            Copiar link
                          </button>
                          <button onClick={() => openQR(inv)} title="Ver QR" style={{ background: '#EBF3FF', border: '1px solid #BFDBFE', borderRadius: '7px', padding: '0.4rem 0.7rem', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '600', color: '#0F7BF4', fontFamily: cl.fontFamily }}>
                            QR
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
      </div>

      {/* ── MODAL: Crear invitación ── */}
      {modal === 'create' && (
        <ModalOverlay onClose={() => setModal(null)}>
          <h2 style={{ color: cl.gray900, fontSize: '1.15rem', fontWeight: '800', margin: '0 0 0.4rem' }}>Nueva invitación</h2>
          <p style={{ color: cl.gray400, fontSize: '0.82rem', margin: '0 0 1.75rem' }}>El cliente recibirá un link único para completar su KYC.</p>

          {!justCreated ? (
            <div style={{ display: 'grid', gap: '1.1rem' }}>
              <div>
                <label style={lbl}>Email del cliente *</label>
                <input
                  type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="cliente@empresa.com"
                  style={inp} autoFocus
                />
              </div>
              <div>
                <label style={lbl}>Nombre / Razón Social (opcional)</label>
                <input
                  value={newEmpresa} onChange={e => setNewEmpresa(e.target.value)}
                  placeholder="Empresa SA de CV"
                  style={inp}
                />
              </div>
              {createError && (
                <div style={{ color: '#DC2626', fontSize: '0.78rem', background: '#FEF2F2', padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid #FECACA' }}>{createError}</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', paddingTop: '0.5rem' }}>
                <button onClick={() => setModal(null)} style={{ background: cl.gray100, border: `1px solid ${cl.gray200}`, borderRadius: '9px', padding: '0.65rem 1.25rem', color: cl.gray600, cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', fontFamily: cl.fontFamily }}>Cancelar</button>
                <button onClick={handleCreate} disabled={creating || !newEmail.trim()} style={{ background: '#0F7BF4', color: 'white', border: 'none', borderRadius: '9px', padding: '0.65rem 1.5rem', fontSize: '0.88rem', fontWeight: '700', cursor: 'pointer', fontFamily: cl.fontFamily, opacity: creating || !newEmail.trim() ? 0.5 : 1 }}>
                  {creating ? 'Generando...' : 'Generar invitación'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ background: '#ECFDF5', border: '1.5px solid #6EE7B7', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <IconCheck size={20} color="#059669" strokeWidth={2.5} />
                <div>
                  <div style={{ color: '#065F46', fontSize: '0.88rem', fontWeight: '700', marginBottom: '0.25rem' }}>Invitación generada</div>
                  <div style={{ color: '#4B7A60', fontSize: '0.78rem' }}>Copia el link o descarga el QR para enviarlo manualmente.</div>
                </div>
              </div>

              <div style={{ background: cl.gray50, border: `1px solid ${cl.gray200}`, borderRadius: '10px', padding: '0.9rem 1.1rem', marginBottom: '1rem' }}>
                <div style={{ color: cl.gray400, fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>LINK DE INVITACIÓN</div>
                <div style={{ color: cl.gray700, fontSize: '0.78rem', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: '0.75rem' }}>{justCreated.invite_url}</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => copyLink(justCreated.invite_url || '')} style={{ flex: 1, background: copied ? '#ECFDF5' : cl.white, border: `1.5px solid ${copied ? '#6EE7B7' : cl.gray200}`, borderRadius: '8px', padding: '0.6rem', fontSize: '0.8rem', fontWeight: '700', color: copied ? '#065F46' : cl.gray600, cursor: 'pointer', fontFamily: cl.fontFamily }}>
                    {copied ? 'Copiado!' : 'Copiar link'}
                  </button>
                  <button onClick={() => { openQR(justCreated); setModal('qr') }} style={{ flex: 1, background: '#EBF3FF', border: '1.5px solid #BFDBFE', borderRadius: '8px', padding: '0.6rem', fontSize: '0.8rem', fontWeight: '700', color: '#0F7BF4', cursor: 'pointer', fontFamily: cl.fontFamily }}>
                    Ver QR
                  </button>
                </div>
              </div>

              <button onClick={() => { setModal(null); setJustCreated(null) }} style={{ width: '100%', background: cl.gray100, border: `1px solid ${cl.gray200}`, borderRadius: '9px', padding: '0.7rem', fontSize: '0.85rem', fontWeight: '600', color: cl.gray600, cursor: 'pointer', fontFamily: cl.fontFamily }}>
                Cerrar
              </button>
            </div>
          )}
        </ModalOverlay>
      )}

      {/* ── MODAL: QR ── */}
      {modal === 'qr' && selectedInv && (
        <ModalOverlay onClose={() => setModal(null)}>
          <h2 style={{ color: cl.gray900, fontSize: '1.1rem', fontWeight: '800', margin: '0 0 0.25rem' }}>Código QR</h2>
          <p style={{ color: cl.gray400, fontSize: '0.8rem', margin: '0 0 1.5rem' }}>{selectedInv.email} · {selectedInv.nombre_empresa || 'Sin empresa'}</p>

          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            {qrDataUrl ? (
              <div style={{ display: 'inline-block', background: 'white', border: `1px solid ${cl.gray200}`, borderRadius: '12px', padding: '1rem' }}>
                <img src={qrDataUrl} alt="QR Code" width={220} height={220} style={{ display: 'block' }} />
                <div style={{ marginTop: '0.75rem', color: cl.gray400, fontSize: '0.68rem', fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: '220px' }}>
                  {selectedInv.invite_url}
                </div>
              </div>
            ) : (
              <div style={{ width: '220px', height: '220px', background: cl.gray50, border: `1px dashed ${cl.gray200}`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <div style={{ width: '28px', height: '28px', border: '3px solid #EBF3FF', borderTopColor: '#0F7BF4', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            <button onClick={downloadQR} disabled={!qrDataUrl} style={{ background: '#0F7BF4', color: 'white', border: 'none', borderRadius: '9px', padding: '0.7rem', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', fontFamily: cl.fontFamily, opacity: !qrDataUrl ? 0.5 : 1 }}>
              Descargar PNG
            </button>
            <button onClick={() => copyLink(selectedInv.invite_url || '')} style={{ background: copied ? '#ECFDF5' : cl.gray100, border: `1.5px solid ${copied ? '#6EE7B7' : cl.gray200}`, borderRadius: '9px', padding: '0.7rem', fontSize: '0.82rem', fontWeight: '700', color: copied ? '#065F46' : cl.gray600, cursor: 'pointer', fontFamily: cl.fontFamily }}>
              {copied ? 'Copiado!' : 'Copiar link'}
            </button>
          </div>

          <div style={{ marginTop: '0.75rem', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '0.65rem 0.9rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <IconClock size={14} color="#B45309" />
            <span style={{ color: '#92400E', fontSize: '0.74rem' }}>Expira: {new Date(selectedInv.expires_at).toLocaleString('es-MX')}</span>
          </div>
        </ModalOverlay>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { border-color: #0F7BF4 !important; box-shadow: 0 0 0 3px #EBF3FF; outline: none; }
      `}</style>
    </div>
  )
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ background: cl.white, borderRadius: '18px', padding: '2rem', width: '100%', maxWidth: '480px', boxShadow: '0 24px 48px rgba(0,0,0,0.18)', position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: cl.gray100, border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconX size={16} color={cl.gray500} />
        </button>
        {children}
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { color: '#334155', fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.45rem' }
const inp: React.CSSProperties = { width: '100%', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '9px', padding: '0.75rem 1rem', color: '#1E293B', fontSize: '0.88rem', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' as const }
