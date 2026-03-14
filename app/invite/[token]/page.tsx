'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { cl } from '@/lib/design'
import { IconCheck, IconX, IconClock, IconShield } from '@/components/Icons'

type State = 'loading' | 'valid' | 'used' | 'expired' | 'invalid' | 'authenticating' | 'done' | 'error'

export default function InvitePage() {
  const params = useParams()
  const token = params.token as string
  const [state, setState] = useState<State>('loading')
  const [invitation, setInvitation] = useState<{ email: string; nombre_empresa: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => { if (token) validateToken() }, [token])

  const validateToken = async () => {
    try {
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!UUID_REGEX.test(token)) { setState('invalid'); return }
      const res = await fetch('/api/v1/invitations/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      const data = await res.json()
      if (!res.ok) { setState(data.code === 'USED' ? 'used' : data.code === 'EXPIRED' ? 'expired' : 'invalid'); return }
      setInvitation({ email: data.email, nombre_empresa: data.nombre_empresa })
      setState('valid')
    } catch { setState('error'); setErrorMsg('Error de red.') }
  }

  const handleAccess = async () => {
    if (!invitation) return
    setState('authenticating')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({ email: invitation.email, options: { emailRedirectTo: `${window.location.origin}/invite/${token}/callback`, shouldCreateUser: true } })
      if (error) throw error
      setState('done')
    } catch (e) { setState('error'); setErrorMsg(e instanceof Error ? e.message : 'Error') }
  }

  return (
    <div style={{ minHeight: '100vh', background: cl.gray50, fontFamily: cl.fontFamily, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '26px', width: 'auto' }} />
          <div style={{ color: cl.gray400, fontSize: '0.75rem', marginTop: '0.4rem' }}>Compliance Hub</div>
        </div>
        <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '20px', padding: '2.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
          {state === 'loading' && <Center><Spinner /><Txt>Verificando invitación...</Txt></Center>}
          {state === 'authenticating' && <Center><Spinner /><Txt>Enviando acceso...</Txt></Center>}
          {state === 'valid' && invitation && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <Ico bg="#EBF3FF" border="#BFDBFE"><IconShield size={24} color="#0F7BF4" /></Ico>
                <h1 style={{ color: cl.gray900, fontSize: '1.3rem', fontWeight: '800', margin: '0 0 0.5rem' }}>{invitation.nombre_empresa ? `Bienvenido, ${invitation.nombre_empresa}` : 'Invitación KYC'}</h1>
                <p style={{ color: cl.gray500, fontSize: '0.85rem', margin: 0, lineHeight: 1.65 }}>Crowdlink te invitó a completar el proceso de verificación KYC.</p>
              </div>
              <div style={{ background: cl.gray50, border: `1px solid ${cl.gray200}`, borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{ color: cl.gray400, fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>ACCESO PARA</div>
                <div style={{ color: cl.gray800, fontSize: '0.9rem', fontWeight: '600', fontFamily: 'monospace' }}>{invitation.email}</div>
              </div>
              <button onClick={handleAccess} style={{ width: '100%', background: '#0F7BF4', color: 'white', border: 'none', borderRadius: '10px', padding: '0.9rem', fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer', fontFamily: cl.fontFamily }}>Acceder al formulario KYC →</button>
            </div>
          )}
          {state === 'done' && invitation && (
            <div style={{ textAlign: 'center' }}>
              <Ico bg="#ECFDF5" border="#6EE7B7"><IconCheck size={24} color="#059669" strokeWidth={2.5} /></Ico>
              <h2 style={{ color: cl.gray900, fontSize: '1.2rem', fontWeight: '800', margin: '0 0 0.5rem' }}>Revisa tu correo</h2>
              <p style={{ color: cl.gray500, fontSize: '0.87rem', lineHeight: 1.7, margin: 0 }}>Enviamos un link a <strong>{invitation.email}</strong>. Ábrelo para acceder al formulario KYC.</p>
            </div>
          )}
          {state === 'used' && <StatusCard icon={<IconCheck size={24} color="#059669" strokeWidth={2.5} />} bg="#ECFDF5" border="#6EE7B7" title="Invitación ya utilizada" desc="Este link ya fue usado. Contacta al equipo de Crowdlink si necesitas acceso nuevamente." />}
          {state === 'expired' && <StatusCard icon={<IconClock size={24} color="#D97706" />} bg="#FFFBEB" border="#FDE68A" title="Invitación expirada" desc="Este link venció (72h). Solicita una nueva invitación al equipo de Crowdlink." />}
          {state === 'invalid' && <StatusCard icon={<IconX size={24} color="#DC2626" strokeWidth={2.5} />} bg="#FEF2F2" border="#FECACA" title="Link inválido" desc="Este link no existe o fue modificado. Verifica que copiaste el link completo." />}
          {state === 'error' && (
            <div style={{ textAlign: 'center' }}>
              <StatusCard icon={<IconX size={24} color="#DC2626" strokeWidth={2.5} />} bg="#FEF2F2" border="#FECACA" title="Error" desc={errorMsg || 'Error inesperado.'} />
              <button onClick={validateToken} style={{ marginTop: '1rem', background: cl.gray100, border: `1px solid ${cl.gray200}`, borderRadius: '8px', padding: '0.6rem 1.25rem', color: cl.gray600, cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600', fontFamily: cl.fontFamily }}>Intentar de nuevo</button>
            </div>
          )}
        </div>
        <p style={{ color: cl.gray400, fontSize: '0.72rem', textAlign: 'center', marginTop: '1.5rem' }}>PorCuanto S.A. de C.V. · IFC · CNBV · LFPDPPP</p>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function Center({ children }: { children: React.ReactNode }) { return <div style={{ textAlign: 'center', padding: '1rem 0' }}>{children}</div> }
function Txt({ children }: { children: React.ReactNode }) { return <div style={{ color: '#475569', fontSize: '0.9rem', fontWeight: '600', marginTop: '1rem' }}>{children}</div> }
function Spinner() { return <div style={{ width: '36px', height: '36px', border: '3px solid #EBF3FF', borderTopColor: '#0F7BF4', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} /> }
function Ico({ bg, border, children }: { bg: string; border: string; children: React.ReactNode }) { return <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: bg, border: `2px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>{children}</div> }
function StatusCard({ icon, bg, border, title, desc }: { icon: React.ReactNode; bg: string; border: string; title: string; desc: string }) {
  return <div style={{ textAlign: 'center' }}><Ico bg={bg} border={border}>{icon}</Ico><h2 style={{ color: '#0F172A', fontSize: '1.2rem', fontWeight: '800', margin: '0 0 0.5rem' }}>{title}</h2><p style={{ color: '#64748B', fontSize: '0.87rem', lineHeight: 1.7, margin: 0 }}>{desc}</p></div>
}
