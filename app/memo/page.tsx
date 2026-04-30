'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

export default function MemoPage() {
  const { isPinVerified } = useAuth()
  const _router = typeof window !== 'undefined' ? null : null
  if (typeof window !== 'undefined' && !isPinVerified) {
    window.location.href = '/login'
  }
  const [memos, setMemos] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [deleteId, setDeleteId] = useState<number|null>(null)
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const [search, setSearch] = useState('')
  const [isNew, setIsNew] = useState(false)

  useEffect(() => { fetchMemos() }, [])

  async function fetchMemos() {
    setLoading(true)
    const { data } = await supabase.from('memos').select('*').order('updated_at', { ascending: false })
    setMemos(data || [])
    setLoading(false)
  }

  function showToast(msg: string, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  function selectMemo(m: any) {
    setSelected(m)
    setTitle(m.title)
    setContent(m.content || '')
    setIsNew(false)
  }

  function newMemo() {
    setSelected(null)
    setTitle('')
    setContent('')
    setIsNew(true)
  }

  async function saveMemo() {
    if (!title.trim()) { showToast('제목을 입력해주세요', 'error'); return }
    setSaving(true)
    const now = new Date().toISOString()
    if (selected) {
      const { error } = await supabase.from('memos').update({ title: title.trim(), content, updated_at: now }).eq('id', selected.id)
      if (error) { showToast('저장 실패', 'error'); setSaving(false); return }
      showToast('저장되었습니다')
      setSelected({ ...selected, title: title.trim(), content, updated_at: now })
    } else {
      const { data, error } = await supabase.from('memos').insert([{ title: title.trim(), content, created_at: now, updated_at: now }]).select()
      if (error) { showToast('저장 실패', 'error'); setSaving(false); return }
      showToast('메모가 생성되었습니다')
      if (data?.[0]) setSelected(data[0])
    }
    setSaving(false)
    fetchMemos()
  }

  async function deleteMemo(id: number) {
    await supabase.from('memos').delete().eq('id', id)
    showToast('삭제되었습니다')
    setDeleteId(null)
    if (selected?.id === id) { setSelected(null); setTitle(''); setContent('') }
    fetchMemos()
  }

  const filtered = memos.filter(m =>
    m.title?.toLowerCase().includes(search.toLowerCase()) ||
    m.content?.toLowerCase().includes(search.toLowerCase())
  )

  function formatDate(str: string) {
    if (!str) return ''
    const d = new Date(str)
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Memo</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>업무 메모 및 노트</div>
          </div>
          <button className="btn btn-primary" onClick={newMemo}>+ 새 메모</button>
        </div>

        <div className="content-area" style={{ display: 'flex', gap: 16, alignItems: 'flex-start', height: 'calc(100vh - 72px)', overflow: 'hidden' }}>
          {/* 메모 목록 */}
          <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              className="form-input"
              type="text"
              placeholder="🔍 메모 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: 12 }}
            />
            <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
              {loading ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>로딩 중...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                  {search ? '검색 결과 없음' : '메모 없음\n+ 새 메모를 만들어보세요'}
                </div>
              ) : (
                <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 180px)' }}>
                  {filtered.map(m => (
                    <div key={m.id}
                      onClick={() => selectMemo(m)}
                      style={{
                        padding: '12px 14px', cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        background: selected?.id === m.id ? 'var(--accent-blue-dim)' : 'transparent',
                        borderLeft: `3px solid ${selected?.id === m.id ? 'var(--accent-blue)' : 'transparent'}`,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (selected?.id !== m.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                      onMouseLeave={e => { if (selected?.id !== m.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: selected?.id === m.id ? 'var(--accent-blue)' : 'var(--text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.title}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(m.content || '').slice(0, 40) || '내용 없음'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatDate(m.updated_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 편집 영역 */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
            {!isNew && selected === null ? (
              <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📝</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>메모를 선택하거나 새로 만들어보세요</div>
                <div style={{ fontSize: 12 }}>왼쪽에서 메모 선택 또는 + 새 메모 클릭</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="제목 입력..."
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    style={{ flex: 1, fontSize: 16, fontWeight: 600, padding: '10px 14px' }}
                  />
                  <button className="btn btn-primary" onClick={saveMemo} disabled={saving}>
                    {saving ? '저장 중...' : '💾 저장'}
                  </button>
                  {selected && (
                    <button className="btn btn-danger" onClick={() => setDeleteId(selected.id)}>삭제</button>
                  )}
                </div>
                {selected && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    마지막 수정: {formatDate(selected.updated_at)}
                  </div>
                )}
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="내용을 입력하세요..."
                  style={{
                    flex: 1,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    fontFamily: 'Noto Sans KR, sans-serif',
                    fontSize: 13,
                    lineHeight: 1.7,
                    padding: '14px 16px',
                    resize: 'none',
                    outline: 'none',
                    minHeight: 400,
                  }}
                  onFocus={e => (e.target as HTMLElement).style.borderColor = 'var(--accent-blue)'}
                  onBlur={e => (e.target as HTMLElement).style.borderColor = 'var(--border)'}
                  onKeyDown={e => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                      e.preventDefault()
                      saveMemo()
                    }
                  }}
                />
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>
                  Ctrl+S 로 저장 · {content.length}자
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 360 }}>
            <div className="modal-header">
              <div className="modal-title">메모 삭제</div>
              <button className="modal-close" onClick={() => setDeleteId(null)}>×</button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>이 메모를 삭제하시겠습니까?</div>
            <div className="modal-footer" style={{ marginTop: 0, paddingTop: 0, border: 'none' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>취소</button>
              <button className="btn btn-danger" onClick={() => deleteMemo(deleteId)}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
