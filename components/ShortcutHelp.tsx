'use client'
import { useEffect, useState } from 'react'

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], desc: '명령 팔레트 열기' },
  { keys: ['?'], desc: '이 도움말 보기' },
  { keys: ['ESC'], desc: '모달 닫기' },
  { keys: ['Ctrl', 'P'], desc: '현재 페이지 인쇄' },
  { keys: ['↑', '↓'], desc: '명령 팔레트 항목 이동' },
  { keys: ['Enter'], desc: '선택/저장' },
]

export default function ShortcutHelp() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // 입력 필드에서는 무시
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setOpen(o => !o)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    const handleShowHelp = () => setOpen(true)
    window.addEventListener('keydown', handleKey)
    window.addEventListener('showShortcutHelp', handleShowHelp)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('showShortcutHelp', handleShowHelp)
    }
  }, [open])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setOpen(false)}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div className="modal-title">⌨️ 키보드 단축키</div>
          <button className="modal-close" onClick={() => setOpen(false)}>×</button>
        </div>
        <div className="shortcut-help">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="shortcut-item">
              <span className="shortcut-desc">{s.desc}</span>
              <span className="shortcut-keys">
                {s.keys.map((k, j) => (
                  <span key={j} className="kbd">{k}</span>
                ))}
              </span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 16, textAlign: 'center' }}>
          💡 어디서든 <span className="kbd">?</span> 를 눌러 이 화면을 볼 수 있습니다
        </div>
      </div>
    </div>
  )
}
