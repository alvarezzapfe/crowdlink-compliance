'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { cl } from '@/lib/design'
import { IconCheck, IconX, IconClock, IconShield } from '@/components/Icons'

type State = 'loading' | 'valid' | 'used' | 'expired' | 'invalid' | 'authenticating' | 'done' | 'error'

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token: tokenParam } = React.use(params)
  const [state, setState] = useState<State>('loading')
  const [invitation, setInvitation] = useState<{ email: string; nombre_empresa: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    validateToken()
  }, [])

  const validateToken = async () => {
    try {
      const token = tokenParam

      // Validar formato UUID básico antes de consultar
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!UUID_REGEX.test(token)) {
        setState('invalid')
        return
      }

      const res = await fetch(`/api/v1/invitations/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'USED') { setState('used'); return }
        if (data.code === 'EXPIRED') { setState('expired'); return }
        setState('invalid')
        return
      }

      setInvitation({ email: data.email, nombre_empresa: data.nombre_empresa })
      setState('valid')
    } catch {
      setState('error')
      setErrorMsg('Error de red. Intenta de nuevo.')
    }
  }

  const handleAccess = async () => {
    if (!invitation) return
    setState('authenticating')

    try {
      const supabase = createClient()

      // Enviar magic link de Supabase al email de la invitación
      const { error } = await supabase.auth.signInWithOtp({
        email: invitation.email,
        options: {
          emailRedirectTo: `${window.location.origin}/invite/${tokenParam}/callback`,
          shouldCreateUser: true,
        },
      })

      if (error) throw error
      setState('done')
    } catch (e) {
      setState('error')
      setErrorMsg(e instanceof Error ? e.message : 'Error al enviar acceso')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: cl.gray50, fontFamily: cl.fontFamily, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '28px', width: 'auto' }} />
          <div style={{ color: cl.gray400, fontSize: '0.78rem', marginTop: '0.5rem' }}>Compliance Hub</div>
        </div>

        <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '20px', padding: '2.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>

          {/* LOADING */}
          {state === 'loading' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ width: '40px', height: '40px', border: '3px solid #EBF3FF', borderTopColor: '#0F7BF4', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 1.25rem' }} />
              <div style={{ color: cl.gray600, fontSize: '0.9rem', fontWeight: '600' }}>Verificando invitación...</div>
            </div>
          )}

          {/* VALID */}
          {state === 'valid' && invitation && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#EBF3FF', border: '2px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                  <IconShield size={24} color="#0F7BF4" />
                </div>
                <h1 style={{ color: cl.gray900, fontSize: '1.3rem', fontWeight: '800', margin: '0 0 0.5rem', letterSpacing: '-0.01em' }}>
                  {invitation.nombre_empresa ? `Bienvenido, ${invitation.nombre_empresa}` : 'Invitación KYC'}
                </h1>
                <p style={{ color: cl.gray500, fontSize: '0.85rem', margin: 0, lineHeight: 1.65 }}>
                  Crowdlink te ha invitado a completar el proceso de verificación de identidad (KYC) para operar en la plataforma.
                </p>
              </div>

              <div style={{ background: cl.gray50, border: `1px solid ${cl.gray200}`, borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ color: cl.gray400, fontSize: '0.68rem', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>ACCESO PARA</div>
                <div style={{ color: cl.gray800, fontSize: '0.9rem', fontWeight: '600', fontFamily: 'monospace' }}>{invitation.email}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ color: '#92400E', fontSize: '0.7rem', fontWeight: '700', marginBottom: '0.2rem' }}>VIGENCIA</div>
                  <div style={{ color: '#B45309', fontSize: '0.82rem', fontWeight: '600' }}>72 horas</div>
                </div>
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ color: '#1D4ED8', fontSize: '0.7rem', fontWeight: '700', marginBottom: '0.2rem' }}>USO</div>
                  <div style={{ color: '#1D4ED8', fontSize: '0.82rem', fontWeight: '600' }}>Un solo acceso</div>
                </div>
              </div>

              <button onClick={handleAccess} style={{ width: '100%', background: '#0F7BF4', color: 'white', border: 'none', borderRadius: '10px', padding: '0.9rem', fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer', fontFamily: cl.fontFamily }}>
                Acceder al formulario KYC →
              </button>
              <p style={{ color: cl.gray400, fontSize: '0.73rem', textAlign: 'center', margin: '0.75rem 0 0', lineHeight: 1.5 }}>
                Te enviaremos un código de acceso a tu correo para confirmar tu identidad.
              </p>
            </div>
          )}

          {/* AUTHENTICATING */}
          {state === 'authenticating' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ width: '40px', height: '40px', border: '3px solid #EBF3FF', borderTopColor: '#0F7BF4', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 1.25rem' }} />
              <div style={{ color: cl.gray800, fontSize: '1rem', fontWeight: '700', marginBottom: '0.4rem' }}>Enviando acceso...</div>
              <div style={{ color: cl.gray400, fontSize: '0.85rem' }}>Preparando tu acceso seguro</div>
            </div>
          )}

          {/* DONE */}
          {state === 'done' && invitation && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ECFDF5', border: '2px solid #6EE7B7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <IconCheck size={24} color="#059669" strokeWidth={2.5} />
              </div>
              <h2 style={{ color: cl.gray900, fontSize: '1.2rem', fontWeight: '800', margin: '0 0 0.5rem' }}>Revisa tu correo</h2>
              <p style={{ color: cl.gray500, fontSize: '0.87rem', lineHeight: 1.7, margin: '0 0 1.25rem' }}>
                Enviamos un link de acceso a <strong style={{ color: cl.gray700 }}>{invitation.email}</strong>. Ábrelo para acceder directamente al formulario KYC.
              </p>
              <div style={{ background: cl.gray50, border: `1px solid ${cl.gray200}`, borderRadius: '8px', padding: '0.75rem', color: cl.gray400, fontSize: '0.75rem' }}>
                El link expira en 10 minutos. Revisa también tu carpeta de spam.
              </div>
            </div>
          )}

          {/* USED */}
          {state === 'used' && (
            <StatusCard icon={<IconCheck size={24} color="#059669" strokeWidth={2.5} />} iconBg="#ECFDF5" iconBorder="#6EE7B7"
              title="Invitación ya utilizada"
              desc="Este link de invitación ya fue usado. Si necesitas acceso nuevamente, contacta al equipo de Crowdlink."
              color="#065F46"
            />
          )}

          {/* EXPIRED */}
          {state === 'expired' && (
            <StatusCard icon={<IconClock size={24} color="#D97706" />} iconBg="#FFFBEB" iconBorder="#FDE68A"
              title="Invitación expirada"
              desc="Este link venció (72 horas). Solicita al equipo de Crowdlink que genere una nueva invitación."
              color="#92400E"
            />
          )}

          {/* INVALID */}
          {state === 'invalid' && (
            <StatusCard icon={<IconX size={24} color="#DC2626" strokeWidth={2.5} />} iconBg="#FEF2F2" iconBorder="#FECACA"
              title="Link inválido"
              desc="Este link de invitación no existe o fue modificado. Verifica que copiaste el link completo."
              color="#991B1B"
            />
          )}

          {/* ERROR */}
          {state === 'error' && (
            <div style={{ textAlign: 'center' }}>
              <StatusCard icon={<IconX size={24} color="#DC2626" strokeWidth={2.5} />} iconBg="#FEF2F2" iconBorder="#FECACA"
                title="Error"
                desc={errorMsg || 'Ocurrió un error inesperado.'}
                color="#991B1B"
              />
              <button onClick={validateToken} style={{ marginTop: '1rem', background: cl.gray100, border: `1px solid ${cl.gray200}`, borderRadius: '8px', padding: '0.6rem 1.25rem', color: cl.gray600, cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600', fontFamily: cl.fontFamily }}>
                Intentar de nuevo
              </button>
            </div>
          )}

        </div>

        <p style={{ color: cl.gray400, fontSize: '0.72rem', textAlign: 'center', marginTop: '1.5rem' }}>
          PorCuanto S.A. de C.V. · IFC · CNBV · LFPDPPP
        </p>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function StatusCard({ icon, iconBg, iconBorder, title, desc, color }: {
  icon: React.ReactNode; iconBg: string; iconBorder: string; title: string; desc: string; color: string
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: iconBg, border: `2px solid ${iconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
        {icon}
      </div>
      <h2 style={{ color, fontSize: '1.2rem', fontWeight: '800', margin: '0 0 0.5rem' }}>{title}</h2>
      <p style={{ color: '#64748B', fontSize: '0.87rem', lineHeight: 1.7, margin: 0 }}>{desc}</p>
    </div>
  )
}
