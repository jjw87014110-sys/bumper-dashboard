'use client'
import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { logAudit, getCurrentUserName } from '@/lib/auditLog'
import Sidebar from '@/components/Sidebar'
import {
  getEquipmentStructure,
  getFlatHolderKeys,
  makeHolderKey,
  parseHolderKey,
} from '@/lib/holderStructure'
import { exportConditionData } from '@/lib/exportCSV'

export default function ConditionPage() {
  useRequireAuth()
  const [equipment, setEquipment] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [eqLoading, setEqLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<number|null>(null)
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const [form, setForm] = useState<any>({ change_date: new Date().toISOString().slice(0,10), category: '펀칭', mode: '', unit: '', value: '', holder_category: '', holder_no: '', note: '' })

  const typeColors: any = { '복합기': 'badge-blue', '융착기': 'badge-green', '펀칭기': 'badge-amber' }
  const td: React.CSSProperties = { fontSize: 11, padding: '7px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }
  const th: React.CSSProperties = { fontSize: 10, padding: '7px 10px', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', background: 'var(--bg-card)', textAlign: 'left' as const }

  useEffect(() => {
    supabase.from('equipment').select('no,name,model,type').neq('type','지그').order('no')
      .then(({ data }) => { setEquipment(data || []); setEqLoading(false) })
  }, [])

  async function selectEquipment(eq: any) {
    setSelected(eq); setLoading(true)
    const { data } = await supabase.from('condition_table').select('*').eq('equipment_no', eq.no).order('change_date', { ascending: false })
    setData(data || []); setLoading(false)
  }

  async function reload() {
    if (!selected) return
    const { data } = await supabase.from('condition_table').select('*').eq('equipment_no', selected.no).order('change_date', { ascending: false })
    setData(data || [])
  }

  function showToast(msg: string, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  function openAdd() {
    setEditItem(null)
    const structure = selected ? getEquipmentStructure(selected.no) : null
    const defaultCategory = structure?.groups[0]?.category || ''
    const defaultHolder = structure?.groups[0]?.holders[0] || ''
    setForm({ change_date: new Date().toISOString().slice(0,10), category: '펀칭', mode: '', unit: '', value: '', holder_category: defaultCategory, holder_no: defaultHolder, note: '' })
    setModal(true)
  }

  function openEdit(r: any) {
    setEditItem(r)
    const { category, holderNo } = parseHolderKey(r.holder_no)
    setForm({ change_date: r.change_date, category: r.category, mode: r.mode, unit: r.unit, value: r.value, holder_category: category, holder_no: holderNo, note: r.note||'' })
    setModal(true)
  }

  async function handleSave() {
    const combinedHolder = form.holder_category && form.holder_no
      ? makeHolderKey(form.holder_category, form.holder_no)
      : (form.holder_no || null)
    const payload = { equipment_no: selected.no, change_date: form.change_date, category: form.category, mode: form.mode, unit: form.unit, value: Number(form.value), holder_no: combinedHolder, note: form.note }
    if (editItem) {
      const { error } = await supabase.from('condition_table').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editItem.id)
      if (error) { showToast('수정 실패', 'error'); return }
      showToast('수정되었습니다')
      logAudit(getCurrentUserName(), 'UPDATE', 'condition_table', '조건표 수정', { targetId: editItem?.id })
    } else {
      const { error } = await supabase.from('condition_table').insert([payload])
      if (error) { showToast('등록 실패', 'error'); return }
      showToast('등록되었습니다')
      logAudit(getCurrentUserName(), 'CREATE', 'condition_table', '조건표 등록')
    }
    setModal(false); reload()
  }

  async function handleDelete(id: number) {
    await supabase.from('condition_table').delete().eq('id', id)
    showToast('삭제되었습니다')
      logAudit(getCurrentUserName(), 'DELETE', 'condition_table', '조건표 삭제'); setDeleteId(null); reload()
  }

  // 설비별 구조 가져오기
  const structure = selected ? getEquipmentStructure(selected.no) : null

  // 표시할 홀더 키 목록
  let holderKeys: string[] = []
  if (structure) {
    holderKeys = getFlatHolderKeys(selected.no)
  } else {
    holderKeys = Array.from(new Set(data.map(r => r.holder_no).filter(Boolean))).sort((a: any, b: any) => String(a).localeCompare(String(b))) as string[]
  }
  const hasHolder = holderKeys.length > 1

  // 카테고리별 그룹핑
  const categoryGroups: { category: string; holders: { key: string; holderNo: string }[] }[] = []
  if (structure) {
    structure.groups.forEach(g => {
      categoryGroups.push({
        category: g.category,
        holders: g.holders.map(h => ({ key: makeHolderKey(g.category, h), holderNo: h })),
      })
    })
  } else if (hasHolder) {
    const grouped: Record<string, { key: string; holderNo: string }[]> = {}
    holderKeys.forEach(k => {
      const { category, holderNo } = parseHolderKey(k)
      if (!grouped[category]) grouped[category] = []
      grouped[category].push({ key: k, holderNo })
    })
    Object.entries(grouped).forEach(([category, holders]) => {
      categoryGroups.push({ category, holders })
    })
  }

  type RK = string
  const rowKeys: RK[] = []
  const rowKeySet = new Set<RK>()
  data.forEach(r => {
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
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Condition</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>설비를 선택하면 조건 데이터가 표시됩니다</div>
          </div>
        </div>
        <div className="content-area" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ width: 220, flexShrink: 0 }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>설비 목록</div>
              {eqLoading ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>로딩 중...</div> : (
                <div style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
                  {equipment.map(eq => (
                    <div key={eq.no} onClick={() => selectEquipment(eq)}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: selected?.no === eq.no ? 'var(--accent-blue-dim)' : 'transparent', borderLeft: `3px solid ${selected?.no === eq.no ? 'var(--accent-blue)' : 'transparent'}`, transition: 'all 0.15s' }}
                      onMouseEnter={e => { if (selected?.no !== eq.no) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                      onMouseLeave={e => { if (selected?.no !== eq.no) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>#{String(eq.no).padStart(2,'0')}</span>
                        <span className={`badge ${typeColors[eq.type]||'badge-gray'}`} style={{ fontSize: 9 }}>{eq.type}</span>
                        <span className="badge badge-gray" style={{ fontSize: 9 }}>{eq.model}</span>
                      </div>
                      <div style={{ fontSize: 11, color: selected?.no === eq.no ? 'var(--accent-blue)' : 'var(--text-primary)', lineHeight: 1.4, fontWeight: selected?.no === eq.no ? 600 : 400 }}>{eq.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {!selected ? (
              <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>←</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>설비를 선택해주세요</div>
                <div style={{ fontSize: 12 }}>왼쪽 목록에서 설비를 클릭하면 조건표가 표시됩니다</div>
              </div>
            ) : (
              <>
                <div className="card" style={{ marginBottom: 12, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{String(selected.no).padStart(2,'0')}</span>
                    <span className={`badge ${typeColors[selected.type]||'badge-gray'}`}>{selected.type}</span>
                    <span className="badge badge-gray">{selected.model}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{selected.name}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => exportConditionData(selected.name, data)}>↓ Export</button>
                    <button className="btn btn-primary btn-sm" onClick={openAdd}>+ 등록</button>
                  </div>
                </div>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>
                    조건표 <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>{data.length}건</span>
                  </div>
                  {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>로딩 중...</div>
                  ) : data.length === 0 && !structure ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>데이터 없음</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          {hasHolder && categoryGroups.length > 0 ? (
                            <>
                              {/* 1행: 카테고리 그룹 헤더 */}
                              <tr>
                                <th style={th} rowSpan={2}>변경일자</th>
                                <th style={th} rowSpan={2}>구분</th>
                                <th style={th} rowSpan={2}>모드</th>
                                <th style={th} rowSpan={2}>단위</th>
                                {categoryGroups.map((g, gi) => (
                                  <th
                                    key={`cat-${gi}`}
                                    style={{ ...th, textAlign: 'center', borderLeft: gi > 0 ? '2px solid var(--border)' : undefined }}
                                    colSpan={g.holders.length}
                                  >
                                    {g.category}
                                  </th>
                                ))}
                                <th style={th} rowSpan={2}>비고</th>
                                <th style={th} rowSpan={2}>관리</th>
                              </tr>
                              {/* 2행: 홀더 번호 */}
                              <tr>
                                {categoryGroups.flatMap((g, gi) =>
                                  g.holders.map((h, hi) => (
                                    <th
                                      key={`h-${gi}-${hi}`}
                                      style={{ ...th, textAlign: 'center', borderLeft: hi === 0 && gi > 0 ? '2px solid var(--border)' : undefined }}
                                    >
                                      {h.holderNo}
                                    </th>
                                  ))
                                )}
                              </tr>
                            </>
                          ) : (
                            <tr>
                              <th style={th}>변경일자</th>
                              <th style={th}>구분</th>
                              <th style={th}>모드</th>
                              <th style={th}>단위</th>
                              <th style={th}>값</th>
                              <th style={th}>비고</th>
                              <th style={th}>관리</th>
                            </tr>
                          )}
                        </thead>
                        <tbody>
                          {rowKeys.length === 0 ? (
                            <tr>
                              <td style={{ ...td, textAlign: 'center', color: 'var(--text-muted)' }} colSpan={hasHolder ? categoryGroups.reduce((s, g) => s + g.holders.length, 0) + 6 : 7}>
                                데이터 없음
                              </td>
                            </tr>
                          ) : rowKeys.map(key => {
                            const [date, category, mode, unit] = key.split('__')
                            const keyRows = data.filter(r => r.change_date === date && r.category === category && r.mode === mode && r.unit === unit)
                            const showDate = !dateRendered.has(date)
                            if (showDate) dateRendered.add(date)
                            return (
                              <tr key={key}>
                                {showDate && (
                                  <td style={{ ...td, fontWeight: 600, color: 'var(--text-primary)', verticalAlign: 'top' }} rowSpan={dateRowCount[date]}>
                                    {date?.slice(0,10)}
                                  </td>
                                )}
                                <td style={td}>{category}</td>
                                <td style={td}>{mode}</td>
                                <td style={td}>{unit}</td>
                                {hasHolder
                                  ? categoryGroups.flatMap((g, gi) =>
                                      g.holders.map((h, hi) => {
                                        const hr = keyRows.find(r => r.holder_no === h.key)
                                        return (
                                          <td
                                            key={`v-${gi}-${hi}`}
                                            style={{ ...td, textAlign: 'center', borderLeft: hi === 0 && gi > 0 ? '2px solid var(--border)' : undefined }}
                                          >
                                            {hr ? <span className="badge badge-blue">{hr.value}</span> : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                                          </td>
                                        )
                                      })
                                    )
                                  : <td style={td}><span className="badge badge-blue">{keyRows[0]?.value}</span></td>
                                }
                                <td style={td}>{keyRows.find(r => r.note)?.note || '-'}</td>
                                <td style={td}>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(keyRows[0])}>수정</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(keyRows[0]?.id)}>삭제</button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editItem ? '조건 수정' : '조건 등록'}</div>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">변경일자 *</label>
                <input className="form-input" type="date" value={form.change_date} onChange={e => setForm({...form, change_date: e.target.value})} />
              </div>
              {/* 카테고리 + 홀더 번호 */}
              {structure ? (
                <>
                  <div className="form-group">
                    <label className="form-label">카테고리</label>
                    <select className="form-select" value={form.holder_category} onChange={e => {
                      const newCat = e.target.value
                      const newGroup = structure.groups.find(g => g.category === newCat)
                      setForm({...form, holder_category: newCat, holder_no: newGroup?.holders[0] || ''})
                    }}>
                      {structure.groups.map(g => <option key={g.category} value={g.category}>{g.category}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">홀더 번호</label>
                    <select className="form-select" value={form.holder_no} onChange={e => setForm({...form, holder_no: e.target.value})}>
                      {structure.groups.find(g => g.category === form.holder_category)?.holders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label className="form-label">홀더 번호</label>
                  <input className="form-input" type="text" placeholder="예: 1, LH, 1-1..." value={form.holder_no} onChange={e => setForm({...form, holder_no: e.target.value})} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">구분</label>
                <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  {['펀칭','융착','Air'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">모드</label>
                <input className="form-input" type="text" placeholder="예: Time, Energy..." value={form.mode} onChange={e => setForm({...form, mode: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">단위</label>
                <input className="form-input" type="text" placeholder="예: AMP[%], [sec]..." value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">값</label>
                <input className="form-input" type="number" value={form.value} onChange={e => setForm({...form, value: e.target.value})} />
              </div>
              <div className="form-group form-grid-full">
                <label className="form-label">비고</label>
                <textarea className="form-textarea" value={form.note||''} onChange={e => setForm({...form, note: e.target.value})} style={{ minHeight: 60 }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleSave}>{editItem ? '저장' : '등록'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 360 }}>
            <div className="modal-header">
              <div className="modal-title">삭제 확인</div>
              <button className="modal-close" onClick={() => setDeleteId(null)}>×</button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>이 항목을 삭제하시겠습니까?</div>
            <div className="modal-footer" style={{ marginTop: 0, paddingTop: 0, border: 'none' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>취소</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
