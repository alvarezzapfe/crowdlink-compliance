'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'

type Step = 'credentials' | 'totp_setup' | 'totp_verify'

export default function LoginPage() {
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
  const [accessToken, setAccessToken] = useState('')

  async function handleCredentials() {
    if (!email || !password) return
    setLoading(true); setError('')
    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError || !data.user) { setError('Credenciales incorrectas'); setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('role, activo').eq('id', data.user.id).single()
    if (!profile) { await supabase.auth.signOut(); setError('Usuario no encontrado'); setLoading(false); return }
    if (!profile.activo) { await supabase.auth.signOut(); setError('Tu cuenta aún no ha sido activada. Contacta al administrador.'); setLoading(false); return }
    const token = data.session?.access_token || ''
    setAccessToken(token)
    const totpRes = await fetch('/api/v1/totp/status', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    const totpStatus = await totpRes.json()
    console.log('TOTP status response:', totpStatus)
    setLoading(false)
    if (totpStatus.verified) {
      setStep('totp_verify')
    } else {
      // No tiene 2FA — mostrar setup
      const setupRes = await fetch('/api/v1/totp/setup', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const setupData = await setupRes.json()
      setTotpSecret(setupData.secret)
      setTotpQr(setupData.qr_url)
      setStep('totp_setup')
    }
  }

  async function handleTotpSetup() {
    if (totpCode.length !== 6) return
    setLoading(true); setError('')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token || accessToken
    const res = await fetch('/api/v1/totp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code: totpCode, secret: totpSecret, setup: true }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.ok) {
      await fetch('/api/v1/totp/session', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      window.location.href = '/gate'
    } else { setError('Código incorrecto. Intenta de nuevo.') }
  }

  async function handleTotpVerify() {
    if (totpCode.length !== 6) return
    setLoading(true); setError('')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token || accessToken
    const res = await fetch('/api/v1/totp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code: totpCode }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.verified) {
      // Usar replace para evitar problemas de hidratación
      setTimeout(() => { window.location.replace('/gate') }, 100)
    } else { setError('Código incorrecto. Intenta de nuevo.') }
  }

  async function handleForgot() {
    if (!email) { setError('Ingresa tu email primero'); return }
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
    setForgotSent(true)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#050A14', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', fontFamily:"'DM Sans', -apple-system, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap'); *{box-sizing:border-box} @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} .input-field:focus{border-color:#3EE8A0!important;box-shadow:0 0 0 3px rgba(62,232,160,0.1)!important;outline:none} .btn-p{transition:all 0.2s} .btn-p:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 20px rgba(62,232,160,0.25)!important}`}</style>
      <div style={{ position:'fixed', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize:'60px 60px', pointerEvents:'none' }} />
      <div style={{ position:'fixed', top:'-20%', left:'50%', transform:'translateX(-50%)', width:'600px', height:'400px', background:'radial-gradient(ellipse, rgba(62,232,160,0.06) 0%, transparent 70%)', pointerEvents:'none' }} />
      <div style={{ position:'relative', width:'100%', maxWidth:'420px', animation:'fadeUp 0.5s ease forwards' }}>
        <div style={{ textAlign:'center', marginBottom:'2.5rem' }}>
          <a href="/" style={{ textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'0.25rem', marginBottom:'1rem' }}>
            <span style={{ color:'#3EE8A0', fontWeight:'900', fontSize:'1.4rem', letterSpacing:'-0.03em' }}>crowd</span>
            <span style={{ color:'white', fontWeight:'900', fontSize:'1.4rem', letterSpacing:'-0.03em' }}>link</span>
          </a>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#3EE8A0', animation:'pulse 2s infinite' }} />
            <span style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.75rem', fontWeight:'600', letterSpacing:'0.08em' }}>COMPLIANCE HUB</span>
          </div>
        </div>
        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'20px', padding:'2.5rem', backdropFilter:'blur(20px)' }}>

          {step === 'credentials' && (<>
            <h1 style={{ color:'white', fontSize:'1.35rem', fontWeight:'800', margin:'0 0 0.4rem', letterSpacing:'-0.02em' }}>Iniciar sesión</h1>
            <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.85rem', margin:'0 0 2rem' }}>Accede con tu cuenta de Crowdlink Compliance</p>
            <div style={{ marginBottom:'1rem' }}>
              <label style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.78rem', fontWeight:'500', display:'block', marginBottom:'0.4rem' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && handleCredentials()} placeholder="tu@crowdlink.mx" className="input-field"
                style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'0.8rem 1rem', color:'white', fontSize:'0.9rem', fontFamily:'inherit', transition:'all 0.2s' }} />
            </div>
            <div style={{ marginBottom:'1.5rem' }}>
              <label style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.78rem', fontWeight:'500', display:'block', marginBottom:'0.4rem' }}>Contraseña</label>
              <div style={{ position:'relative' }}>
                <input type={showPass?'text':'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==='Enter' && handleCredentials()} placeholder="••••••••" className="input-field"
                  style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'0.8rem 2.5rem 0.8rem 1rem', color:'white', fontSize:'0.9rem', fontFamily:'inherit', transition:'all 0.2s' }} />
                <button onClick={() => setShowPass(!showPass)} style={{ position:'absolute', right:'0.75rem', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.3)' }}>{showPass?'🙈':'👁'}</button>
              </div>
            </div>
            {error && <p style={{ color:'#EF4444', fontSize:'0.8rem', margin:'0 0 1rem', padding:'0.6rem 0.85rem', background:'rgba(239,68,68,0.08)', borderRadius:'8px', border:'1px solid rgba(239,68,68,0.15)' }}>{error}</p>}
            <button onClick={handleCredentials} disabled={!email||!password||loading} className="btn-p"
              style={{ width:'100%', background:'linear-gradient(135deg, #3EE8A0, #0891B2)', color:'#050A14', border:'none', borderRadius:'10px', padding:'0.85rem', fontSize:'0.9rem', fontWeight:'700', cursor:(!email||!password||loading)?'default':'pointer', opacity:(!email||!password||loading)?0.6:1, fontFamily:'inherit' }}>
              {loading?'Verificando…':'Continuar →'}
            </button>
            <div style={{ textAlign:'center', marginTop:'1.25rem' }}>
              {forgotSent ? <p style={{ color:'#3EE8A0', fontSize:'0.78rem' }}>✓ Revisa tu email</p>
              : <button onClick={handleForgot} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.35)', fontSize:'0.78rem', cursor:'pointer', fontFamily:'inherit' }}>¿Olvidaste tu contraseña?</button>}
            </div>
          </>)}

          {step === 'totp_setup' && (<>
            <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
              <h2 style={{ color:'white', fontSize:'1.2rem', fontWeight:'800', margin:'0 0 0.4rem', letterSpacing:'-0.02em' }}>Configura tu 2FA</h2>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.82rem', margin:0 }}>Escanea con Google Authenticator</p>
            </div>
            {totpQr && (
              <div style={{ textAlign:'center', marginBottom:'1.25rem' }}>
                <img src={totpQr} alt="QR 2FA" style={{ width:'160px', height:'160px', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.1)', background:'white', padding:'4px' }} />
                {totpSecret && <div style={{ marginTop:'0.75rem' }}>
                  <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.7rem', margin:'0 0 0.3rem' }}>Código manual:</p>
                  <code style={{ background:'rgba(255,255,255,0.06)', padding:'0.3rem 0.6rem', borderRadius:'6px', fontSize:'0.75rem', color:'#3EE8A0', letterSpacing:'0.1em' }}>{totpSecret}</code>
                </div>}
              </div>
            )}
            <input value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g,'').slice(0,6))} onKeyDown={e => e.key==='Enter' && handleTotpSetup()}
              placeholder="000000" maxLength={6} className="input-field"
              style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'1rem', color:'white', fontSize:'1.8rem', fontWeight:'700', textAlign:'center', letterSpacing:'0.5em', fontFamily:'monospace', marginBottom:'1.25rem', transition:'all 0.2s' }} />
            {error && <p style={{ color:'#EF4444', fontSize:'0.8rem', margin:'0 0 1rem', padding:'0.6rem 0.85rem', background:'rgba(239,68,68,0.08)', borderRadius:'8px', border:'1px solid rgba(239,68,68,0.15)' }}>{error}</p>}
            <button onClick={handleTotpSetup} disabled={totpCode.length!==6||loading} className="btn-p"
              style={{ width:'100%', background:'linear-gradient(135deg, #3EE8A0, #0891B2)', color:'#050A14', border:'none', borderRadius:'10px', padding:'0.85rem', fontSize:'0.9rem', fontWeight:'700', cursor:(totpCode.length!==6||loading)?'default':'pointer', opacity:(totpCode.length!==6||loading)?0.6:1, fontFamily:'inherit' }}>
              {loading?'Verificando…':'✓ Activar 2FA y entrar'}
            </button>
            <button onClick={() => { setStep('credentials'); setTotpCode(''); setError('') }}
              style={{ width:'100%', background:'none', border:'none', color:'rgba(255,255,255,0.35)', fontSize:'0.78rem', cursor:'pointer', marginTop:'1rem', fontFamily:'inherit' }}>← Volver</button>
          </>)}

          {step === 'totp_verify' && (<>
            <div style={{ textAlign:'center', marginBottom:'1.75rem' }}>
              <div style={{ width:'52px', height:'52px', borderRadius:'14px', background:'rgba(62,232,160,0.1)', border:'1px solid rgba(62,232,160,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3EE8A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
              </div>
              <h2 style={{ color:'white', fontSize:'1.2rem', fontWeight:'800', margin:'0 0 0.4rem', letterSpacing:'-0.02em' }}>Verificación 2FA</h2>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.82rem', margin:0 }}>Abre Google Authenticator e ingresa el código</p>
            </div>
            <input value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g,'').slice(0,6))} onKeyDown={e => e.key==='Enter' && handleTotpVerify()}
              placeholder="000000" maxLength={6} className="input-field"
              style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'1rem', color:'white', fontSize:'1.8rem', fontWeight:'700', textAlign:'center', letterSpacing:'0.5em', fontFamily:'monospace', marginBottom:'1.25rem', transition:'all 0.2s' }} />
            {error && <p style={{ color:'#EF4444', fontSize:'0.8rem', margin:'0 0 1rem', padding:'0.6rem 0.85rem', background:'rgba(239,68,68,0.08)', borderRadius:'8px', border:'1px solid rgba(239,68,68,0.15)' }}>{error}</p>}
            <button onClick={handleTotpVerify} disabled={totpCode.length!==6||loading} className="btn-p"
              style={{ width:'100%', background:'linear-gradient(135deg, #3EE8A0, #0891B2)', color:'#050A14', border:'none', borderRadius:'10px', padding:'0.85rem', fontSize:'0.9rem', fontWeight:'700', cursor:(totpCode.length!==6||loading)?'default':'pointer', opacity:(totpCode.length!==6||loading)?0.6:1, fontFamily:'inherit' }}>
              {loading?'Verificando…':'✓ Entrar al Hub'}
            </button>
            <button onClick={() => { setStep('credentials'); setTotpCode(''); setError('') }}
              style={{ width:'100%', background:'none', border:'none', color:'rgba(255,255,255,0.35)', fontSize:'0.78rem', cursor:'pointer', marginTop:'1rem', fontFamily:'inherit' }}>← Volver</button>
          </>)}
        </div>
        <p style={{ textAlign:'center', color:'rgba(255,255,255,0.2)', fontSize:'0.72rem', marginTop:'1.5rem', lineHeight:1.6 }}>PorCuanto, S.A. de C.V. · CASFIM 0065022<br />Acceso restringido a personal autorizado</p>
      </div>
    </div>
  )
}
