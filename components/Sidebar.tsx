'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { href: '/equipment', label: 'Equipment', icon: 'server' },
  { divider: true },
  { href: '/alarm', label: 'Alarm', icon: 'bell' },
  { href: '/scratch', label: 'Scratch', icon: 'alert' },
  { href: '/imarking', label: 'i-Marking', icon: 'chart' },
  { href: '/condition', label: 'Condition', icon: 'settings' },
  { divider: true },
  { href: '/maintenance', label: 'Maintenance', icon: 'tool' },
  { href: '/materials', label: 'Materials', icon: 'box' },
  { divider: true },
  { href: '/staff', label: 'HR Info', icon: 'user' },
  { href: '/memo', label: 'Memo', icon: 'memo' },
  { href: '/analysis', label: 'Analysis', icon: 'analysis' },
  { href: '/worklog', label: 'Work Log', icon: 'worklog' },
  { divider: true },
  { href: '/backup', label: 'Backup', icon: 'box' },
  { href: '/security', label: 'Security', icon: 'lock' },
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
    case 'memo': return <svg style={s} viewBox="0 0 15 15" {...p}><rect x="2" y="1" width="11" height="13" rx="1"/><line x1="4.5" y1="4.5" x2="10.5" y2="4.5"/><line x1="4.5" y1="7" x2="10.5" y2="7"/><line x1="4.5" y1="9.5" x2="8" y2="9.5"/></svg>
    case 'user': return <svg style={s} viewBox="0 0 15 15" {...p}><circle cx="7.5" cy="5" r="2.5"/><path d="M2 13c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/></svg>
    case 'moon': return <svg style={s} viewBox="0 0 15 15" {...p}><path d="M12 9A6 6 0 116 3a4.5 4.5 0 006 6z"/></svg>
    default: return null
  }
}

export default function Sidebar({ mobileOpen, onMobileClose }: { mobileOpen?: boolean; onMobileClose?: () => void } = {}) {
  const path = usePathname()
  const router = useRouter()
  const { logout } = useAuth()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null
    if (saved) {
      setTheme(saved)
      document.documentElement.setAttribute('data-theme', saved)
    }
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
            <div
              key={item.href}
              onClick={() => router.push(item.href!)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 16px', cursor: 'pointer',
                color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
                background: active ? 'var(--accent-blue-dim)' : 'transparent',
                borderLeft: `2px solid ${active ? 'var(--accent-blue)' : 'transparent'}`,
                fontSize: 12, fontWeight: active ? 600 : 400,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' } }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' } }}
            >
              <Icon name={item.icon!} />
              {item.label}
            </div>
          )
        })}
      </nav>

      <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
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
        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 11 }} onClick={logout}>
          Log out
        </button>
      </div>
    </aside>
    </>
  )
}
