'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

const VALID_ID = '103613'
const VALID_PW = '103613'
const SESSION_KEY = 'bumper_auth'

interface AuthCtx { isLoggedIn: boolean; login: (id: string, pw: string) => boolean; logout: () => void }
const AuthContext = createContext<AuthCtx>({ isLoggedIn: false, login: () => false, logout: () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const s = sessionStorage.getItem(SESSION_KEY)
    if (s === 'ok') setIsLoggedIn(true)
  }, [])

  const login = (id: string, pw: string) => {
    if (id === VALID_ID && pw === VALID_PW) {
      sessionStorage.setItem(SESSION_KEY, 'ok')
      setIsLoggedIn(true)
      return true
    }
    return false
  }

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setIsLoggedIn(false)
    router.push('/login')
  }

  return <AuthContext.Provider value={{ isLoggedIn, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
