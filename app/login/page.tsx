'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { cl } from '@/lib/design'
import { IconShield, IconLock, IconEye, IconEyeOff, IconCheck } from '@/components/Icons'

type Step = 'credentials' | 'totp_setup' | 'totp_verify'

export default function AdminLoginPage() {
  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [totpCode, setTotpCode] = useState('')
  const [totpSecret, setTotpSecret] = useState('')
  const [totpQr, setTotpQr] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  const handleForgot = async () => {
    if (!email) { setError('Ingresa tu email primero'); return }
    setForgotLoading(true)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setForgotSent(true)
    setForgotLoading(false)
  }

  const handleCredentials = async () => {
    if (!email || !password) return
    setLoading(true); setError('')
    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError || !data.user) { setError('Credenciales incorrectas'); setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    if (profile?.role !== 'admin') {
      await supabase.auth.signOut()
      setError('Acceso denegado — solo administradores'); setLoading(false); return
    }
    // Check TOTP status via server endpoint
    const totpCheckRes = await fetch('/api/v1/totp/status', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + accessToken },
    })
    const totpStatus = await totpCheckRes.json()
    if (!totpStatus.verified) {
    const res = await fetch('/api/v1/totp/setup', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + accessToken }
    })
      const setupData = await res.json()
      setTotpSecret(setupData.secret); setTotpQr(setupData.qr_url)
      setStep('totp_setup')
    } else {
      setStep('totp_verify')
    }
    setLoading(false)
  }

  const handleTotpSetup = async () => {
    if (totpCode.length !== 6) return
    setLoading(true); setError('')
    const supabase2 = createClient()
    const { data: { session: s2 } } = await supabase2.auth.getSession()
    const res = await fetch('/api/v1/totp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (s2?.access_token || '') },
      body: JSON.stringify({ code: totpCode, secret: totpSecret, setup: true }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Código incorrecto'); setLoading(false); return }
    window.location.href = '/kyc/admin'
  }

  const handleTotpVerify = async () => {
    if (totpCode.length !== 6) return
    setLoading(true); setError('')
    const supabase3 = createClient()
    const { data: { session: s3 } } = await supabase3.auth.getSession()
    const res = await fetch('/api/v1/totp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (s3?.access_token || '') },
      body: JSON.stringify({ code: totpCode, setup: false }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Código incorrecto'); setLoading(false); return }
    window.location.href = '/kyc/admin'
  }

  return (
    <div style={{ minHeight: '100vh', background: cl.gray50, fontFamily: cl.fontFamily, display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <div style={{ height: '60px', background: cl.white, borderBottom: `1px solid ${cl.gray200}`, display: 'flex', alignItems: 'center', padding: '0 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <a href="/gate" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: cl.gray500, fontSize: '0.82rem', fontWeight: '500' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>
          Regresar
        </a>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '22px', width: 'auto' }} />
        </div>
        <div style={{ width: '80px' }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: cl.blueLight, border: `1.5px solid #BFDBFE`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <IconLock size={22} color="#0F7BF4" strokeWidth={2} />
            </div>
            <h1 style={{ color: cl.gray900, fontSize: '1.3rem', fontWeight: '800', margin: '0 0 0.3rem', letterSpacing: '-0.02em' }}>
              {step === 'credentials' ? 'Panel Administrador' : step === 'totp_setup' ? 'Configurar 2FA' : 'Verificación 2FA'}
            </h1>
            <p style={{ color: cl.gray400, fontSize: '0.85rem', margin: 0 }}>
              {step === 'credentials' ? 'Acceso con verificación en dos pasos' : step === 'totp_setup' ? 'Escanea el QR con Google Authenticator' : 'Ingresa el código de tu app'}
            </p>
          </div>

          <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '18px', padding: '2rem', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>

            {/* STEP 1: Credenciales */}
            {step === 'credentials' && (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={lbl}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCredentials()}
                    placeholder="correo@ejemplo.com" autoFocus style={inp} />
                </div>
                <div>
                  <label style={lbl}>Contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCredentials()}
                      placeholder="••••••••" style={{ ...inp, paddingRight: '3rem' }} />
                    <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      {showPass ? <IconEyeOff size={16} color={cl.gray400} /> : <IconEye size={16} color={cl.gray400} />}
                    </button>
                  </div>
                </div>
                {error && <ErrBox msg={error} />}
                <button onClick={handleCredentials} disabled={loading || !email || !password} style={btn(loading || !email || !password)}>
                  {loading ? 'Verificando...' : 'Continuar →'}
                </button>
                {forgotSent ? (
                  <div style={{ background: '#ECFDF5', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '0.7rem', textAlign: 'center', color: '#065F46', fontSize: '0.8rem', fontWeight: '500' }}>
                    Revisa tu correo para restablecer tu contraseña
                  </div>
                ) : (
                  <button onClick={handleForgot} disabled={forgotLoading} style={{ background: 'none', border: 'none', color: cl.gray400, fontSize: '0.8rem', cursor: 'pointer', fontFamily: cl.fontFamily, textAlign: 'center' as const, padding: '0.25rem', textDecoration: 'underline' }}>
                    {forgotLoading ? 'Enviando...' : 'Olvidé mi contraseña'}
                  </button>
                )}
              </div>
            )}

            {/* STEP 2: Setup TOTP */}
            {step === 'totp_setup' && (
              <div style={{ display: 'grid', gap: '1.25rem' }}>
                <div style={{ background: cl.gray50, border: `1px solid ${cl.gray200}`, borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
                  {totpQr
                    ? <img src={totpQr} alt="QR 2FA" width={180} height={180} style={{ display: 'block', margin: '0 auto', borderRadius: '8px' }} />
                    : <div style={{ width: '180px', height: '180px', background: cl.gray100, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                        <Spinner />
                      </div>
                  }
                  {totpSecret && (
                    <div style={{ marginTop: '0.75rem', color: cl.gray400, fontSize: '0.68rem', fontFamily: 'monospace', letterSpacing: '0.08em' }}>{totpSecret}</div>
                  )}
                </div>
                <div>
                  <label style={lbl}>Código de 6 dígitos</label>
                  <input type="text" inputMode="numeric" maxLength={6}
                    value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0,6))}
                    onKeyDown={e => e.key === 'Enter' && handleTotpSetup()}
                    placeholder="000000" autoFocus
                    style={{ ...inp, textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.4em', fontFamily: 'monospace' }} />
                </div>
                {error && <ErrBox msg={error} />}
                <button onClick={handleTotpSetup} disabled={loading || totpCode.length !== 6} style={btn(loading || totpCode.length !== 6)}>
                  {loading ? 'Verificando...' : 'Activar 2FA →'}
                </button>
                <button onClick={() => { setStep('credentials'); setTotpCode(''); setError('') }} style={btnBack}>
                  ← Regresar
                </button>
              </div>
            )}

            {/* STEP 3: Verify TOTP */}
            {step === 'totp_verify' && (
              <div style={{ display: 'grid', gap: '1.25rem' }}>
                <div style={{ background: cl.blueLight, border: '1px solid #BFDBFE', borderRadius: '10px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <IconShield size={20} color="#0F7BF4" />
                  <div>
                    <div style={{ color: '#1D4ED8', fontSize: '0.82rem', fontWeight: '700' }}>Google Authenticator</div>
                    <div style={{ color: '#3B82F6', fontSize: '0.75rem' }}>Abre tu app y copia el código</div>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Código</label>
                  <input type="text" inputMode="numeric" maxLength={6}
                    value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0,6))}
                    onKeyDown={e => e.key === 'Enter' && handleTotpVerify()}
                    placeholder="000000" autoFocus
                    style={{ ...inp, textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.4em', fontFamily: 'monospace' }} />
                </div>
                {error && <ErrBox msg={error} />}
                <button onClick={handleTotpVerify} disabled={loading || totpCode.length !== 6} style={btn(loading || totpCode.length !== 6)}>
                  {loading ? 'Verificando...' : 'Acceder →'}
                </button>
                <button onClick={() => { setStep('credentials'); setTotpCode(''); setError('') }} style={btnBack}>
                  ← Regresar
                </button>
              </div>
            )}
          </div>

          <p style={{ color: cl.gray300, fontSize: '0.72rem', textAlign: 'center', marginTop: '1.5rem' }}>
            PorCuanto S.A. de C.V. · IFC · CNBV · Art. 47 CUITF
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        input:focus { border-color: #0F7BF4 !important; box-shadow: 0 0 0 3px #EBF3FF; outline: none; }
      `}</style>
    </div>
  )
}

function ErrBox({ msg }: { msg: string }) {
  return <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.7rem 0.9rem', color: '#DC2626', fontSize: '0.8rem' }}>{msg}</div>
}

function Spinner() {
  return <div style={{ width: '24px', height: '24px', border: '3px solid #E5E7EB', borderTopColor: '#0F7BF4', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
}

const lbl: React.CSSProperties = { color: '#475569', fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.45rem' }
const inp: React.CSSProperties = { width: '100%', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '10px', padding: '0.8rem 1rem', color: '#1E293B', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.15s' }
const btn = (disabled: boolean): React.CSSProperties => ({ width: '100%', background: disabled ? '#E2E8F0' : '#0F7BF4', border: 'none', borderRadius: '10px', padding: '0.85rem', color: disabled ? '#94A3B8' : 'white', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', fontWeight: '700', boxShadow: disabled ? 'none' : '0 4px 12px rgba(15,123,244,0.25)', transition: 'all 0.15s' })
const btnBack: React.CSSProperties = { background: 'none', border: 'none', color: '#94A3B8', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif', textAlign: 'center' as const, padding: '0.25rem' }
