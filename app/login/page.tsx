'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

export default function LoginPage() {
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 600))
    const ok = login(id, pw)
    if (ok) router.push('/dashboard')
    else { setError('아이디 또는 비밀번호가 올바르지 않습니다.'); setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)',
      backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(59,126,248,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(34,211,160,0.05) 0%, transparent 50%)'
    }}>
      <div style={{ width: 360 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 14,
            background: 'var(--accent-blue-dim)', border: '1px solid var(--accent-blue)',
            marginBottom: 14
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.8">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4"/>
              <path d="M7 10h3M7 13h5M14 10l3 3-3 3"/>
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            후가공설비 관리 시스템
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Bumper Post-Process Management
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 28
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <div className="form-label" style={{ marginBottom: 6 }}>아이디</div>
              <input
                className="form-input"
                type="text"
                placeholder="아이디 입력"
                value={id}
                onChange={e => setId(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div className="form-label" style={{ marginBottom: 6 }}>비밀번호</div>
              <input
                className="form-input"
                type="password"
                placeholder="비밀번호 입력"
                value={pw}
                onChange={e => setPw(e.target.value)}
              />
            </div>

            {error && (
              <div style={{
                background: 'var(--accent-red-dim)', border: '1px solid var(--accent-red)',
                borderRadius: 7, padding: '8px 12px',
                fontSize: 12, color: 'var(--accent-red)', marginBottom: 14
              }}>
                {error}
              </div>
            )}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: 13 }}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'var(--text-muted)' }}>
          생산기술 팀 전용 시스템
        </div>
      </div>
    </div>
  )
}
