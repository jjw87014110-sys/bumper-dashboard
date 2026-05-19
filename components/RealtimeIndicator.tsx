'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function RealtimeIndicator() {
  const [newCount, setNewCount] = useState(0)
  const [lastTable, setLastTable] = useState('')

  useEffect(() => {
    // 주요 테이블 변경 감지
    const tables = ['alarm', 'maintenance', 'scratch']
    const channel = supabase.channel('realtime-changes')

    tables.forEach(table => {
      channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table }, (payload) => {
        setNewCount(c => c + 1)
        setLastTable(table)
        // 5초 후 자동 사라짐
        setTimeout(() => setNewCount(c => Math.max(0, c - 1)), 5000)
      })
    })

    channel.subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const dismiss = () => { setNewCount(0); setLastTable('') }

  if (newCount === 0) return null

  const tableLabels: Record<string, string> = {
    alarm: '알람',
    maintenance: '정비',
    scratch: '찍힘',
  }

  return (
    <div className="realtime-indicator" onClick={dismiss} title="클릭하여 닫기">
      🔔 새 {tableLabels[lastTable] || '데이터'} {newCount}건
    </div>
  )
}
