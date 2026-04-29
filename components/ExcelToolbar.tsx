'use client'
import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

interface ExcelToolbarProps {
  tableName: string
  columns: { key: string; label: string }[]
  data: any[]
  onImportComplete: () => void
  parseRow: (row: any) => any | null
}

export default function ExcelToolbar({ tableName, columns, data, onImportComplete, parseRow }: ExcelToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)

  function showToast(msg: string, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // 엑셀 다운로드
  function handleExport() {
    const exportData = data.map(row => {
      const obj: any = {}
      columns.forEach(col => {
        obj[col.label] = row[col.key] ?? ''
      })
      return obj
    })
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, tableName)

    // 컬럼 너비 자동 조정
    const colWidths = columns.map(col => ({ wch: Math.max(col.label.length * 2, 12) }))
    ws['!cols'] = colWidths

    XLSX.writeFile(wb, `${tableName}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    showToast('엑셀 파일이 다운로드되었습니다')
  }

  // 엑셀 업로드
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)

    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(ws)

      if (rows.length === 0) { showToast('데이터가 없습니다', 'error'); setImporting(false); return }

      const parsed = rows.map(parseRow).filter(Boolean)
      if (parsed.length === 0) { showToast('인식 가능한 데이터가 없습니다', 'error'); setImporting(false); return }

      const { error } = await supabase.from(tableName).insert(parsed)
      if (error) { showToast('업로드 실패: ' + error.message, 'error'); setImporting(false); return }

      showToast(`${parsed.length}건 업로드 완료!`)
      onImportComplete()
    } catch (err) {
      showToast('파일 읽기 실패', 'error')
    }
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  // 엑셀 양식 다운로드
  function handleTemplate() {
    const ws = XLSX.utils.json_to_sheet([
      columns.reduce((acc: any, col) => { acc[col.label] = ''; return acc }, {})
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '입력양식')
    const colWidths = columns.map(col => ({ wch: Math.max(col.label.length * 2, 14) }))
    ws['!cols'] = colWidths
    XLSX.writeFile(wb, `${tableName}_입력양식.xlsx`)
    showToast('입력 양식이 다운로드되었습니다')
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {/* 업로드 */}
        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImport} />
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M6 8V2M3 5l3-3 3 3"/>
            <path d="M1 9v1a1 1 0 001 1h8a1 1 0 001-1V9"/>
          </svg>
          {importing ? '업로드 중...' : '엑셀 업로드'}
        </button>

        {/* 다운로드 */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleExport}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M6 2v6M3 5l3 3 3-3"/>
            <path d="M1 9v1a1 1 0 001 1h8a1 1 0 001-1V9"/>
          </svg>
          엑셀 다운로드
        </button>

        {/* 양식 다운로드 */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleTemplate}
          style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="1" y="1" width="10" height="10" rx="1.5"/>
            <line x1="4" y1="4" x2="8" y2="4"/>
            <line x1="4" y1="6" x2="8" y2="6"/>
            <line x1="4" y1="8" x2="6" y2="8"/>
          </svg>
          양식 다운로드
        </button>
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </>
  )
}
