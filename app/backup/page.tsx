'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

const TABLES = [
  { key: 'equipment', label: '설비 목록', icon: '🏭' },
  { key: 'alarm', label: '알람 데이터', icon: '🔔' },
  { key: 'condition_table', label: '조건표', icon: '⚙️' },
  { key: 'scratch', label: '찍힘 관리', icon: '🔍' },
  { key: 'imarking', label: '아이마킹', icon: '📊' },
  { key: 'maintenance', label: '정비이력', icon: '🔧' },
  { key: 'materials', label: '자재 관리', icon: '📦' },
  { key: 'memos', label: '메모', icon: '📝' },
  { key: 'staff', label: '인사정보', icon: '👤' },
  { key: 'leave_history', label: '휴가이력', icon: '🏖️' },
  { key: 'worklogs', label: '작업일지', icon: '📋' },
  { key: 'todo_checks', label: 'TODO 체크', icon: '✅' },
  { key: 'calendar_events', label: '캘린더', icon: '📅' },
  { key: 'access_logs', label: '접속 로그', icon: '🔐' },
]

export default function BackupPage() {
  const { isPinVerified } = useAuth()
  if (typeof window !== 'undefined' && !isPinVerified) { window.location.href = '/login' }

  const [tableCounts, setTableCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [backupLoading, setBackupLoading] = useState(false)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const [backupHistory, setBackupHistory] = useState<any[]>([])
  const [restoreConfirm, setRestoreConfirm] = useState(false)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [lastBackup, setLastBackup] = useState<string | null>(null)

  function showToast(msg: string, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 4000) }

  useEffect(() => {
    fetchCounts()
    // localStorage에서 백업 이력
    try {
      const hist = JSON.parse(localStorage.getItem('backup_history') || '[]')
      setBackupHistory(hist)
      if (hist.length > 0) setLastBackup(hist[0].date)
    } catch {}
  }, [])

  async function fetchCounts() {
    setLoading(true)
    const counts: Record<string, number> = {}
    for (const t of TABLES) {
      const { count } = await supabase.from(t.key).select('*', { count: 'exact', head: true })
      counts[t.key] = count || 0
    }
    setTableCounts(counts)
    setLoading(false)
  }

  async function handleBackup() {
    setBackupLoading(true)
    try {
      const res = await fetch('/api/backup')
      if (!res.ok) throw new Error('백업 API 오류')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)

      // 이력 저장
      const entry = { date: new Date().toISOString(), rows: Object.values(tableCounts).reduce((s, v) => s + v, 0) }
      const hist = [entry, ...backupHistory].slice(0, 20)
      setBackupHistory(hist)
      setLastBackup(entry.date)
      localStorage.setItem('backup_history', JSON.stringify(hist))

      showToast('백업 파일 다운로드 완료!')
    } catch (err: any) {
      showToast('백업 실패: ' + err.message, 'error')
    }
    setBackupLoading(false)
  }

  function handleRestoreSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setRestoreFile(file)
    setRestoreConfirm(true)
  }

  async function handleRestore() {
    if (!restoreFile) return
    setRestoreLoading(true)
    setRestoreConfirm(false)
    try {
      const text = await restoreFile.text()
      const json = JSON.parse(text)
      if (!json.data) throw new Error('유효하지 않은 백업 파일')

      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || '복원 실패')

      showToast(`복원 완료! 총 ${Object.values(result.results as Record<string, any>).reduce((s: number, r: any) => s + (r.inserted || 0), 0)}건 복원됨`)
      fetchCounts()
    } catch (err: any) {
      showToast('복원 실패: ' + err.message, 'error')
    }
    setRestoreLoading(false)
    setRestoreFile(null)
  }

  async function handleCSVExport(tableKey: string, label: string) {
    const { data } = await supabase.from(tableKey).select('*')
    if (!data || data.length === 0) { showToast('데이터 없음', 'error'); return }
    const headers = Object.keys(data[0])
    const BOM = '\uFEFF'
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const v = String(row[h] ?? '')
        return v.includes(',') || v.includes('\n') || v.includes('"') ? '"' + v.replace(/"/g, '""') + '"' : v
      }).join(','))
    ].join('\n')
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tableKey}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`${label} CSV 다운로드 완료`)
  }

  const totalRows = Object.values(tableCounts).reduce((s, v) => s + v, 0)
  const daysSinceBackup = lastBackup ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000) : null

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Backup & Restore</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>데이터 백업 및 복원 관리</div>
          </div>
        </div>
        <div className="content-area">

          {/* 상단 KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            <div className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>전체 데이터</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-blue)', fontFamily: 'JetBrains Mono, monospace' }}>{loading ? '...' : totalRows.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{TABLES.length}개 테이블</div>
            </div>
            <div className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>마지막 백업</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: daysSinceBackup !== null && daysSinceBackup > 7 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                {lastBackup ? new Date(lastBackup).toLocaleDateString('ko-KR') : '없음'}
              </div>
              <div style={{ fontSize: 10, color: daysSinceBackup !== null && daysSinceBackup > 7 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                {daysSinceBackup !== null ? (daysSinceBackup === 0 ? '오늘' : `${daysSinceBackup}일 전`) : '백업 기록 없음'}
                {daysSinceBackup !== null && daysSinceBackup > 7 && ' ⚠️'}
              </div>
            </div>
            <div className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>백업 이력</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-amber)', fontFamily: 'JetBrains Mono, monospace' }}>{backupHistory.length}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>최근 20건 기록</div>
            </div>
            <div className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>저장소</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-teal)' }}>Supabase</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Free tier</div>
            </div>
          </div>

          {/* 백업/복원 버튼 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="card" style={{ textAlign: 'center', padding: '28px 20px' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>💾</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>전체 백업</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                모든 테이블 데이터를 JSON 파일로 다운로드합니다.<br/>주 1회 이상 백업을 권장합니다.
              </div>
              <button className="btn btn-primary" onClick={handleBackup} disabled={backupLoading} style={{ padding: '10px 28px' }}>
                {backupLoading ? '다운로드 중...' : '📥 지금 백업하기'}
              </button>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '28px 20px' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔄</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>데이터 복원</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                백업 파일(.json)로 데이터를 복원합니다.<br/><span style={{ color: 'var(--accent-red)' }}>⚠️ 기존 데이터가 덮어씌워집니다.</span>
              </div>
              <label className="btn btn-ghost" style={{ padding: '10px 28px', cursor: 'pointer' }}>
                {restoreLoading ? '복원 중...' : '📤 백업 파일 선택'}
                <input type="file" accept=".json" onChange={handleRestoreSelect} style={{ display: 'none' }} disabled={restoreLoading} />
              </label>
            </div>
          </div>

          {/* 테이블별 현황 */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>테이블별 데이터 현황</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>각 테이블을 개별 CSV로 내보낼 수 있습니다</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={fetchCounts}>🔄 새로고침</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ fontSize: 10, padding: '8px 14px', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', textAlign: 'left', background: 'var(--bg-card)' }}>테이블</th>
                    <th style={{ fontSize: 10, padding: '8px 14px', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', textAlign: 'right', background: 'var(--bg-card)' }}>레코드 수</th>
                    <th style={{ fontSize: 10, padding: '8px 14px', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', textAlign: 'center', background: 'var(--bg-card)' }}>CSV</th>
                  </tr>
                </thead>
                <tbody>
                  {TABLES.map(t => (
                    <tr key={t.key}>
                      <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                        <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
                        <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{t.key}</span>
                      </td>
                      <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: (tableCounts[t.key] || 0) > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {loading ? '...' : (tableCounts[t.key] || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleCSVExport(t.key, t.label)} disabled={(tableCounts[t.key] || 0) === 0}>
                          ↓ CSV
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700 }}>합계</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--accent-blue)' }}>
                      {loading ? '...' : totalRows.toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 백업 이력 */}
          {backupHistory.length > 0 && (
            <div className="card" style={{ marginTop: 16, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>백업 이력</div>
              </div>
              <div style={{ padding: '8px 18px' }}>
                {backupHistory.slice(0, 10).map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < Math.min(backupHistory.length, 10) - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontSize: 10, color: 'var(--accent-green)' }}>✓</span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{new Date(h.date).toLocaleString('ko-KR')}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{h.rows?.toLocaleString() || '?'}건</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 가이드 */}
          <div className="card" style={{ marginTop: 16, background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(168,85,247,0.04))' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>💡 백업 가이드</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              <strong style={{ color: 'var(--accent-amber)' }}>주 1회 이상</strong> 전체 백업을 권장합니다. 다운로드된 JSON 파일을 <strong style={{ color: 'var(--accent-blue)' }}>Google Drive, USB, 또는 PC</strong>에 보관하세요.<br/>
              데이터 손실 시 "데이터 복원" 버튼으로 백업 파일을 업로드하면 <strong style={{ color: 'var(--accent-green)' }}>전체 데이터가 복원</strong>됩니다.<br/>
              개별 테이블만 필요하면 우측 "CSV" 버튼으로 엑셀에서 열 수 있는 파일을 받을 수 있습니다.
            </div>
          </div>
        </div>
      </div>

      {/* 복원 확인 모달 */}
      {restoreConfirm && (
        <div className="modal-overlay" onClick={() => { setRestoreConfirm(false); setRestoreFile(null) }}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">⚠️ 데이터 복원 확인</div>
              <button className="modal-close" onClick={() => { setRestoreConfirm(false); setRestoreFile(null) }}>×</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 16 }}>
              <strong style={{ color: 'var(--accent-red)' }}>주의:</strong> 복원하면 현재 데이터가 백업 파일의 데이터로 <strong style={{ color: 'var(--accent-red)' }}>완전히 교체</strong>됩니다.<br/><br/>
              파일: <strong>{restoreFile?.name}</strong><br/>
              크기: <strong>{restoreFile ? (restoreFile.size / 1024).toFixed(1) + 'KB' : ''}</strong><br/><br/>
              복원 전 현재 데이터를 먼저 백업하시는 것을 권장합니다.
            </div>
            <div className="modal-footer" style={{ marginTop: 0, paddingTop: 0, border: 'none' }}>
              <button className="btn btn-ghost" onClick={() => { setRestoreConfirm(false); setRestoreFile(null) }}>취소</button>
              <button className="btn btn-danger" onClick={handleRestore}>복원 실행</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
