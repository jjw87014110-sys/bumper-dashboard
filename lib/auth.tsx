'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LockScreen from '@/components/LockScreen'
import { verifyPassword, hashPassword, isHashed } from '@/lib/passwordHash'

// localStorage 키 상수
const KEYS = {
  session: 'bumper_auth',
  pin: 'bumper_pin',
  expire: 'bumper_expire',
  role: 'bumper_role',
  name: 'bumper_name',
  dept: 'bumper_dept',
  position: 'bumper_position',
} as const

// 8시간 세션: 출근~퇴근 동안 재로그인 불필요
const SESSION_DURATION = 8 * 60 * 60 * 1000

// localStorage 일괄 저장/삭제 (3곳에서 중복되던 로직 통합)
function saveSession(role: string, name: string, dept?: string, position?: string) {
  localStorage.setItem(KEYS.session, 'ok')
  localStorage.setItem(KEYS.expire, String(Date.now() + SESSION_DURATION))
  localStorage.setItem(KEYS.role, role)
  localStorage.setItem(KEYS.name, name)
  localStorage.setItem(KEYS.dept, dept || '')
  localStorage.setItem(KEYS.position, position || '')
}

function clearSession() {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key))
}

interface AuthCtx {
  isLoggedIn: boolean
  isPinVerified: boolean
  isLocked: boolean
  userRole: 'admin' | 'user' | null
  userName: string | null
  userDept: string | null
  userPosition: string | null
  login: (id: string, pw: string) => Promise<boolean>
  verifyPin: (pin: string) => Promise<boolean>
  lock: () => void
  unlock: () => void
  logout: () => void
  changePassword: (oldPw: string, newPw: string) => Promise<{ ok: boolean; msg: string }>
  changePin: (oldPin: string, newPin: string) => Promise<{ ok: boolean; msg: string }>
}

