'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

const navItems = [
  // ── 홈 / 현황 ──
  { href: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { href: '/equipment', label: 'Equipment', icon: 'server' },
  { divider: true },
  // ── 매일 업무 (07:30 → 08:00 → 16:00 시간 순) ──
  { href: '/inspection', label: 'Inspection', icon: 'chart' },
  { href: '/alarm', label: 'Alarm', icon: 'bell' },
  { divider: true },
  // ── 이력 관리 (정비 → 자재 → 조건) ──
  { href: '/maintenance', label: 'Maintenance', icon: 'tool' },
  { href: '/materials', label: 'Materials', icon: 'box' },
  { divider: true },
  // ── 정보 / 분석 ──
  { href: '/memo', label: 'Memo', icon: 'memo' },
  { href: '/projects', label: 'Projects', icon: 'worklog' },
  { href: '/analysis', label: 'Analysis', icon: 'analysis' },
  { href: '/reports', label: 'Reports', icon: 'report' },
  { href: '/staff', label: 'HR Info', icon: 'user' },
  { href: '/worktime', label: 'Worktime', icon: 'clock' },
  { divider: true },
  // ── 참고 / 시스템 ──
  { href: '/manual', label: 'Manual', icon: 'manual' },
  { href: '/backup', label: 'Backup', icon: 'box' },
  { href: '/security', label: 'Security', icon: 'shield' },
]

function Icon({ name }: { name: string }) {
  const s = { width: 15, height: 15, flexShrink: 0 as const }
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 }
  switch(name) {
    case 'grid': return <svg style={s} viewBox="0 0 15 15" {...p}><rect x="1" y="1" width="5.5" height="5.5" rx="1"/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1"/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1"/></svg>
    case 'server': return <svg style={s} viewBox="0 0 15 15" {...p}><rect x="1" y="2" width="13" height="4" rx="1"/><rect x="1" y="9" width="13" height="4" rx="1"/><circle cx="11.5" cy="4" r="0.8" fill="currentColor"/><circle cx="11.5" cy="11" r="0.8" fill="currentColor"/></svg>
    case 'bell': return <svg style={s} viewBox="0 0 15 15" {...p}><path d="M7.5 1.5a5 5 0 015 5v2.5l1 2H1.5l1-2V6.5a5 5 0 015-5z"/><path d="M6 12a1.5 1.5 0 003 0"/></svg>
    case 'alert': return <svg style={s} viewBox="0 0 15 15" {...p}><circle cx="7.5" cy="7.5" r="6"/><line x1="7.5" y1="4.5" x2="7.5" y2="8"/><circle cx="7.5" cy="10.5" r="0.5" fill="currentColor"/></svg>
    case 'chart': return <svg style={s} viewBox="0 0 15 15" {...p}><polyline points="2,11 5,6 8,8 11,3 14,5"/></svg>
    case 'settings': return <svg style={s} viewBox="0 0 15 15" {...p}><circle cx="7.5" cy="7.5" r="2"/><path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M3 3l1 1M11 11l1 1M3 12l1-1M11 4l1-1"/></svg>
    case 'tool': return <svg style={s} viewBox="0 0 15 15" {...p}><path d="M9.5 1.5l-6 6 1.5 4 4-1.5 6-6-1.5-4zM3.5 8.5l-2 4 4-2"/></svg>
    case 'box': return <svg style={s} viewBox="0 0 15 15" {...p}><path d="M2 10.5V5l5.5-3.5L13 5v5.5l-5.5 3.5z"/><path d="M7.5 1.5L2 5l5.5 3.5L13 5z"/><line x1="7.5" y1="8.5" x2="7.5" y2="14"/></svg>
    case 'worklog': return <svg style={s} viewBox="0 0 15 15" {...p}><rect x="2" y="1" width="11" height="13" rx="1"/><line x1="4.5" y1="4.5" x2="10.5" y2="4.5"/><line x1="4.5" y1="7" x2="10.5" y2="7"/><line x1="4.5" y1="9.5" x2="7.5" y2="9.5"/><path d="M9 10.5l1 1 2-2"/></svg>
    case 'analysis': return <svg style={s} viewBox="0 0 15 15" {...p}><polyline points="1,12 4,7 7,9 10,4 14,6"/><line x1="1" y1="14" x2="14" y2="14"/></svg>
    case 'manual': return <svg style={s} viewBox="0 0 15 15" {...p}><path d="M3 1.5h7l3 3v9.5h-10z"/><line x1="5" y1="6" x2="11" y2="6"/><line x1="5" y1="9" x2="11" y2="9"/><line x1="5" y1="12" x2="9" y2="12"/></svg>
    case 'report': return <svg style={s} viewBox="0 0 15 15" {...p}><rect x="2" y="2" width="11" height="12" rx="1"/><line x1="5" y1="6" x2="11" y2="6"/><line x1="5" y1="9" x2="11" y2="9"/><polyline points="5,12 7,11 9,13 11,10"/></svg>
    case 'memo': return <svg style={s} viewBox="0 0 15 15" {...p}><rect x="2" y="1" width="11" height="13" rx="1"/><line x1="4.5" y1="4.5" x2="10.5" y2="4.5"/><line x1="4.5" y1="7" x2="10.5" y2="7"/><line x1="4.5" y1="9.5" x2="8" y2="9.5"/></svg>
    case 'user': return <svg style={s} viewBox="0 0 15 15" {...p}><circle cx="7.5" cy="5" r="2.5"/><path d="M2 13c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/></svg>
    case 'clock': return <svg style={s} viewBox="0 0 15 15" {...p}><circle cx="7.5" cy="7.5" r="6"/><line x1="7.5" y1="4" x2="7.5" y2="7.5"/><line x1="7.5" y1="7.5" x2="10" y2="9"/></svg>
    case 'moon': return <svg style={s} viewBox="0 0 15 15" {...p}><path d="M12 9A6 6 0 116 3a4.5 4.5 0 006 6z"/></svg>
    case 'shield': return <svg style={s} viewBox="0 0 15 15" {...p}><path d="M7.5 1L2 3.5v4c0 3.5 2.5 6 5.5 7 3-1 5.5-3.5 5.5-7v-4z"/><path d="M5.5 7.5l1.5 1.5 3-3" strokeLinecap="round" strokeLinejoin="round"/></svg>
    default: return null
  }
}

