'use client'
import { useState, useCallback } from 'react'

type ToastType = 'success' | 'error' | 'info'
interface ToastState { msg: string; type: ToastType }

/**
 * 토스트 알림 훅 - 모든 페이지에서 공통 사용
 *
 * 사용법:
 *   const { toast, showToast, ToastUI } = useToast()
 *   showToast('등록되었습니다')
 *   showToast('실패', 'error')
 *   // JSX 안에 <ToastUI /> 추가
 */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  const showToast = useCallback((msg: string, type: ToastType = 'success', duration = 3000) => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), duration)
  }, [])

  const ToastUI = useCallback(() => {
    if (!toast) return null
    return <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
  }, [toast])

  return { toast, showToast, ToastUI }
}
