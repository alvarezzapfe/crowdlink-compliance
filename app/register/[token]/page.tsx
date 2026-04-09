'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'

type Step = 'loading' | 'invalid' | 'form' | 'totp_setup' | 'done'
interface InviteData { email: string; nombre: string | null; role: string }
const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador', compliance_officer: 'Compliance Officer', readonly: 'Solo lectura'
}

export default function RegisterPage({ params }: { params: { token: string } }) {
  const [step, setStep] = useState<Step>('loading')
  const [invite, setInvite] = useState<InviteData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [totpQr, setTotpQr] = useState('')
  const [totpSecret, setTotpSecret] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [totpLoading, setTotpLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/invitar/${params.token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setErrorMsg(d.error); setStep('invalid') }
        else { setInvite(d); setNombre(d.nombre || ''); setStep('form') }
      })
      .catch(() => { setErrorMsg('Error de red'); setStep('invalid') })
  }, [params.token])

  async function handleRegister() {
    if (!nombre.trim()) { setErrorMsg('El nombre es requerido'); return }
    if (password.length < 8) { setErrorMsg('La contraseña debe tener al menos 8 caracteres'); return }
    if (password !== password2) { setErrorMsg('Las contraseñas no coinciden'); return }
    setLoading(true); setErrorMsg('')
    const res = await fetch(`/api/admin/invitar/${params.token}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, nombre, apellidos }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setErrorMsg(data.error || 'Error al registrar'); return }
    const supabase = createClient()
    const { data: session } = await supabase.auth.signInWithPassword({ email: invite!.email, password })
    if (!session?.session) { setStep('done'); return }
    const accessToken = session.session.access_token
    const totpRes = await fetch('/api/v1/totp/setup', {
      method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }
    })
    const totpData = await totpRes.json()
    setTotpQr(totpData.qr_url); setTotpSecret(totpData.secret)
    setStep('totp_setup')
  }

  async function handleTotpVerify() {
    if (totpCode.length !== 6) { setErrorMsg('Ingresa el código de 6 dígitos'); return }
    setTotpLoading(true); setErrorMsg('')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setErrorMsg('Sesión expirada'); setTotpLoading(false); return }
    const res = await fetch('/api/v1/totp/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ code: totpCode }),
    })
    const data = await res.json()
    setTotpLoading(false)
    if (data.verified) setStep('done')
    else setErrorMsg('Código incorrecto. Verifica tu app.')
  }

  const s = { fontFamily: "'Inter',-apple-system,sans-serif" }

  if (step === 'loading') return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F8FAFC', ...s }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:'40px', height:'40px', border:'3px solid #E2E8F0', borderTopColor:'#1E6FF1', borderRadius:'50%', margin:'0 auto 1rem', animation:'spin 0.8s linear infinite' }} />
        <p style={{ color:'#94A3B8', fontSize:'0.875rem' }}>Verificando invitación…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>
    </div>
  )

  if (step === 'invalid') return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F8FAFC', ...s }}>
      <div style={{ textAlign:'center', maxWidth:'400px', padding:'2rem' }}>
        <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>⚠️</div>
        <h1 style={{ color:'#0F172A', fontSize:'1.3rem', fontWeight:'700', margin:'0 0 0.75rem' }}>Invitación inválida</h1>
        <p style={{ color:'#64748B', fontSize:'0.875rem', margin:0 }}>{errorMsg}</p>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>
    </div>
  )

  if (step === 'done') return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F8FAFC', ...s }}>
      <div style={{ textAlign:'center', maxWidth:'440px', padding:'2rem' }}>
        <div style={{ width:'72px', height:'72px', borderRadius:'18px', background:'#ECFDF5', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.5rem' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h1 style={{ color:'#0F172A', fontSize:'1.4rem', fontWeight:'800', margin:'0 0 0.75rem' }}>¡Cuenta creada!</h1>
        <p style={{ color:'#64748B', fontSize:'0.9rem', lineHeight:1.7, margin:'0 0 1.5rem' }}>
          Tu cuenta fue creada correctamente. El administrador debe activarla antes de que puedas acceder. Te notificaremos por email.
        </p>
        <div style={{ background:'#F0FDF4', border:'1px solid #A7F3D0', borderRadius:'10px', padding:'0.9rem 1.25rem' }}>
          <p style={{ color:'#065F46', fontSize:'0.78rem', margin:0 }}>Dudas: <strong>contacto@crowdlink.mx</strong></p>
        </div>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#F8FAFC', ...s }}>
      <div style={{ background:'#0F172A', padding:'0 2rem', height:'58px', display:'flex', alignItems:'center', gap:'0.75rem' }}>
        <span style={{ color:'#3EE8A0', fontWeight:'800', fontSize:'1.1rem' }}>crowd</span>
        <span style={{ color:'white', fontWeight:'800', fontSize:'1.1rem' }}>link</span>
        <div style={{ width:'1px', height:'16px', background:'rgba(255,255,255,0.2)', margin:'0 4px' }} />
        <span style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.78rem' }}>Compliance Hub</span>
      </div>
      <div style={{ maxWidth:'480px', margin:'0 auto', padding:'3rem 1.5rem' }}>
        {invite && (
          <div style={{ textAlign:'center', marginBottom:'2rem' }}>
            <span style={{ background:'#ECFEFF', color:'#0891B2', fontSize:'0.75rem', fontWeight:'700', padding:'0.3rem 0.8rem', borderRadius:'6px' }}>
              {ROLE_LABELS[invite.role] || invite.role}
            </span>
            <h1 style={{ color:'#0F172A', fontSize:'1.5rem', fontWeight:'800', margin:'0.75rem 0 0.4rem' }}>
              {step === 'form' ? 'Crea tu cuenta' : 'Configura el 2FA'}
            </h1>
            <p style={{ color:'#64748B', fontSize:'0.875rem', margin:0 }}>
              {step === 'form' ? invite.email : 'Escanea el código con Google Authenticator'}
            </p>
          </div>
        )}
        <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:'16px', padding:'2rem', boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
          {step === 'form' && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.85rem', marginBottom:'0.85rem' }}>
                <div>
                  <label style={{ color:'#475569', fontSize:'0.8rem', fontWeight:'500', display:'block', marginBottom:'0.4rem' }}>Nombre *</label>
                  <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Luis"
                    style={{ width:'100%', border:'1.5px solid #E2E8F0', borderRadius:'9px', padding:'0.7rem 0.9rem', fontSize:'0.88rem', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
                </div>
                <div>
                  <label style={{ color:'#475569', fontSize:'0.8rem', fontWeight:'500', display:'block', marginBottom:'0.4rem' }}>Apellidos</label>
                  <input value={apellidos} onChange={e => setApellidos(e.target.value)} placeholder="Álvarez"
                    style={{ width:'100%', border:'1.5px solid #E2E8F0', borderRadius:'9px', padding:'0.7rem 0.9rem', fontSize:'0.88rem', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
                </div>
              </div>
              <div style={{ marginBottom:'0.85rem' }}>
                <label style={{ color:'#475569', fontSize:'0.8rem', fontWeight:'500', display:'block', marginBottom:'0.4rem' }}>Contraseña *</label>
                <div style={{ position:'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres"
                    style={{ width:'100%', border:'1.5px solid #E2E8F0', borderRadius:'9px', padding:'0.7rem 2.5rem 0.7rem 0.9rem', fontSize:'0.88rem', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
                  <button onClick={() => setShowPass(!showPass)} style={{ position:'absolute', right:'0.75rem', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94A3B8' }}>
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom:'1.5rem' }}>
                <label style={{ color:'#475569', fontSize:'0.8rem', fontWeight:'500', display:'block', marginBottom:'0.4rem' }}>Confirmar contraseña *</label>
                <input type="password" value={password2} onChange={e => setPassword2(e.target.value)} placeholder="Repite tu contraseña"
                  style={{ width:'100%', border:`1.5px solid ${password2 && password !== password2 ? '#EF4444' : '#E2E8F0'}`, borderRadius:'9px', padding:'0.7rem 0.9rem', fontSize:'0.88rem', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
              </div>
              {errorMsg && <p style={{ color:'#EF4444', fontSize:'0.8rem', margin:'0 0 1rem', textAlign:'center' }}>{errorMsg}</p>}
              <button onClick={handleRegister} disabled={loading}
                style={{ width:'100%', background:'#1E6FF1', color:'white', border:'none', borderRadius:'10px', padding:'0.85rem', fontSize:'0.9rem', fontWeight:'600', cursor:loading ? 'default' : 'pointer', opacity:loading ? 0.6 : 1, fontFamily:'inherit' }}>
                {loading ? 'Creando cuenta…' : 'Crear cuenta y configurar 2FA →'}
              </button>
            </div>
          )}
          {step === 'totp_setup' && (
            <div>
              <div style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:'12px', padding:'1.25rem', marginBottom:'1.5rem', textAlign:'center' }}>
                <p style={{ color:'#475569', fontSize:'0.8rem', margin:'0 0 1rem' }}>Abre <strong>Google Authenticator</strong> y escanea este código</p>
                {totpQr && <img src={totpQr} alt="QR 2FA" style={{ width:'180px', height:'180px', borderRadius:'8px', border:'1px solid #E2E8F0' }} />}
                {totpSecret && (
                  <div style={{ marginTop:'0.75rem' }}>
                    <p style={{ color:'#94A3B8', fontSize:'0.72rem', margin:'0 0 0.3rem' }}>O ingresa el código manualmente:</p>
                    <code style={{ background:'#F1F5F9', padding:'0.3rem 0.6rem', borderRadius:'6px', fontSize:'0.8rem', color:'#1E293B', letterSpacing:'0.1em' }}>{totpSecret}</code>
                  </div>
                )}
              </div>
              <div style={{ marginBottom:'1.5rem' }}>
                <label style={{ color:'#475569', fontSize:'0.8rem', fontWeight:'500', display:'block', marginBottom:'0.4rem' }}>Código de 6 dígitos</label>
                <input value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="000000" maxLength={6}
                  style={{ width:'100%', border:'1.5px solid #E2E8F0', borderRadius:'9px', padding:'0.7rem', fontSize:'1.2rem', fontWeight:'600', outline:'none', boxSizing:'border-box', letterSpacing:'0.3em', textAlign:'center', fontFamily:'monospace' }} />
              </div>
              {errorMsg && <p style={{ color:'#EF4444', fontSize:'0.8rem', margin:'0 0 1rem', textAlign:'center' }}>{errorMsg}</p>}
              <button onClick={handleTotpVerify} disabled={totpLoading || totpCode.length !== 6}
                style={{ width:'100%', background:'#059669', color:'white', border:'none', borderRadius:'10px', padding:'0.85rem', fontSize:'0.9rem', fontWeight:'600', cursor:(totpLoading || totpCode.length !== 6) ? 'default' : 'pointer', opacity:(totpLoading || totpCode.length !== 6) ? 0.6 : 1, fontFamily:'inherit' }}>
                {totpLoading ? 'Verificando…' : '✓ Verificar y finalizar'}
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); *{box-sizing:border-box}`}</style>
    </div>
  )
}
