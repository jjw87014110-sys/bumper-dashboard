'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

const VALID_ID = '103613'
const VALID_PW = '103613'
const VALID_PIN = '0515'  // 2차 PIN (변경 가능)
const SESSION_KEY = 'bumper_auth'
const PIN_KEY = 'bumper_pin'

interface AuthCtx {
  isLoggedIn: boolean
  isPinVerified: boolean
  login: (id: string, pw: string) => boolean
  verifyPin: (pin: string) => boolean
  logout: () => void
}
const AuthContext = createContext<AuthCtx>({
  isLoggedIn: false,
  isPinVerified: false,
  login: () => false,
  verifyPin: () => false,
  logout: () => {}
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isPinVerified, setIsPinVerified] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const s = sessionStorage.getItem(SESSION_KEY)
    const p = sessionStorage.getItem(PIN_KEY)
    if (s === 'ok') setIsLoggedIn(true)
    if (p === 'ok') setIsPinVerified(true)
  }, [])

  const login = (id: string, pw: string) => {
    if (id === VALID_ID && pw === VALID_PW) {
      sessionStorage.setItem(SESSION_KEY, 'ok')
      setIsLoggedIn(true)
      return true
    }
    return false
  }

  const verifyPin = (pin: string) => {
    if (pin === VALID_PIN) {
      sessionStorage.setItem(PIN_KEY, 'ok')
      setIsPinVerified(true)
      return true
    }
    return false
  }

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(PIN_KEY)
    setIsLoggedIn(false)
    setIsPinVerified(false)
    router.push('/login')
  }

  return <AuthContext.Provider value={{ isLoggedIn, isPinVerified, login, verifyPin, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
