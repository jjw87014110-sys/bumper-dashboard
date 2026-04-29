'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

const TABS_ALL = ['알람', '찍힘', '아이마킹', '조건표', '정비이력', '자재']
const TABS_JIG = ['정비이력']

async function loadTab(tab: string, no: number) {
  switch (tab) {
    case '알람':
      return (await supabase.from('alarm').select('*').eq('equipment_no', no).order('date', { ascending: false })).data || []
    case '찍힘':
      return (await supabase.from('scratch').select('*').eq('equipment_no', no).order('date', { ascending: false })).data || []
    case '아이마킹':
      return (await supabase.from('imarking').select('*').eq('equipment_no', no).order('change_date', { ascending: false })).data || []
    case '조건표':
      return (await supabase.from('condition_table').select('*').eq('equipment_no', no).order('change_date', { ascending: false })).data || []
    case '정비이력':
      return (await supabase.from('maintenance').select('*').eq('equipment_no', no).order('maintenance_date', { ascending: false })).data || []
    case '자재':
      return (await supabase.from('materials').select('*').eq('equipment_no', no).order('item_no')).data || []
    default: return []
  }
}

function TabTable({ tab, rows }: { tab: string; rows: any[] }) {
  const td: React.CSSProperties = { fontSize: 11, padding: '7px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }
  const th: React.CSSProperties = { fontSize: 10, padding: '7px 10px', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', background: 'var(--bg-card)', textAlign: 'left' }

  if (rows.length === 0)
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>데이터 없음</div>

  if (tab === '알람') {
    const holders = Array.from(new Set(rows.map((r: any) => r.holder_no).filter(Boolean))).sort((a: any, b: any) => String(a).localeCompare(String(b)))
    const dates = Array.from(new Set(rows.map((r: any) => r.date))).sort((a: any, b: any) => b.localeCompare(a))
    const hasHolder = holders.length > 1

    if (hasHolder) {
      return (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th} rowSpan={2}>일자</th>
                {holders.map((h: any) => (
                  <th key={h} style={{ ...th, textAlign: 'center' }} colSpan={2}>홀더 {h}</th>
                ))}
                <th style={th} rowSpan={2}>비고</th>
              </tr>
              <tr>
                {holders.map((h: any) => (
                  <>
                    <th key={h + 'p'} style={{ ...th, color: 'var(--accent-blue)', textAlign: 'center' }}>펀칭</th>
                    <th key={h + 'w'} style={{ ...th, color: 'var(--accent-red)', textAlign: 'center' }}>융착</th>
                  </>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map((date: any) => {
                const dayRows = rows.filter((r: any) => r.date === date)
                const note = dayRows.find((r: any) => r.note && r.note !== '-')?.note || '-'
                return (
                  <tr key={date}>
                    <td style={td}>{date}</td>
                    {holders.map((h: any) => {
                      const hr = dayRows.find((r: any) => r.holder_no === h)
                      return (
                        <>
                          <td key={h + 'p'} style={{ ...td, textAlign: 'center' }}>
                            <span className={`badge ${(hr?.punch_alarm || 0) > 0 ? 'badge-blue' : 'badge-gray'}`}>{hr?.punch_alarm || 0}</span>
                          </td>
                          <td key={h + 'w'} style={{ ...td, textAlign: 'center' }}>
                            <span className={`badge ${(hr?.weld_alarm || 0) > 0 ? 'badge-red' : 'badge-gray'}`}>{hr?.weld_alarm || 0}</span>
                          </td>
                        </>
                      )
                    })}
                    <td style={td}>{note}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
    }

    return (
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{['일자', '펀칭불량', '융착불량', '합계', '비고'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r: any, i: number) => (
          <tr key={i}>
            <td style={td}>{r.date}</td>
            <td style={td}><span className={`badge ${r.punch_alarm > 0 ? 'badge-blue' : 'badge-gray'}`}>{r.punch_alarm}</span></td>
            <td style={td}><span className={`badge ${r.weld_alarm > 0 ? 'badge-red' : 'badge-gray'}`}>{r.weld_alarm}</span></td>
            <td style={td}><span className={`badge ${(r.punch_alarm + r.weld_alarm) > 0 ? 'badge-amber' : 'badge-green'}`}>{r.punch_alarm + r.weld_alarm}</span></td>
            <td style={td}>{r.note || '-'}</td>
          </tr>
        ))}</tbody>
      </table>
    )
  }

  if (tab === '조건표') {
    const holders = Array.from(new Set(rows.map((r: any) => r.holder_no).filter(Boolean))).sort((a: any, b: any) => String(a).localeCompare(String(b)))
    const dates = Array.from(new Set(rows.map((r: any) => r.change_date))).sort((a: any, b: any) => b.localeCompare(a))
    const hasHolder = holders.length > 1

    if (hasHolder) {
      type RowKey = string
      const rowKeys: RowKey[] = []
      const rowKeySet = new Set<RowKey>()
      rows.forEach((r: any) => {
        const key = `${r.change_date}__${r.category}__${r.mode}__${r.unit}`
        if (!rowKeySet.has(key)) { rowKeySet.add(key); rowKeys.push(key) }
      })

      // 날짜별 rowspan 계산
      const dateRowCount: Record<string, number> = {}
      rowKeys.forEach(key => {
        const date = key.split('__')[0]
        dateRowCount[date] = (dateRowCount[date] || 0) + 1
      })
      const dateRendered = new Set<string>()

      return (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>변경일자</th>
                <th style={th}>구분</th>
                <th style={th}>모드</th>
                <th style={th}>단위</th>
                {holders.map((h: any) => (
                  <th key={h} style={{ ...th, textAlign: 'center' }}>홀더 {h}</th>
                ))}
                <th style={th}>비고</th>
              </tr>
            </thead>
            <tbody>
              {rowKeys.map((key) => {
                const [date, category, mode, unit] = key.split('__')
                const keyRows = rows.filter((r: any) =>
                  r.change_date === date && r.category === category && r.mode === mode && r.unit === unit
                )
                const showDate = !dateRendered.has(date)
                if (showDate) dateRendered.add(date)
                return (
                  <tr key={key}>
                    {showDate && (
                      <td style={{ ...td, fontWeight: 600, color: 'var(--text-primary)', verticalAlign: 'top' }} rowSpan={dateRowCount[date]}>
                        {date?.slice(0, 10)}
                      </td>
                    )}
                    <td style={td}>{category}</td>
                    <td style={td}>{mode}</td>
                    <td style={td}>{unit}</td>
                    {holders.map((h: any) => {
                      const hr = keyRows.find((r: any) => r.holder_no === h)
                      return (
                        <td key={h} style={{ ...td, textAlign: 'center' }}>
                          {hr ? <span className="badge badge-blue">{hr.value}</span> : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                        </td>
                      )
                    })}
                    <td style={td}>{keyRows.find((r: any) => r.note)?.note || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
    }

    return (
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{['변경일자', '구분', '모드', '단위', '값', '비고'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r: any, i: number) => (
          <tr key={i}>
            <td style={td}>{(r.change_date || '').slice(0, 10)}</td>
            <td style={td}>{r.category}</td>
            <td style={td}>{r.mode}</td>
            <td style={td}>{r.unit}</td>
            <td style={td}><span className="badge badge-blue">{r.value}</span></td>
            <td style={td}>{r.note || '-'}</td>
          </tr>
        ))}</tbody>
      </table>
    )
  }

  if (tab === '찍힘') return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>{['일자', '오전/오후', '차종', '구분', '찍힘부위', '지그상태', '설비문제', '조치', '비고'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r: any, i: number) => (
        <tr key={i}>
          <td style={td}>{r.date}</td>
          <td style={td}>{r.time_of_day}</td>
          <td style={td}><span className="badge badge-gray">{r.model}</span></td>
          <td style={td}>{r.category}</td>
          <td style={td}>{r.scratch_location}</td>
          <td style={td}><span className={`badge ${r.jig_status === '양호' ? 'badge-green' : 'badge-red'}`}>{r.jig_status}</span></td>
          <td style={td}><span className={`badge ${r.equipment_issue === '해당없음' ? 'badge-gray' : 'badge-amber'}`}>{r.equipment_issue}</span></td>
          <td style={td}>{r.action || '-'}</td>
          <td style={td}>{r.note || '-'}</td>
        </tr>
      ))}</tbody>
    </table>
  )

  if (tab === '아이마킹') return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>{['변경일자', '구분', '모드', '단위', '값', '비고'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r: any, i: number) => (
        <tr key={i}>
          <td style={td}>{(r.change_date || '').slice(0, 10)}</td>
          <td style={td}>{r.category}</td>
          <td style={td}>{r.mode}</td>
          <td style={td}>{r.unit}</td>
          <td style={td}><span className="badge badge-blue">{r.value}</span></td>
          <td style={td}>{r.note || '-'}</td>
        </tr>
      ))}</tbody>
    </table>
  )

  if (tab === '정비이력') return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>{['정비일시', '주/야', '작업자', '알람내용', '불량유형', '조치내역', '교체부품', '비고'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r: any, i: number) => (
        <tr key={i}>
          <td style={td}>{String(r.maintenance_date || '').slice(0, 16)}</td>
          <td style={td}><span className={`badge ${r.shift === '주간' ? 'badge-amber' : 'badge-blue'}`}>{r.shift}</span></td>
          <td style={td}>{r.worker}</td>
          <td style={td}>{r.alarm_content || '-'}</td>
          <td style={td}>{r.defect_type || '-'}</td>
          <td style={td}>{r.action_detail || '-'}</td>
          <td style={td}>{r.replaced_parts || '-'}</td>
          <td style={td}>{r.note || '-'}</td>
        </tr>
      ))}</tbody>
    </table>
  )

  if (tab === '자재') return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>{['No', '품목명', '규격', 'MAKER', '단위', '수량', '비고'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r: any, i: number) => (
        <tr key={i}>
          <td style={td}>{r.item_no}</td>
          <td style={td}>{r.item_name}</td>
          <td style={td}>{r.spec || '-'}</td>
          <td style={td}>{r.maker || '-'}</td>
          <td style={td}>{r.unit}</td>
          <td style={td}><span className="badge badge-teal">{r.quantity}</span></td>
          <td style={td}>{r.note || '-'}</td>
        </tr>
      ))}</tbody>
    </table>
  )

  return null
}

function EquipmentRow({ r, typeColors, rrColors }: { r: any; typeColors: any; rrColors: any }) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('')
  const [tabData, setTabData] = useState<any[]>([])
  const [tabLoading, setTabLoading] = useState(false)

  const isJig = r.type === '지그'
  const isSP2 = r.model === 'SP2'
  const tabs = isJig ? TABS_JIG : TABS_ALL

  async function handleOpen() {
    if (open) { setOpen(false); return }
    const firstTab = isJig ? '정비이력' : '알람'
    setOpen(true)
    setActiveTab(firstTab)
    setTabLoading(true)
    const rows = await loadTab(firstTab, r.no)
    setTabData(rows)
    setTabLoading(false)
  }

  async function handleTab(tab: string) {
    setActiveTab(tab)
    setTabLoading(true)
    const rows = await loadTab(tab, r.no)
    setTabData(rows)
    setTabLoading(false)
  }

  return (
    <>
      <tr
        onClick={handleOpen}
        style={{ cursor: 'pointer', opacity: isSP2 ? 0.6 : 1, background: open ? 'var(--accent-blue-dim)' : undefined, transition: 'background 0.15s' }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.background = '' }}
      >
        <td className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 12px' }}>{String(r.no).padStart(2, '0')}</td>
        <td style={{ padding: '10px 12px' }}><span className={`badge ${typeColors[r.type] || 'badge-gray'}`}>{r.type}</span></td>
        <td style={{ padding: '10px 12px' }}><span className={`badge ${rrColors[r.rr_frt] || 'badge-gray'}`}>{r.rr_frt}</span></td>
        <td style={{ padding: '10px 12px' }}>
          <span className="badge badge-gray">{r.model}</span>
          {isSP2 && <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 4 }}>단산</span>}
        </td>
        <td style={{ fontSize: 11, padding: '10px 12px', color: 'var(--text-muted)' }}>{r.location}</td>
        <td style={{ fontSize: 11, padding: '10px 12px', color: 'var(--text-primary)', maxWidth: 320 }}>{r.name}</td>
        <td style={{ fontSize: 11, padding: '10px 12px', color: 'var(--text-muted)' }}>{r.vendor}</td>
        <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, color: open ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
          {open ? '▲' : '▼'}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={8} style={{ padding: 0, background: 'var(--bg-secondary)' }}>
            <div style={{ borderTop: '2px solid var(--accent-blue)' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                {tabs.map(tab => (
                  <button key={tab} onClick={e => { e.stopPropagation(); handleTab(tab) }}
                    style={{
                      padding: '10px 18px', fontSize: 12,
                      fontWeight: activeTab === tab ? 600 : 400,
                      color: activeTab === tab ? 'var(--accent-blue)' : 'var(--text-muted)',
                      borderBottom: activeTab === tab ? '2px solid var(--accent-blue)' : '2px solid transparent',
                      background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: -1,
                    }}>{tab}</button>
                ))}
                {isSP2 && <div style={{ marginLeft: 'auto', padding: '10px 16px', fontSize: 11, color: 'var(--text-muted)' }}>※ SP2 단산 — 이력 조회만 가능</div>}
              </div>
              <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto' }}>
                {tabLoading
                  ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>로딩 중...</div>
                  : <TabTable tab={activeTab} rows={tabData} />}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function EquipmentPage() {
  useAuth()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ rr: '전체', type: '전체', model: '전체' })
  const [modal, setModal] = useState(false)
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const [form, setForm] = useState<any>({ no: '', type: '복합기', rr_frt: 'RR', model: 'OV1', location: '', name: '', vendor: '' })

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data: eq } = await supabase.from('equipment').select('*').order('no')
    setData(eq || [])
    setLoading(false)
  }

  function showToast(msg: string, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  function openAdd() {
    const maxNo = data.length > 0 ? Math.max(...data.map(d => d.no)) + 1 : 1
    setForm({ no: maxNo, type: '복합기', rr_frt: 'RR', model: 'OV1', location: '조립1라인', name: '', vendor: '' })
    setModal(true)
  }

  async function handleSave() {
    if (!form.no || !form.name) { showToast('설비번호와 설비명은 필수입니다', 'error'); return }
    const { error } = await supabase.from('equipment').insert([{ ...form, no: Number(form.no) }])
    if (error) { showToast('등록 실패: ' + error.message, 'error'); return }
    showToast('설비가 등록되었습니다')
    setModal(false)
    fetchData()
  }

  const typeColors: any = { '복합기': 'badge-blue', '융착기': 'badge-green', '펀칭기': 'badge-amber', '지그': 'badge-gray' }
  const rrColors: any = { 'RR': 'badge-teal', 'FRT': 'badge-blue' }

  const filtered = data.filter(d => {
    if (filter.rr !== '전체' && d.rr_frt !== filter.rr) return false
    if (filter.type !== '전체' && d.type !== filter.type) return false
    if (filter.model !== '전체' && d.model !== filter.model) return false
    return true
  })

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Equipment</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              후가공설비 전체 목록 ({data.length}대) — 행 클릭 시 상세 데이터 펼쳐짐
            </div>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ 설비 추가</button>
        </div>
        <div className="content-area">
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: '28px' }}>구분:</span>
              {['전체', 'RR', 'FRT'].map(v => <button key={v} className={`btn btn-sm ${filter.rr === v ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter({ ...filter, rr: v })}>{v}</button>)}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: '28px' }}>설비:</span>
              {['전체', '복합기', '융착기', '펀칭기', '지그'].map(v => <button key={v} className={`btn btn-sm ${filter.type === v ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter({ ...filter, type: v })}>{v}</button>)}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: '28px' }}>차종:</span>
              {['전체', 'OV1', 'SP2', 'SP3', 'NQ5'].map(v => <button key={v} className={`btn btn-sm ${filter.model === v ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter({ ...filter, model: v })}>{v}</button>)}
            </div>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="section-header" style={{ padding: '14px 16px' }}>
              <div className="section-title">설비 목록 <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>{filtered.length}대</span></div>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>로딩 중...</div>
            ) : (
              <table className="data-table" style={{ marginBottom: 0 }}>
                <thead>
                  <tr><th>NO</th><th>설비</th><th>구분</th><th>차종</th><th>라인</th><th>설비명</th><th>업체</th><th></th></tr>
                </thead>
                <tbody>
                  {filtered.map(r => <EquipmentRow key={r.no} r={r} typeColors={typeColors} rrColors={rrColors} />)}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">설비 추가</div>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">설비 번호 *</label>
                <input className="form-input" type="number" value={form.no} onChange={e => setForm({...form, no: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">구분 (RR/FRT)</label>
                <select className="form-select" value={form.rr_frt} onChange={e => setForm({...form, rr_frt: e.target.value})}>
                  <option value="RR">RR</option>
                  <option value="FRT">FRT</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">설비 유형</label>
                <select className="form-select" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                  {['복합기','융착기','펀칭기','지그'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">차종</label>
                <select className="form-select" value={form.model} onChange={e => setForm({...form, model: e.target.value})}>
                  {['OV1','SP2','SP3','NQ5'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="form-group form-grid-full">
                <label className="form-label">설비명 *</label>
                <input className="form-input" type="text" placeholder="설비명 입력" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">위치 (라인)</label>
                <input className="form-input" type="text" placeholder="예: 조립1라인" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">업체</label>
                <input className="form-input" type="text" placeholder="예: 부영ENG" value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} />
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 6 }}>
              💡 복합기·융착기·펀칭기로 추가하면 알람, 찍힘, 조건표 등 모든 관리 페이지에 자동으로 반영됩니다.
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleSave}>등록</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
