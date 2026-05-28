'use client'
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/auth'

interface LockScreenProps {
  onUnlock: () => void
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const { verifyPin, logout } = useAuth()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 자동 포커스
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // PIN 4자리 입력되면 자동 검증
  useEffect(() => {
    if (pin.length === 4 && !loading) {
      void handleUnlock()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  async function handleUnlock() {
    if (loading) return
    setLoading(true)
    setError('')
    const ok = await verifyPin(pin)
    setLoading(false)
    if (ok) {
      setPin('')
      onUnlock()
    } else {
      setError('PIN이 올바르지 않습니다')
      setShake(true)
      setPin('')
      setTimeout(() => setShake(false), 500)
      inputRef.current?.focus()
    }
  }

  function handleLogout() {
    if (confirm('로그아웃하시겠습니까?')) logout()
  }

  return (
    <>
      {/* 배경 흐림 + 어두운 오버레이 */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          background: 'rgba(0, 0, 0, 0.45)',
          zIndex: 99998,
        }}
      />

      {/* 잠금 모달 */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999,
        }}
      >
        <div
          className={shake ? 'lock-shake' : ''}
          style={{
            background: 'var(--bg-card, #fff)',
            borderRadius: 16,
            padding: '36px 40px',
            minWidth: 340,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            border: '1px solid var(--border, #e5e7eb)',
            textAlign: 'center',
          }}
        >
          {/* 자물쇠 아이콘 */}
          <div style={{ fontSize: 36, marginBottom: 14 }}>🔒</div>

          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            화면 잠금
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 22 }}>
            계속하려면 PIN(4자리)을 입력하세요
          </div>

          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pin}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 4)
              setPin(v)
              if (error) setError('')
            }}
            placeholder="• • • •"
            disabled={loading}
            style={{
              width: '100%',
              fontSize: 28,
              textAlign: 'center',
              letterSpacing: '0.4em',
              padding: '12px 16px',
              border: `2px solid ${error ? 'var(--accent-red, #ef4444)' : 'var(--border, #e5e7eb)'}`,
              borderRadius: 10,
              background: 'var(--bg-input, #f9fafb)',
              color: 'var(--text-primary)',
              outline: 'none',
              fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            }}
          />

          {error && (
            <div style={{ fontSize: 12, color: 'var(--accent-red, #ef4444)', marginTop: 10 }}>
              {error}
            </div>
          )}

          {loading && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
              확인 중...
            </div>
          )}

          <div style={{ marginTop: 22, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <button
              onClick={handleLogout}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: 11,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              다른 계정으로 로그인
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes lockShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .lock-shake {
          animation: lockShake 0.4s ease-in-out;
        }
      `}</style>
    </>
  )
}