const AuthContext = createContext<AuthCtx>({
  isLoggedIn: false,
  isPinVerified: false,
  isLocked: false,
  userRole: null,
  userName: null,
  userDept: null,
  userPosition: null,
  login: async () => false,
  verifyPin: async () => false,
  lock: () => {},
  unlock: () => {},
  logout: () => {},
  changePassword: async () => ({ ok: false, msg: '' }),
  changePin: async () => ({ ok: false, msg: '' }),
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isPinVerified, setIsPinVerified] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userDept, setUserDept] = useState<string | null>(null)
  const [userPosition, setUserPosition] = useState<string | null>(null)
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
    setUserDept(localStorage.getItem(KEYS.dept) || null)
    setUserPosition(localStorage.getItem(KEYS.position) || null)
    // 잠금 상태 복원 (sessionStorage — 탭 새로고침해도 유지, 탭 닫으면 사라짐)
    if (sessionStorage.getItem('bumper_locked') === '1') setIsLocked(true)
  }, [])

  // 5분 자동 잠금 — 마우스/키보드 무동작 감지
  useEffect(() => {
    if (!isLoggedIn || !isPinVerified) return
    const IDLE_MS = 5 * 60 * 1000 // 5분
    let timer: ReturnType<typeof setTimeout> | null = null

    function reset() {
      if (timer) clearTimeout(timer)
      // 이미 잠긴 상태면 타이머 재시작 안 함
      if (sessionStorage.getItem('bumper_locked') === '1') return
      timer = setTimeout(() => {
        sessionStorage.setItem('bumper_locked', '1')
        setIsLocked(true)
      }, IDLE_MS)
    }

    const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach(ev => window.addEventListener(ev, reset, { passive: true }))
    reset() // 초기 타이머 시작

    return () => {
      if (timer) clearTimeout(timer)
      events.forEach(ev => window.removeEventListener(ev, reset))
    }
  }, [isLoggedIn, isPinVerified])

  const login = async (id: string, pw: string) => {
    // user_id로만 조회 (비번은 아래에서 해시 검증)
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', id)
      .eq('is_active', true)
      .single()

    if (data) {
      // 평문/해시 모두 처리하는 검증
      const pwOk = await verifyPassword(pw, data.password || '')
      if (pwOk) {
        // 자동 마이그레이션: 저장된 비번이 아직 평문이면 해시로 업그레이드
        if (!isHashed(data.password || '')) {
          try {
            const hashed = await hashPassword(pw)
            await supabase.from('users').update({ password: hashed }).eq('id', data.id)
          } catch {}
        }
        const role = data.role || 'user'
        const name = data.name || id
        const dept = data.department || ''
        const position = data.position || ''
        saveSession(role, name, dept, position)
        setIsLoggedIn(true)
        setUserRole(role)
        setUserName(name)
        setUserDept(dept)
        setUserPosition(position)
        return true
      }
    }

    // DB 실패 시 환경변수 fallback (초기 설정용 · DB에 사용자 등록 전)
    const envId = process.env.NEXT_PUBLIC_ADMIN_ID || '103613'
    const envPw = process.env.NEXT_PUBLIC_ADMIN_PW || '103613'
    if (id === envId && pw === envPw) {
      saveSession('admin', '관리자', '생산기술', 'PM')
      setIsLoggedIn(true)
      setUserRole('admin')
      setUserName('관리자')
      setUserDept('생산기술')
      setUserPosition('PM')
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

    // 현재 값 검증 — 비밀번호는 해시 검증, PIN은 평문 비교
    if (field === 'password') {
      const ok = await verifyPassword(oldValue, data.password || '')
      if (!ok) return { ok: false, msg: '현재 비밀번호가 올바르지 않습니다' }
    } else {
      if (data[field] !== oldValue) return { ok: false, msg: '현재 PIN이 올바르지 않습니다' }
    }

    const validationError = validate(newValue)
    if (validationError) return { ok: false, msg: validationError }

    // 비밀번호는 해싱해서 저장, PIN은 평문 저장
    const valueToStore = field === 'password' ? await hashPassword(newValue) : newValue
    const { error } = await supabase.from('users').update({ [field]: valueToStore, updated_at: new Date().toISOString() }).eq('id', data.id)
    if (error) return { ok: false, msg: '변경 실패: ' + error.message }
    return { ok: true, msg: field === 'password' ? '비밀번호가 변경되었습니다' : 'PIN이 변경되었습니다' }
  }

  const changePassword = (oldPw: string, newPw: string) =>
    updateUserField('password', oldPw, newPw, v => v.length < 4 ? '새 비밀번호는 4자리 이상이어야 합니다' : null)

  const changePin = (oldPin: string, newPin: string) =>
    updateUserField('pin', oldPin, newPin, v => v.length !== 4 ? 'PIN은 4자리여야 합니다' : null)

  const logout = () => {
    clearSession()
    sessionStorage.removeItem('bumper_locked')
    setIsLoggedIn(false)
    setIsPinVerified(false)
    setIsLocked(false)
    setUserRole(null)
    setUserName(null)
    setUserDept(null)
    setUserPosition(null)
    router.push('/login')
  }

  const lock = () => {
    sessionStorage.setItem('bumper_locked', '1')
    setIsLocked(true)
  }

  const unlock = () => {
    sessionStorage.removeItem('bumper_locked')
    setIsLocked(false)
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, isPinVerified, isLocked, userRole, userName, userDept, userPosition, login, verifyPin, lock, unlock, logout, changePassword, changePin }}>
      {children}
      {isLocked && isLoggedIn && <LockScreen onUnlock={unlock} />}
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

// admin 전용 페이지에서 사용 — 미인증 시 로그인, admin 아니면 대시보드로
export function useRequireAdmin() {
  const ctx = useContext(AuthContext)
  const router = useRouter()
  useEffect(() => {
    if (!ctx.isPinVerified) {
      router.push('/login')
    } else if (ctx.userRole !== 'admin') {
      router.push('/dashboard')
    }
  }, [ctx.isPinVerified, ctx.userRole, router])
  return ctx
}
