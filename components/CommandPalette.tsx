'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Command {
  id: string
  title: string
  desc?: string
  icon: string
  category: string
  href?: string
  action?: () => void
  keywords?: string[]
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Ctrl+K / Cmd+K로 열기, ESC로 닫기, ? 키로 단축키 도움말
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
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
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setSelectedIdx(0)
    }
  }, [open])

  // 명령 목록 (페이지 + 빠른 액션)
  const commands: Command[] = [
    { id: 'dashboard', title: 'Dashboard', desc: '메인 대시보드', icon: '🏠', category: '페이지', href: '/dashboard', keywords: ['홈', '메인', '대시보드'] },
    { id: 'equipment', title: 'Equipment', desc: '설비 관리', icon: '🏭', category: '페이지', href: '/equipment', keywords: ['설비', '장비'] },
    { id: 'alarm', title: 'Alarm', desc: '알람 관리', icon: '🔔', category: '페이지', href: '/alarm', keywords: ['알람', '불량', '경고'] },
    { id: 'inspection', title: 'Inspection', desc: '스크라치 + 아이마킹 통합', icon: '🔍', category: '페이지', href: '/inspection', keywords: ['스크라치', '찍힘', '아이마킹', 'imarking', '점검', 'inspection', '검사'] },
    { id: 'maintenance', title: 'Maintenance', desc: '정비 이력', icon: '🔧', category: '페이지', href: '/maintenance', keywords: ['정비', '수리', 'maintenance'] },
    { id: 'materials', title: 'Materials', desc: '자재 관리', icon: '📦', category: '페이지', href: '/materials', keywords: ['자재', '부품', 'materials'] },
    { id: 'staff', title: 'HR Info', desc: '인사정보', icon: '👤', category: '페이지', href: '/staff', keywords: ['인사', '직원', 'hr', 'staff'] },
    { id: 'memo', title: 'Memo', desc: '메모', icon: '📝', category: '페이지', href: '/memo', keywords: ['메모', '노트'] },
    { id: 'analysis', title: 'Analysis', desc: '데이터 분석', icon: '📈', category: '페이지', href: '/analysis', keywords: ['분석', '차트', 'analysis'] },
    { id: 'reports', title: 'Reports', desc: '주간/월간 보고서 + 히트맵', icon: '📑', category: '페이지', href: '/reports', keywords: ['보고서', '리포트', '히트맵', 'report'] },
    { id: 'manual', title: 'Manual', desc: '업무 매뉴얼', icon: '📖', category: '페이지', href: '/manual', keywords: ['매뉴얼', '메뉴얼', '가이드', '업무', '절차', 'manual', 'maual'] },
    { id: 'backup', title: 'Backup', desc: '백업/복원', icon: '💾', category: '페이지', href: '/backup', keywords: ['백업', 'backup'] },
    { id: 'security', title: 'Security', desc: '보안 설정', icon: '🛡️', category: '페이지', href: '/security', keywords: ['보안', '비밀번호', 'security'] },
    // 빠른 액션
    { id: 'print', title: '현재 페이지 인쇄', icon: '🖨️', category: '액션', action: () => window.print(), keywords: ['인쇄', 'print'] },
    { id: 'theme', title: '다크/라이트 모드 전환', icon: '🌓', category: '액션', action: () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'dark'
      const next = cur === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', next)
      localStorage.setItem('theme', next)
    }, keywords: ['다크', '라이트', '테마', 'theme'] },
    { id: 'help', title: '단축키 도움말', icon: '❓', category: '도움말', action: () => { window.dispatchEvent(new CustomEvent('showShortcutHelp')) }, keywords: ['단축키', '도움말', 'help'] },
  ]

  // 검색 필터
  const filtered = query
    ? commands.filter(c => {
        const q = query.toLowerCase()
        return c.title.toLowerCase().includes(q) ||
               c.desc?.toLowerCase().includes(q) ||
               c.keywords?.some(k => k.includes(q) || q.includes(k))
      })
    : commands

  // 카테고리별 그룹핑
  const grouped: Record<string, Command[]> = {}
  filtered.forEach(c => {
    if (!grouped[c.category]) grouped[c.category] = []
    grouped[c.category].push(c)
  })

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      executeCommand(filtered[selectedIdx])
    }
  }

  const executeCommand = (cmd: Command | undefined) => {
    if (!cmd) return
    setOpen(false)
    if (cmd.href) {
      router.push(cmd.href)
    } else if (cmd.action) {
      cmd.action()
    }
  }

  if (!open) return null

  let renderIdx = 0
  return (
    <div className="cmd-palette-overlay" onClick={e => e.target === e.currentTarget && setOpen(false)}>
      <div className="cmd-palette">
        <input
          ref={inputRef}
          className="cmd-input"
          placeholder="페이지 검색, 명령 실행... (예: 알람, 정비, 인쇄)"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelectedIdx(0) }}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <div className="cmd-results">
          {filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              검색 결과가 없습니다
            </div>
          ) : Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div style={{ padding: '6px 20px 4px', fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                {category}
              </div>
              {items.map(cmd => {
                const curIdx = renderIdx++
                return (
                  <button
                    key={cmd.id}
                    className={`cmd-item ${curIdx === selectedIdx ? 'active' : ''}`}
                    onClick={() => executeCommand(cmd)}
                    onMouseEnter={() => setSelectedIdx(curIdx)}
                  >
                    <span className="cmd-item-icon">{cmd.icon}</span>
                    <div className="cmd-item-text">
                      <div>{cmd.title}</div>
                      {cmd.desc && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{cmd.desc}</div>}
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        <div className="cmd-footer">
          <span><span className="kbd">↑</span><span className="kbd">↓</span> 이동 · <span className="kbd">Enter</span> 선택</span>
          <span><span className="kbd">ESC</span> 닫기</span>
        </div>
      </div>
    </div>
  )
}
