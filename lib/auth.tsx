'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const SESSION_KEY = 'bumper_auth'
const PIN_KEY = 'bumper_pin'
const SESSION_EXPIRE_KEY = 'bumper_expire'
const SESSION_DURATION = 8 * 60 * 60 * 1000 // 8시간 (근무시간)
const ROLE_KEY = 'bumper_role'

interface AuthCtx {
  isLoggedIn: boolean
  isPinVerified: boolean
  userRole: 'admin' | 'user' | null
  userName: string | null
  login: (id: string, pw: string) => Promise<boolean>
  verifyPin: (pin: string) => Promise<boolean>
  logout: () => void
  changePassword: (oldPw: string, newPw: string) => Promise<{ ok: boolean; msg: string }>
  changePin: (oldPin: string, newPin: string) => Promise<{ ok: boolean; msg: string }>
}
const AuthContext = createContext<AuthCtx>({
  isLoggedIn: false,
  isPinVerified: false,
  userRole: null,
  userName: null,
  login: async () => false,
  verifyPin: async () => false,
  logout: () => {},
  changePassword: async () => ({ ok: false, msg: '' }),
  changePin: async () => ({ ok: false, msg: '' }),
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isPinVerified, setIsPinVerified] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // 세션 만료 확인
    const expire = sessionStorage.getItem(SESSION_EXPIRE_KEY)
    if (expire && Date.now() > Number(expire)) {
      // 세션 만료 → 강제 로그아웃
      sessionStorage.removeItem(SESSION_KEY)
      sessionStorage.removeItem(PIN_KEY)
      sessionStorage.removeItem(SESSION_EXPIRE_KEY)
      sessionStorage.removeItem(ROLE_KEY)
      sessionStorage.removeItem('bumper_name')
      return
    }
    const s = sessionStorage.getItem(SESSION_KEY)
    const p = sessionStorage.getItem(PIN_KEY)
    const r = sessionStorage.getItem(ROLE_KEY) as 'admin' | 'user' | null
    const n = sessionStorage.getItem('bumper_name')
    if (s === 'ok') setIsLoggedIn(true)
    if (p === 'ok') setIsPinVerified(true)
    if (r) setUserRole(r)
    if (n) setUserName(n)
  }, [])

  const login = async (id: string, pw: string) => {
    // DB에서 사용자 조회 (users 테이블)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', id)
      .eq('password', pw)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      // DB 실패 시 환경변수 fallback (초기 설정용)
      const envId = process.env.NEXT_PUBLIC_ADMIN_ID || '103613'
      const envPw = process.env.NEXT_PUBLIC_ADMIN_PW || '103613'
      if (id === envId && pw === envPw) {
        sessionStorage.setItem(SESSION_KEY, 'ok')
        sessionStorage.setItem(SESSION_EXPIRE_KEY, String(Date.now() + SESSION_DURATION))
        sessionStorage.setItem(ROLE_KEY, 'admin')
        sessionStorage.setItem('bumper_name', '관리자')
        setIsLoggedIn(true)
        setUserRole('admin')
        setUserName('관리자')
        return true
      }
      return false
    }

    sessionStorage.setItem(SESSION_KEY, 'ok')
    sessionStorage.setItem(SESSION_EXPIRE_KEY, String(Date.now() + SESSION_DURATION))
    sessionStorage.setItem(ROLE_KEY, data.role || 'user')
    sessionStorage.setItem('bumper_name', data.name || id)
    setIsLoggedIn(true)
    setUserRole(data.role || 'user')
    setUserName(data.name || id)
    return true
  }

  const verifyPin = async (pin: string) => {
    // DB에서 PIN 확인
    const name = sessionStorage.getItem('bumper_name') || ''
    const { data } = await supabase
      .from('users')
      .select('pin')
      .eq('name', name)
      .single()

    const validPin = data?.pin || process.env.NEXT_PUBLIC_ADMIN_PIN || '0515'
    if (pin === validPin) {
      sessionStorage.setItem(PIN_KEY, 'ok')
      setIsPinVerified(true)
      return true
    }
    return false
  }

  const changePassword = async (oldPw: string, newPw: string) => {
    const name = sessionStorage.getItem('bumper_name') || ''
    const { data } = await supabase.from('users').select('*').eq('name', name).single()
    if (!data) return { ok: false, msg: '사용자 정보를 찾을 수 없습니다' }
    if (data.password !== oldPw) return { ok: false, msg: '현재 비밀번호가 올바르지 않습니다' }
    if (newPw.length < 4) return { ok: false, msg: '새 비밀번호는 4자리 이상이어야 합니다' }
    const { error } = await supabase.from('users').update({ password: newPw, updated_at: new Date().toISOString() }).eq('id', data.id)
    if (error) return { ok: false, msg: '변경 실패: ' + error.message }
    return { ok: true, msg: '비밀번호가 변경되었습니다' }
  }

  const changePin = async (oldPin: string, newPin: string) => {
    const name = sessionStorage.getItem('bumper_name') || ''
    const { data } = await supabase.from('users').select('*').eq('name', name).single()
    if (!data) return { ok: false, msg: '사용자 정보를 찾을 수 없습니다' }
    if (data.pin !== oldPin) return { ok: false, msg: '현재 PIN이 올바르지 않습니다' }
    if (newPin.length !== 4) return { ok: false, msg: 'PIN은 4자리여야 합니다' }
    const { error } = await supabase.from('users').update({ pin: newPin, updated_at: new Date().toISOString() }).eq('id', data.id)
    if (error) return { ok: false, msg: '변경 실패: ' + error.message }
    return { ok: true, msg: 'PIN이 변경되었습니다' }
  }

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(PIN_KEY)
    sessionStorage.removeItem(SESSION_EXPIRE_KEY)
    sessionStorage.removeItem(ROLE_KEY)
    sessionStorage.removeItem('bumper_name')
    setIsLoggedIn(false)
    setIsPinVerified(false)
    setUserRole(null)
    setUserName(null)
    router.push('/login')
  }

  return <AuthContext.Provider value={{ isLoggedIn, isPinVerified, userRole, userName, login, verifyPin, logout, changePassword, changePin }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

// 인증 필요한 페이지에서 사용 - 미인증 시 router.push로 리다이렉트
export function useRequireAuth() {
  const ctx = useContext(AuthContext)
  const router = useRouter()
  useEffect(() => {
    if (!ctx.isPinVerified) {
      router.push('/login')
    }
  }, [ctx.isPinVerified, router])
  return ctx
}
