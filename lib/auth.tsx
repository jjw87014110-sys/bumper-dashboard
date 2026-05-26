'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// localStorage 키 상수
const KEYS = {
  session: 'bumper_auth',
  pin: 'bumper_pin',
  expire: 'bumper_expire',
  role: 'bumper_role',
  name: 'bumper_name',
} as const

// 8시간 세션: 출근~퇴근 동안 재로그인 불필요
const SESSION_DURATION = 8 * 60 * 60 * 1000

// localStorage 일괄 저장/삭제 (3곳에서 중복되던 로직 통합)
function saveSession(role: string, name: string) {
  localStorage.setItem(KEYS.session, 'ok')
  localStorage.setItem(KEYS.expire, String(Date.now() + SESSION_DURATION))
  localStorage.setItem(KEYS.role, role)
  localStorage.setItem(KEYS.name, name)
}

function clearSession() {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key))
}

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

  // 페이지 로드 시 세션 복원
  useEffect(() => {
    const expire = localStorage.getItem(KEYS.expire)
    if (expire && Date.now() > Number(expire)) {
      clearSession()
      return
    }
    if (localStorage.getItem(KEYS.session) === 'ok') setIsLoggedIn(true)
    if (localStorage.getItem(KEYS.pin) === 'ok') setIsPinVerified(true)
    const r = localStorage.getItem(KEYS.role) as 'admin' | 'user' | null
    const n = localStorage.getItem(KEYS.name)
    if (r) setUserRole(r)
    if (n) setUserName(n)
  }, [])

  const login = async (id: string, pw: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', id)
      .eq('password', pw)
      .eq('is_active', true)
      .single()

    if (data) {
      const role = data.role || 'user'
      const name = data.name || id
      saveSession(role, name)
      setIsLoggedIn(true)
      setUserRole(role)
      setUserName(name)
      return true
    }

    // DB 실패 시 환경변수 fallback (초기 설정용 · DB에 사용자 등록 전)
    const envId = process.env.NEXT_PUBLIC_ADMIN_ID || '103613'
    const envPw = process.env.NEXT_PUBLIC_ADMIN_PW || '103613'
    if (id === envId && pw === envPw) {
      saveSession('admin', '관리자')
      setIsLoggedIn(true)
      setUserRole('admin')
      setUserName('관리자')
      return true
    }

    return false
  }

  const verifyPin = async (pin: string) => {
    const name = localStorage.getItem(KEYS.name) || ''
    const { data } = await supabase
      .from('users')
      .select('pin')
      .eq('name', name)
      .single()

    const validPin = data?.pin || process.env.NEXT_PUBLIC_ADMIN_PIN || '0515'
    if (pin === validPin) {
      localStorage.setItem(KEYS.pin, 'ok')
      setIsPinVerified(true)
      return true
    }
    return false
  }

  // 비밀번호/PIN 변경 공통 로직
  async function updateUserField(
    field: 'password' | 'pin',
    oldValue: string,
    newValue: string,
    validate: (v: string) => string | null
  ): Promise<{ ok: boolean; msg: string }> {
    const name = localStorage.getItem(KEYS.name) || ''
    const { data } = await supabase.from('users').select('*').eq('name', name).single()
    if (!data) return { ok: false, msg: '사용자 정보를 찾을 수 없습니다' }
    if (data[field] !== oldValue) return { ok: false, msg: field === 'password' ? '현재 비밀번호가 올바르지 않습니다' : '현재 PIN이 올바르지 않습니다' }
    const validationError = validate(newValue)
    if (validationError) return { ok: false, msg: validationError }
    const { error } = await supabase.from('users').update({ [field]: newValue, updated_at: new Date().toISOString() }).eq('id', data.id)
    if (error) return { ok: false, msg: '변경 실패: ' + error.message }
    return { ok: true, msg: field === 'password' ? '비밀번호가 변경되었습니다' : 'PIN이 변경되었습니다' }
  }

  const changePassword = (oldPw: string, newPw: string) =>
    updateUserField('password', oldPw, newPw, v => v.length < 4 ? '새 비밀번호는 4자리 이상이어야 합니다' : null)

  const changePin = (oldPin: string, newPin: string) =>
    updateUserField('pin', oldPin, newPin, v => v.length !== 4 ? 'PIN은 4자리여야 합니다' : null)

  const logout = () => {
    clearSession()
    setIsLoggedIn(false)
    setIsPinVerified(false)
    setUserRole(null)
    setUserName(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, isPinVerified, userRole, userName, login, verifyPin, logout, changePassword, changePin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

// 인증 필요한 페이지에서 사용 — 미인증 시 로그인으로 리다이렉트
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
