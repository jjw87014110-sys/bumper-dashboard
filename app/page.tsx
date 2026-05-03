'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

const DAILY_TODOS = [
  { key: '변동점관리', label: '변동점관리' },
  { key: '제품융착관리', label: '제품 융착관리' },
  { key: '찍힘관리', label: '찍힘 관리' },
  { key: '아이마킹', label: '아이마킹' },
  { key: '정비이력관리', label: '정비이력 관리' },
  { key: '알람관리', label: '알람관리' },
]

function toLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

export default function WorklogPage() {
  useAuth()
  const [date, setDate] = useState(toLocalDate(new Date()))
  const [author, setAuthor] = useState('정상협 PM')
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [note, setNote] = useState('')
  const [generating, setGenerating] = useState(false)
  const [logText, setLogText] = useState('')
  const [copied, setCopied] = useState(false)
  const [savedLogs, setSavedLogs] = useState<any[]>([])
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const [customTodos, setCustomTodos] = useState<string[]>([])
  const [customChecked, setCustomChecked] = useState<Record<string, boolean>>({})
  const [calEvents, setCalEvents] = useState<string[]>([])

  useEffect(() => {
    loadDateData(date)
    fetchLogs()
  }, [])

  function loadDateData(selectedDate: string) {
    try {
      // 정기 TO DO 체크 상태
      const saved = JSON.parse(localStorage.getItem('todo_' + selectedDate) || '{}')
      const merged: Record<string, boolean> = {}
      DAILY_TODOS.forEach(t => { if (saved[t.key]) merged[t.key] = true })
      setChecked(merged)

      // 달력에서 추가된 커스텀 할일
      const customTodos = JSON.parse(localStorage.getItem('cal_custom_todos') || '{}')
      const customChecked = JSON.parse(localStorage.getItem('custom_checked_' + selectedDate) || '{}')
      const dayCustomTodos: string[] = customTodos[selectedDate] || []
      setCustomTodos(dayCustomTodos)
      setCustomChecked(customChecked)

      // 달력 이벤트
      const events = JSON.parse(localStorage.getItem('cal_events') || '{}')
      const dayEvents: string[] = events[selectedDate] || []
      setCalEvents(dayEvents)
    } catch {}
  }

  async function fetchLogs() {
    const { data } = await supabase.from('worklogs').select('*').order('log_date', { ascending: false }).limit(30)
    setSavedLogs(data || [])
  }

  function handleDateChange(newDate: string) {
    setDate(newDate)
    setLogText('')
    loadDateData(newDate)
  }

  function showToast(msg: string, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const [promptText, setPromptText] = useState('')
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [promptCopied, setPromptCopied] = useState(false)

  function generateLog() {
    const selectedTodos = DAILY_TODOS.filter(t => checked[t.key]).map(t => t.label)
    const selectedCustom = customTodos.filter(t => customChecked[t])
    const allTodos = [...selectedTodos, ...selectedCustom]
    if (allTodos.length === 0) { showToast('완료한 업무를 최소 1개 이상 선택해주세요', 'error'); return }

    const prompt = `아래 정보를 바탕으로 업무일지를 작성해줘:
- 날짜: ${date}
- 작성자: ${author} / 생산기술팀
- 완료한 업무: ${allTodos.join(', ')}
${note ? `- 특이사항: ${note}` : ''}

업무일지 형식:
1. 날짜, 작성자, 팀
2. 업무내용 (번호 목록으로 각 업무별 구체적인 수행 내용)
3. 특이사항
4. 비고

업무별 내용 참고:
- 변동점관리: 생산 변동점(재료/금형/설비) 발생 여부 확인 및 기록
- 제품 융착관리: 후가공설비 융착 조건 확인 및 불량 모니터링
- 찍힘 관리: 범퍼 찍힘 발생 여부 전수 점검 및 원인 파악
- 아이마킹: 담당 설비 아이마킹 조건 점검 및 기록
- 정비이력 관리: 설비 정비 이력 확인 및 데이터 업데이트
- 알람관리: 후가공설비 알람 발생 현황 점검 및 조치

업무일지 내용만 출력해줘 (설명 없이)`

    setPromptText(prompt)
    setShowPromptModal(true)
  }

  function copyPrompt() {
    navigator.clipboard.writeText(promptText).then(() => {
      setPromptCopied(true)
      setTimeout(() => setPromptCopied(false), 2000)
    })
  }

  async function saveLog() {
    if (!logText) return
    setSaving(true)
    const selectedTodos = DAILY_TODOS.filter(t => checked[t.key]).map(t => t.label)
    const selectedCustom = customTodos.filter(t => customChecked[t])
    const allSaveTodos = [...selectedTodos, ...selectedCustom]
    const { error } = await supabase.from('worklogs').insert([{
      log_date: date,
      author,
      todos: allSaveTodos.join(', '),
      note,
      content: logText,
    }])
    if (error) { showToast('저장 실패', 'error') }
    else { showToast('저장되었습니다'); fetchLogs() }
    setSaving(false)
  }

  function copyText() {
    navigator.clipboard.writeText(logText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function deleteLog(id: number) {
    await supabase.from('worklogs').delete().eq('id', id)
    showToast('삭제되었습니다')
    if (selectedLog?.id === id) setSelectedLog(null)
    fetchLogs()
  }

  const td: React.CSSProperties = { fontSize: 11, padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }
  const th: React.CSSProperties = { fontSize: 10, padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', textAlign: 'left' as const }

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Work Log</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>AI 업무일지 자동 작성</div>
          </div>
        </div>

        <div className="content-area">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
            {/* 왼쪽: 작성 영역 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* 날짜/작성자 */}
              <div className="card">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">날짜</label>
                    <input className="form-input" type="date" value={date} onChange={e => handleDateChange(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">작성자</label>
                    <input className="form-input" type="text" value={author} onChange={e => setAuthor(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* 업무 선택 */}
              <div className="card">
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>완료한 업무 선택</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {DAILY_TODOS.map(item => (
                    <div key={item.key}
                      onClick={() => setChecked(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${checked[item.key] ? 'var(--accent-blue)' : 'var(--border)'}`,
                        background: checked[item.key] ? 'var(--accent-blue-dim)' : 'transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                        border: `2px solid ${checked[item.key] ? 'var(--accent-blue)' : 'var(--border-light)'}`,
                        background: checked[item.key] ? 'var(--accent-blue)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {checked[item.key] && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 12, color: checked[item.key] ? 'var(--accent-blue)' : 'var(--text-primary)', fontWeight: checked[item.key] ? 600 : 400 }}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 달력/추가 업무 */}
              {(customTodos.length > 0 || calEvents.length > 0) && (
                <div className="card">
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                    {date} 추가 업무 / 일정
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {customTodos.map(todo => (
                      <div key={todo}
                        onClick={() => setCustomChecked(prev => ({ ...prev, [todo]: !prev[todo] }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                          border: `1px solid ${customChecked[todo] ? 'var(--accent-amber)' : 'var(--border)'}`,
                          background: customChecked[todo] ? 'var(--accent-amber-dim)' : 'transparent',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, border: `2px solid ${customChecked[todo] ? 'var(--accent-amber)' : 'var(--border-light)'}`, background: customChecked[todo] ? 'var(--accent-amber)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {customChecked[todo] && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 12, color: customChecked[todo] ? 'var(--accent-amber)' : 'var(--text-primary)', fontWeight: customChecked[todo] ? 600 : 400 }}>
                          {todo}
                        </span>
                        <span style={{ fontSize: 9, color: 'var(--accent-amber)', background: 'var(--accent-amber-dim)', padding: '1px 6px', borderRadius: 8, marginLeft: 'auto' }}>추가</span>
                      </div>
                    ))}
                    {calEvents.filter(e => !customTodos.includes(e)).map(ev => (
                      <div key={ev} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-hover)', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, color: 'var(--accent-teal)', background: 'var(--accent-teal-dim)', padding: '1px 6px', borderRadius: 8 }}>일정</span>
                        {ev}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 특이사항 */}
              <div className="card">
                <div className="form-group">
                  <label className="form-label">특이사항 (선택)</label>
                  <textarea className="form-textarea" placeholder="오늘 특이사항이나 추가 내용을 입력하세요..." value={note} onChange={e => setNote(e.target.value)} style={{ minHeight: 80 }} />
                </div>
              </div>

              {/* 생성 버튼 */}
              <button className="btn btn-primary" onClick={generateLog} 
                style={{ padding: '12px', fontSize: 14, justifyContent: 'center' }}>
                '📋 업무일지 프롬프트 생성'
              </button>

              {/* 결과 */}
              {logText && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>생성된 업무일지</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={copyText}>
                        {copied ? '✓ 복사됨' : '복사'}
                      </button>
                      <button className="btn btn-primary btn-sm" onClick={saveLog} disabled={saving || !logText}>
                        {saving ? '저장 중...' : '💾 저장'}
                      </button>
                    </div>
                  </div>
                  {generating ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                      AI가 업무일지를 작성 중입니다...
                    </div>
                  ) : (
                    <textarea
                      value={logText}
                      onChange={e => setLogText(e.target.value)}
                      style={{
                        width: '100%', minHeight: 320, padding: '16px',
                        background: 'var(--bg-secondary)', border: 'none',
                        color: 'var(--text-primary)', fontFamily: 'Noto Sans KR, sans-serif',
                        fontSize: 12, lineHeight: 1.8, resize: 'vertical', outline: 'none',
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* 오른쪽: 저장된 업무일지 목록 */}
            <div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>
                  저장된 업무일지
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>{savedLogs.length}건</span>
                </div>
                {savedLogs.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>저장된 업무일지 없음</div>
                ) : (
                  <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                    {savedLogs.map(log => (
                      <div key={log.id}
                        onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                        style={{
                          padding: '12px 14px', cursor: 'pointer',
                          borderBottom: '1px solid var(--border)',
                          background: selectedLog?.id === log.id ? 'var(--accent-blue-dim)' : 'transparent',
                          borderLeft: `3px solid ${selectedLog?.id === log.id ? 'var(--accent-blue)' : 'transparent'}`,
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { if (selectedLog?.id !== log.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                        onMouseLeave={e => { if (selectedLog?.id !== log.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: selectedLog?.id === log.id ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                            {log.log_date}
                          </span>
                          <button className="btn btn-danger btn-sm" style={{ fontSize: 10, padding: '2px 8px' }}
                            onClick={e => { e.stopPropagation(); deleteLog(log.id) }}>삭제</button>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.todos}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 선택된 로그 내용 */}
              {selectedLog && (
                <div className="card" style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{selectedLog.log_date} 업무일지</div>
                    <button className="btn btn-ghost btn-sm" onClick={() => {
                      navigator.clipboard.writeText(selectedLog.content)
                      showToast('복사되었습니다')
                    }}>복사</button>
                  </div>
                  <div style={{ padding: 14, fontSize: 11, lineHeight: 1.8, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 300, overflowY: 'auto' }}>
                    {selectedLog.content}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* 프롬프트 모달 */}
      {showPromptModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPromptModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div className="modal-title">📋 업무일지 프롬프트</div>
              <button className="modal-close" onClick={() => setShowPromptModal(false)}>×</button>
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--accent-blue-dim)', borderRadius: 8, marginBottom: 14, fontSize: 12, color: 'var(--accent-blue)', border: '1px solid var(--accent-blue-dim)' }}>
              💡 아래 프롬프트를 복사해서 <strong>Claude.ai</strong> 또는 <strong>ChatGPT</strong>에 붙여넣으면 업무일지가 자동 작성됩니다!
              <div style={{ marginTop: 6 }}>
                👉 <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>claude.ai</a> 로 바로 가기
              </div>
            </div>
            <textarea
              readOnly
              value={promptText}
              style={{ width: '100%', minHeight: 280, padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontFamily: 'Noto Sans KR, sans-serif', fontSize: 12, lineHeight: 1.7, resize: 'vertical', outline: 'none' }}
              onClick={e => (e.target as HTMLTextAreaElement).select()}
            />
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowPromptModal(false)}>닫기</button>
              <button className="btn btn-primary" onClick={copyPrompt}>
                {promptCopied ? '✓ 복사됨!' : '📋 프롬프트 복사'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
