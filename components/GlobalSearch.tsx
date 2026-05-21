'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface SearchResult {
  type: 'alarm' | 'memo' | 'maintenance' | 'scratch' | 'materials'
  id: number
  title: string
  desc: string
  date: string
  href: string
  icon: string
  color: string
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Ctrl+F / Cmd+F로 데이터 검색
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setOpen(o => !o)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    if (!open) { setQuery(''); setResults([]) }
  }, [open])

  // 검색 실행 (디바운스)
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(() => doSearch(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  async function doSearch(q: string) {
    setLoading(true)
    const all: SearchResult[] = []

    // 1. 알람 검색 (note, holder_no)
    const { data: alarms } = await supabase
      .from('alarm')
      .select('id, equipment_no, date, note, holder_no, punch_alarm, weld_alarm')
      .or(`note.ilike.%${q}%,holder_no.ilike.%${q}%`)
      .order('date', { ascending: false })
      .limit(10)
    ;(alarms || []).forEach((r: any) => all.push({
      type: 'alarm',
      id: r.id,
      title: `#${String(r.equipment_no).padStart(2,'0')} · ${r.holder_no || '-'}`,
      desc: `${r.note || ''} (펀칭 ${r.punch_alarm||0} / 융착 ${r.weld_alarm||0})`,
      date: r.date,
      href: '/alarm',
      icon: '🔔',
      color: 'var(--accent-amber)',
    }))

    // 2. 메모 검색
    const { data: memos } = await supabase
      .from('memos')
      .select('id, title, content, date, equipment_no')
      .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
      .order('date', { ascending: false })
      .limit(10)
    ;(memos || []).forEach((r: any) => all.push({
      type: 'memo',
      id: r.id,
      title: r.title || '메모',
      desc: (r.content || '').slice(0, 60),
      date: r.date || '',
      href: '/memo',
      icon: '📝',
      color: 'var(--accent-purple)',
    }))

    // 3. 정비 검색
    const { data: maints } = await supabase
      .from('maintenance')
      .select('id, equipment_no, date, alarm_content, action_content, replaced_parts')
      .or(`alarm_content.ilike.%${q}%,action_content.ilike.%${q}%,replaced_parts.ilike.%${q}%`)
      .order('date', { ascending: false })
      .limit(10)
    ;(maints || []).forEach((r: any) => all.push({
      type: 'maintenance',
      id: r.id,
      title: `#${String(r.equipment_no).padStart(2,'0')} · ${r.alarm_content || '정비'}`,
      desc: r.action_content || r.replaced_parts || '',
      date: r.date,
      href: '/maintenance',
      icon: '🔧',
      color: 'var(--accent-blue)',
    }))

    // 4. 찍힘 검색
    const { data: scratches } = await supabase
      .from('scratch')
      .select('id, equipment_no, date, scratch_location, action, note')
      .or(`scratch_location.ilike.%${q}%,action.ilike.%${q}%,note.ilike.%${q}%`)
      .order('date', { ascending: false })
      .limit(10)
    ;(scratches || []).forEach((r: any) => all.push({
      type: 'scratch',
      id: r.id,
      title: `#${String(r.equipment_no).padStart(2,'0')} · ${r.scratch_location || '찍힘'}`,
      desc: r.action || r.note || '',
      date: r.date,
      href: '/inspection',
      icon: '🔍',
      color: 'var(--accent-amber)',
    }))

    // 5. 자재 검색
    const { data: mats } = await supabase
      .from('materials')
      .select('id, equipment_no, item_name, spec, maker, quantity')
      .or(`item_name.ilike.%${q}%,spec.ilike.%${q}%,maker.ilike.%${q}%`)
      .limit(10)
    ;(mats || []).forEach((r: any) => all.push({
      type: 'materials',
      id: r.id,
      title: `#${String(r.equipment_no).padStart(2,'0')} · ${r.item_name}`,
      desc: `${r.spec || ''} · ${r.maker || ''} · 재고 ${r.quantity}`,
      date: '',
      href: '/materials',
      icon: '📦',
      color: 'var(--accent-teal)',
    }))

    // 날짜 최신순 정렬
    all.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    setResults(all)
    setLoading(false)
  }

  if (!open) return null

  return (
    <div onClick={() => setOpen(false)} style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 1000,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: 80,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)',
        borderRadius: 12,
        width: '90%', maxWidth: 720,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>🔎</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="알람, 메모, 정비, 찍힘, 자재 등 통합 검색..."
            style={{
              flex: 1,
              border: 'none', outline: 'none',
              background: 'transparent',
              fontSize: 15, color: 'var(--text-primary)',
              fontFamily: 'Pretendard, sans-serif',
            }}
          />
          <span style={{ fontSize: 10, color: 'var(--text-muted)', padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 4 }}>ESC</span>
        </div>

        <div style={{ maxHeight: 480, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>검색 중...</div>
          ) : query.length < 2 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              2글자 이상 입력하세요<br />
              <span style={{ fontSize: 10 }}>알람의 비고, 메모 내용, 정비 내역, 자재명 등을 검색합니다</span>
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🤷</div>
              "{query}" 검색 결과가 없습니다
            </div>
          ) : (
            <>
              <div style={{ padding: '8px 20px', fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-hover)' }}>
                총 {results.length}건 검색됨
              </div>
              {results.map((r, i) => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => { router.push(r.href); setOpen(false) }}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '12px 20px',
                    border: 'none', background: 'transparent',
                    borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 12,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 20 }}>{r.icon}</span>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ background: r.color, color: 'white', padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>{r.type.toUpperCase()}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.desc}
                    </div>
                  </div>
                  {r.date && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{r.date}</div>}
                </button>
              ))}
            </>
          )}
        </div>

        <div style={{ padding: '8px 20px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-hover)', display: 'flex', justifyContent: 'space-between' }}>
          <span><kbd style={{ padding: '1px 4px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg-card)' }}>Ctrl+F</kbd> 검색 열기/닫기</span>
          <span>클릭하여 해당 페이지로 이동</span>
        </div>
      </div>
    </div>
  )
}
