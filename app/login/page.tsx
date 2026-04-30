'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const ALLOWED_IP = '59.3.91.101'
const EXTERNAL_PW = 'Pw00232!!'

async function getClientIP(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    const data = await res.json()
    return data.ip || 'unknown'
  } catch {
    return 'unknown'
  }
}

async function logAccess(ip: string, status: 'allowed' | 'blocked') {
  try {
    await supabase.from('access_logs').insert([{
      ip_address: ip,
      user_agent: navigator.userAgent,
      status,
    }])
  } catch {}
}

export default function LoginPage() {
  const [step, setStep] = useState<'login' | 'pin'>('login')
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [clientIP, setClientIP] = useState('')
  const [ipBlocked, setIpBlocked] = useState(false)
  const [checkingIP, setCheckingIP] = useState(true)
  const { login, verifyPin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    async function checkIP() {
      const ip = await getClientIP()
      setClientIP(ip)
      if (ip !== ALLOWED_IP && ip !== 'unknown') {
        await logAccess(ip, 'blocked')
        setIpBlocked(true)
      }
      setCheckingIP(false)
    }
    checkIP()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 600))
    const ok = login(id, pw)
    if (ok) {
      await logAccess(clientIP, 'allowed')
      setStep('pin')
      setLoading(false)
    } else {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
    }
  }

  const handlePin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (attempts >= 5) { setError('시도 횟수 초과. 다시 로그인해주세요.'); return }
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 400))
    const ok = verifyPin(pin)
    if (ok) {
      router.push('/dashboard')
    } else {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      if (newAttempts >= 5) setError('5회 이상 실패. 처음부터 다시 로그인해주세요.')
      else setError(`PIN이 올바르지 않습니다. (${newAttempts}/5)`)
      setPin('')
      setLoading(false)
    }
  }

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) setPin(prev => prev + digit)
  }

  // IP 확인 중
  if (checkingIP) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>보안 확인 중...</div>
      </div>
    )
  }

  // 외부 접속 비밀번호 입력 처리
  const [externalPw, setExternalPw] = useState('')
  const [externalError, setExternalError] = useState('')
  const [externalUnlocked, setExternalUnlocked] = useState(false)

  function handleExternalPw(e: React.FormEvent) {
    e.preventDefault()
    if (externalPw === EXTERNAL_PW) {
      setExternalUnlocked(true)
      setIpBlocked(false)
    } else {
      setExternalError('비밀번호가 올바르지 않습니다.')
    }
  }

  // IP 차단
  if (ipBlocked && !externalUnlocked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div style={{ width: 360 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>외부 접속 감지</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>허가된 네트워크 외 접속입니다.</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', background: 'var(--bg-card)', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', display: 'inline-block' }}>
              IP: {clientIP}
            </div>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, textAlign: 'center' }}>
              외부 접속 비밀번호를 입력하면 접속할 수 있습니다
            </div>
            <form onSubmit={handleExternalPw}>
              <input className="form-input" type="password" placeholder="외부 접속 비밀번호" value={externalPw}
                onChange={e => setExternalPw(e.target.value)} autoFocus style={{ marginBottom: 12 }} />
              {externalError && (
                <div style={{ background: 'var(--accent-red-dim)', border: '1px solid var(--accent-red)', borderRadius: 7, padding: '8px 12px', fontSize: 12, color: 'var(--accent-red)', marginBottom: 12 }}>{externalError}</div>
              )}
              <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>접속</button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)',
      backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(59,126,248,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(34,211,160,0.05) 0%, transparent 50%)'
    }}>
      <div style={{ width: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 14, background: 'var(--accent-blue-dim)', border: '1px solid var(--accent-blue)', marginBottom: 14 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.8">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4"/>
              <path d="M7 10h3M7 13h5M14 10l3 3-3 3"/>
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>후가공설비 관리 시스템</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bumper Post-Process Management</div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 28 }}>
          {step === 'login' ? (
            <form onSubmit={handleLogin}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 20, color: 'var(--text-secondary)', textAlign: 'center' }}>🔐 1단계 — 로그인</div>
              <div style={{ marginBottom: 16 }}>
                <div className="form-label" style={{ marginBottom: 6 }}>아이디</div>
                <input className="form-input" type="text" placeholder="아이디 입력" value={id} onChange={e => setId(e.target.value)} autoFocus />
              </div>
              <div style={{ marginBottom: 20 }}>
                <div className="form-label" style={{ marginBottom: 6 }}>비밀번호</div>
                <input className="form-input" type="password" placeholder="비밀번호 입력" value={pw} onChange={e => setPw(e.target.value)} />
              </div>
              {error && (
                <div style={{ background: 'var(--accent-red-dim)', border: '1px solid var(--accent-red)', borderRadius: 7, padding: '8px 12px', fontSize: 12, color: 'var(--accent-red)', marginBottom: 14 }}>{error}</div>
              )}
              <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: 13 }}>
                {loading ? '확인 중...' : '다음'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePin}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>🔑 2단계 — PIN 인증</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>4자리 보안 PIN을 입력해주세요</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ width: 48, height: 48, borderRadius: 10, border: `2px solid ${pin.length > i ? 'var(--accent-blue)' : 'var(--border-light)'}`, background: pin.length > i ? 'var(--accent-blue-dim)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                    {pin.length > i && <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--accent-blue)' }} />}
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                {[1,2,3,4,5,6,7,8,9].map(n => (
                  <button key={n} type="button" onClick={() => handlePinInput(String(n))}
                    style={{ padding: '14px', fontSize: 18, fontWeight: 600, background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--accent-blue-dim)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                  >{n}</button>
                ))}
                <button type="button" onClick={() => setPin('')}
                  style={{ padding: '14px', fontSize: 12, background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', color: 'var(--accent-red)' }}>지우기</button>
                <button type="button" onClick={() => handlePinInput('0')}
                  style={{ padding: '14px', fontSize: 18, fontWeight: 600, background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--accent-blue-dim)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                >0</button>
                <button type="button" onClick={() => setPin(prev => prev.slice(0,-1))}
                  style={{ padding: '14px', fontSize: 16, background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', color: 'var(--text-secondary)' }}>←</button>
              </div>
              {error && (
                <div style={{ background: 'var(--accent-red-dim)', border: '1px solid var(--accent-red)', borderRadius: 7, padding: '8px 12px', fontSize: 12, color: 'var(--accent-red)', marginBottom: 14, textAlign: 'center' }}>{error}</div>
              )}
              <button className="btn btn-primary" type="submit" disabled={loading || pin.length !== 4}
                style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: 13, opacity: pin.length !== 4 ? 0.5 : 1 }}>
                {loading ? '확인 중...' : 'PIN 확인'}
              </button>
              <button type="button" onClick={() => { setStep('login'); setPin(''); setError(''); setAttempts(0) }}
                style={{ width: '100%', marginTop: 10, padding: '8px', fontSize: 12, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                ← 로그인으로 돌아가기
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
          {clientIP && `IP: ${clientIP}`}
        </div>
        <div style={{ textAlign: 'center', marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>생산기술 팀 전용 시스템</div>
      </div>
    </div>
  )
}