export default function Sidebar({ mobileOpen, onMobileClose }: { mobileOpen?: boolean; onMobileClose?: () => void } = {}) {
  const path = usePathname()
  const { logout, lock } = useAuth()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [alarmCount, setAlarmCount] = useState(0)

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null
    if (saved) {
      setTheme(saved)
      document.documentElement.setAttribute('data-theme', saved)
    }
    // 이번 달 알람 건수 가져오기 (5분 주기 자동 갱신)
    function fetchAlarmCount() {
      const now = new Date()
      const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
      supabase.from('alarm').select('punch_alarm, weld_alarm', { count: 'exact' })
        .gte('date', monthStart)
        .then(({ data }) => {
          const count = (data||[]).filter((r: any) => (r.punch_alarm||0)+(r.weld_alarm||0) > 0).length
          setAlarmCount(count)
        })
    }
    fetchAlarmCount()
    const alarmTimer = setInterval(fetchAlarmCount, 5 * 60 * 1000)
    return () => clearInterval(alarmTimer)
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }

  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onClick={onMobileClose} />}
      <aside className={`sidebar${mobileOpen ? ' open' : ''}`}>
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          display: 'inline-block', background: 'var(--accent-blue)',
          color: 'white', fontSize: 9, fontWeight: 700,
          padding: '2px 7px', borderRadius: 4, marginBottom: 8, letterSpacing: 0.5
        }}>생산기술</div>
        <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>
          Machine<br/>Mgmt System
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
          Post-Process Mgmt
        </div>
      </div>

      <nav style={{ flex: 1, padding: '10px 0' }}>
        {navItems.map((item: any, i) => {
          if (item.divider) return (
            <div key={i} style={{ height: 1, background: 'var(--border)', margin: '6px 8px' }} />
          )
          const active = path === item.href
          return (
            <Link
              key={item.href}
              href={item.href!}
              prefetch={true}
              onClick={onMobileClose}
              className={active ? 'sidebar-link-active' : ''}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 16px', cursor: 'pointer',
                color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
                background: active ? 'var(--accent-blue-dim)' : 'transparent',
                borderLeft: `2px solid ${active ? 'var(--accent-blue)' : 'transparent'}`,
                fontSize: 12, fontWeight: active ? 600 : 400,
                transition: 'all 0.15s',
                textDecoration: 'none',
              }}
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' } }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' } }}
            >
              <Icon name={item.icon!} />
              {item.label}
              {item.href === '/alarm' && alarmCount > 0 && (
                <span style={{ marginLeft: 'auto', background: 'var(--accent-red)', color: 'white', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10, minWidth: 18, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}>{alarmCount}</span>
              )}
            </Link>
          )
        })}
      </nav>

      <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
        {/* 빠른 탐색 힌트 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '6px 10px', background: 'var(--bg-hover)', borderRadius: 6, cursor: 'pointer' }}
             onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>🔍 빠른 탐색</span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}><span className="kbd">Ctrl</span><span className="kbd">K</span></span>
        </div>
        {/* 테마 토글 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '6px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            <Icon name={theme === 'dark' ? 'moon' : 'sun'} />
            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </div>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="테마 전환" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--accent-blue-dim)', border: '1px solid var(--accent-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: 'var(--accent-blue)'
          }}>정</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500 }}>정상협 PM</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>생산기술</div>
          </div>
        </div>
        <button
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'center', fontSize: 11, marginBottom: 6 }}
          onClick={lock}
          title="화면 잠금 (5분 무동작 시 자동 잠금)"
        >
          🔒 화면 잠금
        </button>
        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 11 }} onClick={logout}>
          Log out
        </button>
      </div>
    </aside>
    </>
  )
}
