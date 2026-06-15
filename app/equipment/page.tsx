'use client'
import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/auth'
import { useToast } from '@/lib/useToast'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import {
  getEquipmentStructure,
  makeHolderKey,
  parseHolderKey,
} from '@/lib/holderStructure'

const TABS_ALL = ['알람', '찍힘', '아이마킹', '정비이력', '자재']
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

function TabTable({ tab, rows, equipmentNo }: { tab: string; rows: any[]; equipmentNo: number }) {

  if (rows.length === 0)
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>데이터 없음</div>

  // 설비별 구조
  const structure = getEquipmentStructure(equipmentNo)

  // 카테고리 그룹 생성 (알람/조건표 공통)
  function buildCategoryGroups(holderKeys: string[]) {
    const groups: { category: string; holders: { key: string; holderNo: string }[] }[] = []
    if (structure) {
      structure.groups.forEach(g => {
        groups.push({
          category: g.category,
          holders: g.holders.map(h => ({ key: makeHolderKey(g.category, h), holderNo: h })),
        })
      })
    } else {
      const grouped: Record<string, { key: string; holderNo: string }[]> = {}
      holderKeys.forEach(k => {
        const { category, holderNo } = parseHolderKey(k)
        if (!grouped[category]) grouped[category] = []
        grouped[category].push({ key: k, holderNo })
      })
      Object.entries(grouped).forEach(([category, holders]) => {
        groups.push({ category, holders })
      })
    }
    return groups
  }

  if (tab === '알람') {
    let holderKeys: string[]
    if (structure) {
      holderKeys = structure.groups.flatMap(g => g.holders.map(h => makeHolderKey(g.category, h)))
    } else {
      holderKeys = Array.from(new Set(rows.map((r: any) => r.holder_no).filter(Boolean))).sort((a: any, b: any) => String(a).localeCompare(String(b))) as string[]
    }
    const dates = Array.from(new Set(rows.map((r: any) => r.date))).sort((a: any, b: any) => b.localeCompare(a))
    const hasHolder = holderKeys.length > 1
    const categoryGroups = buildCategoryGroups(holderKeys)

    if (hasHolder) {
      return (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="tbl-th" rowSpan={3}>일자</th>
                {categoryGroups.map((g, gi) => (
                  <th key={`cat-${gi}`} className="tbl-th" style={{ textAlign: 'center', borderLeft: gi > 0 ? '2px solid var(--border)' : undefined }} colSpan={g.holders.length * 2}>
                    {g.category}
                  </th>
                ))}
                <th className="tbl-th" rowSpan={3}>비고</th>
              </tr>
              <tr>
                {categoryGroups.flatMap((g, gi) =>
                  g.holders.map((h, hi) => (
                    <th key={`h-${gi}-${hi}`} className="tbl-th" style={{ textAlign: 'center', borderLeft: hi === 0 && gi > 0 ? '2px solid var(--border)' : undefined }} colSpan={2}>
                      {h.holderNo}
                    </th>
                  ))
                )}
              </tr>
              <tr>
                {categoryGroups.flatMap((g, gi) =>
                  g.holders.flatMap((h, hi) => [
                    <th key={`p-${gi}-${hi}`} className="tbl-th" style={{ color: 'var(--accent-blue)', textAlign: 'center', borderLeft: hi === 0 && gi > 0 ? '2px solid var(--border)' : undefined }}>펀칭</th>,
                    <th key={`w-${gi}-${hi}`} className="tbl-th" style={{ color: 'var(--accent-red)', textAlign: 'center' }}>융착</th>,
                  ])
                )}
              </tr>
            </thead>
            <tbody>
              {dates.map((date: any) => {
                const dayRows = rows.filter((r: any) => r.date === date)
                const note = dayRows.find((r: any) => r.note && r.note !== '-')?.note || '-'
                return (
                  <tr key={date}>
                    <td className="tbl-td">{date}</td>
                    {categoryGroups.flatMap((g, gi) =>
                      g.holders.flatMap((h, hi) => {
                        const hr = dayRows.find((r: any) => r.holder_no === h.key)
                        const leftBorder = hi === 0 && gi > 0 ? '2px solid var(--border)' : undefined
                        return [
                          <td key={`p-${gi}-${hi}`} className="tbl-td" style={{ textAlign: 'center', borderLeft: leftBorder }}>
                            <span className={`badge ${(hr?.punch_alarm || 0) > 0 ? 'badge-blue' : 'badge-gray'}`}>{hr?.punch_alarm || 0}</span>
                          </td>,
                          <td key={`w-${gi}-${hi}`} className="tbl-td" style={{ textAlign: 'center' }}>
                            <span className={`badge ${(hr?.weld_alarm || 0) > 0 ? 'badge-red' : 'badge-gray'}`}>{hr?.weld_alarm || 0}</span>
                          </td>,
                        ]
                      })
                    )}
                    <td className="tbl-td">{note}</td>
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
        <thead><tr>{['일자', '펀칭불량', '융착불량', '합계', '비고'].map(h => <th key={h} className="tbl-th">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r: any, i: number) => (
          <tr key={i}>
            <td className="tbl-td">{r.date}</td>
            <td className="tbl-td"><span className={`badge ${r.punch_alarm > 0 ? 'badge-blue' : 'badge-gray'}`}>{r.punch_alarm}</span></td>
            <td className="tbl-td"><span className={`badge ${r.weld_alarm > 0 ? 'badge-red' : 'badge-gray'}`}>{r.weld_alarm}</span></td>
            <td className="tbl-td"><span className={`badge ${(r.punch_alarm + r.weld_alarm) > 0 ? 'badge-amber' : 'badge-green'}`}>{r.punch_alarm + r.weld_alarm}</span></td>
            <td className="tbl-td">{r.note || '-'}</td>
          </tr>
        ))}</tbody>
      </table>
    )
  }

  if (tab === '조건표') {
    let holderKeys: string[]
    if (structure) {
      holderKeys = structure.groups.flatMap(g => g.holders.map(h => makeHolderKey(g.category, h)))
    } else {
      holderKeys = Array.from(new Set(rows.map((r: any) => r.holder_no).filter(Boolean))).sort((a: any, b: any) => String(a).localeCompare(String(b))) as string[]
    }
    const hasHolder = holderKeys.length > 1
    const categoryGroups = buildCategoryGroups(holderKeys)

    if (hasHolder) {
      type RowKey = string
      const rowKeys: RowKey[] = []
      const rowKeySet = new Set<RowKey>()
      rows.forEach((r: any) => {
        const key = `${r.change_date}__${r.category}__${r.mode}__${r.unit}`
        if (!rowKeySet.has(key)) { rowKeySet.add(key); rowKeys.push(key) }
      })

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
                <th className="tbl-th" rowSpan={2}>변경일자</th>
                <th className="tbl-th" rowSpan={2}>구분</th>
                <th className="tbl-th" rowSpan={2}>모드</th>
                <th className="tbl-th" rowSpan={2}>단위</th>
                {categoryGroups.map((g, gi) => (
                  <th key={`cat-${gi}`} className="tbl-th" style={{ textAlign: 'center', borderLeft: gi > 0 ? '2px solid var(--border)' : undefined }} colSpan={g.holders.length}>
                    {g.category}
                  </th>
                ))}
                <th className="tbl-th" rowSpan={2}>비고</th>
              </tr>
              <tr>
                {categoryGroups.flatMap((g, gi) =>
                  g.holders.map((h, hi) => (
                    <th key={`h-${gi}-${hi}`} className="tbl-th" style={{ textAlign: 'center', borderLeft: hi === 0 && gi > 0 ? '2px solid var(--border)' : undefined }}>
                      {h.holderNo}
                    </th>
                  ))
                )}
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
                      <td className="tbl-td" style={{ fontWeight: 600, color: 'var(--text-primary)', verticalAlign: 'top' }} rowSpan={dateRowCount[date]}>
                        {date?.slice(0, 10)}
                      </td>
                    )}
                    <td className="tbl-td">{category}</td>
                    <td className="tbl-td">{mode}</td>
                    <td className="tbl-td">{unit}</td>
                    {categoryGroups.flatMap((g, gi) =>
                      g.holders.map((h, hi) => {
                        const hr = keyRows.find((r: any) => r.holder_no === h.key)
                        return (
                          <td key={`v-${gi}-${hi}`} className="tbl-td" style={{ textAlign: 'center', borderLeft: hi === 0 && gi > 0 ? '2px solid var(--border)' : undefined }}>
                            {hr ? <span className="badge badge-blue">{hr.value}</span> : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                          </td>
                        )
                      })
                    )}
                    <td className="tbl-td">{keyRows.find((r: any) => r.note)?.note || '-'}</td>
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
        <thead><tr>{['변경일자', '구분', '모드', '단위', '값', '비고'].map(h => <th key={h} className="tbl-th">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r: any, i: number) => (
          <tr key={i}>
            <td className="tbl-td">{(r.change_date || '').slice(0, 10)}</td>
            <td className="tbl-td">{r.category}</td>
            <td className="tbl-td">{r.mode}</td>
            <td className="tbl-td">{r.unit}</td>
            <td className="tbl-td"><span className="badge badge-blue">{r.value}</span></td>
            <td className="tbl-td">{r.note || '-'}</td>
          </tr>
        ))}</tbody>
      </table>
    )
  }

  if (tab === '찍힘') return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>{['일자', '오전/오후', '차종', '구분', '찍힘부위', '지그상태', '설비문제', '조치', '비고'].map(h => <th key={h} className="tbl-th">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r: any, i: number) => (
        <tr key={i}>
          <td className="tbl-td">{r.date}</td>
          <td className="tbl-td">{r.time_of_day}</td>
          <td className="tbl-td"><span className="badge badge-gray">{r.model}</span></td>
          <td className="tbl-td">{r.category}</td>
          <td className="tbl-td">{r.scratch_location}</td>
          <td className="tbl-td"><span className={`badge ${r.jig_status === '양호' ? 'badge-green' : 'badge-red'}`}>{r.jig_status}</span></td>
          <td className="tbl-td"><span className={`badge ${r.equipment_issue === '해당없음' ? 'badge-gray' : 'badge-amber'}`}>{r.equipment_issue}</span></td>
          <td className="tbl-td">{r.action || '-'}</td>
          <td className="tbl-td">{r.note || '-'}</td>
        </tr>
      ))}</tbody>
    </table>
  )

  if (tab === '아이마킹') return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>{['변경일자', '구분', '모드', '단위', '값', '비고'].map(h => <th key={h} className="tbl-th">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r: any, i: number) => (
        <tr key={i}>
          <td className="tbl-td">{(r.change_date || '').slice(0, 10)}</td>
          <td className="tbl-td">{r.category}</td>
          <td className="tbl-td">{r.mode}</td>
          <td className="tbl-td">{r.unit}</td>
          <td className="tbl-td"><span className="badge badge-blue">{r.value}</span></td>
          <td className="tbl-td">{r.note || '-'}</td>
        </tr>
      ))}</tbody>
    </table>
  )

  if (tab === '정비이력') return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>{['정비일시', '주/야', '작업자', '알람내용', '불량유형', '조치내역', '교체부품', '비고'].map(h => <th key={h} className="tbl-th">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r: any, i: number) => (
        <tr key={i}>
          <td className="tbl-td">{String(r.maintenance_date || '').slice(0, 16)}</td>
          <td className="tbl-td"><span className={`badge ${r.shift === '주간' ? 'badge-amber' : 'badge-blue'}`}>{r.shift}</span></td>
          <td className="tbl-td">{r.worker}</td>
          <td className="tbl-td">{r.alarm_content || '-'}</td>
          <td className="tbl-td">{r.defect_type || '-'}</td>
          <td className="tbl-td">{r.action_detail || '-'}</td>
          <td className="tbl-td">{r.replaced_parts || '-'}</td>
          <td className="tbl-td">{r.note || '-'}</td>
        </tr>
      ))}</tbody>
    </table>
  )

  if (tab === '자재') return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>{['No', '품목명', '규격', 'MAKER', '단위', '수량', '비고'].map(h => <th key={h} className="tbl-th">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r: any, i: number) => (
        <tr key={i}>
          <td className="tbl-td">{r.item_no}</td>
          <td className="tbl-td">{r.item_name}</td>
          <td className="tbl-td">{r.spec || '-'}</td>
          <td className="tbl-td">{r.maker || '-'}</td>
          <td className="tbl-td">{r.unit}</td>
          <td className="tbl-td"><span className="badge badge-teal">{r.quantity}</span></td>
          <td className="tbl-td">{r.note || '-'}</td>
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
  const [summary, setSummary] = useState<{ alarm: number; scratch: number; maintenance: number; lastMaint: string } | null>(null)

  const isJig = r.type === '지그'
  const isSP2 = r.model === 'SP2'
  const tabs = isJig ? TABS_JIG : TABS_ALL

  async function handleOpen() {
    if (open) { setOpen(false); return }
    const firstTab = isJig ? '정비이력' : '알람'
    setOpen(true)
    setActiveTab(firstTab)
    setTabLoading(true)

    // 요약 카드용 데이터 병렬 로드
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
    const [alarmRows, scratchRows, maintRows] = await Promise.all([
      supabase.from('alarm').select('punch_alarm, weld_alarm').eq('equipment_no', r.no).gte('date', monthStart),
      supabase.from('scratch').select('id').eq('equipment_no', r.no).gte('date', monthStart),
      supabase.from('maintenance').select('maintenance_date').eq('equipment_no', r.no).order('maintenance_date', { ascending: false }).limit(1),
    ])
    const totalAlarm = (alarmRows.data || []).reduce((s: number, row: any) => s + (row.punch_alarm||0) + (row.weld_alarm||0), 0)
    const lastMaint = maintRows.data?.[0]?.maintenance_date ? String(maintRows.data[0].maintenance_date).slice(0, 10) : '-'
    setSummary({ alarm: totalAlarm, scratch: (scratchRows.data || []).length, maintenance: (maintRows.data || []).length, lastMaint })

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

              {/* 요약 카드 */}
              {summary && (
                <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginRight: 4 }}>이번 달</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'var(--accent-amber-dim)', borderRadius: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--accent-amber)' }}>알람</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-amber)' }}>{summary.alarm}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'var(--accent-blue-dim)', borderRadius: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--accent-blue)' }}>찍힘</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-blue)' }}>{summary.scratch}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'var(--accent-teal-dim, var(--bg-hover))', borderRadius: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--accent-teal)' }}>최근 정비</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-teal)' }}>{summary.lastMaint}</span>
                  </div>
                </div>
              )}
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
                  : <TabTable tab={activeTab} rows={tabData} equipmentNo={r.no} />}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function EquipmentPage() {
  useRequireAuth()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ rr: '전체', type: '전체', model: '전체' })
  const [modal, setModal] = useState(false)
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const [form, setForm] = useState<any>({ no: '', type: '복합기', rr_frt: 'RR', model: 'OV1', location: '', name: '', vendor: '', maintenance_cycle_days: 30 })

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data: eq } = await supabase.from('equipment').select('*').order('no')
    setData(eq || [])
    setLoading(false)
  }

  const { showToast, ToastUI } = useToast()

  function openAdd() {
    const maxNo = data.length > 0 ? Math.max(...data.map(d => d.no)) + 1 : 1
    setForm({ no: maxNo, type: '복합기', rr_frt: 'RR', model: 'OV1', location: '조립1라인', name: '', vendor: '', maintenance_cycle_days: 30 })
    setModal(true)
  }

  async function handleSave() {
    if (!form.no || !form.name) { showToast('설비번호와 설비명은 필수입니다', 'error'); return }
    const payload = { ...form, no: Number(form.no), maintenance_cycle_days: Number(form.maintenance_cycle_days||30) }
    const { error } = await supabase.from('equipment').insert([payload])
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
              <div className="form-group">
                <label className="form-label">정비 주기 (일)</label>
                <input className="form-input" type="number" min="1" placeholder="기본 30일" value={form.maintenance_cycle_days||30} onChange={e => setForm({...form, maintenance_cycle_days: e.target.value})} />
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 6 }}>
              💡 복합기·융착기·펀칭기로 추가하면 알람, 찍힘, 정비이력 등 모든 관리 페이지에 자동으로 반영됩니다.
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleSave}>등록</button>
            </div>
          </div>
        </div>
      )}

      <ToastUI />
    </div>
  )
}
