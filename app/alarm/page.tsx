'use client'
import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/auth'
import { useToast } from '@/lib/useToast'
import { supabase } from '@/lib/supabase'
import { logAudit, getCurrentUserName } from '@/lib/auditLog'
import Sidebar from '@/components/Sidebar'
import {
  getEquipmentStructure,
  getFlatHolderKeys,
  makeHolderKey,
  parseHolderKey,
} from '@/lib/holderStructure'
import { exportAlarmData } from '@/lib/exportCSV'

export default function AlarmPage() {
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
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  // 입력 폼: holder_category 와 holder_no 분리
  const [form, setForm] = useState<any>({ date: new Date().toISOString().slice(0,10), punch_alarm: 0, weld_alarm: 0, holder_category: '', holder_no: '', note: '' })

  const typeColors: any = { '복합기': 'badge-blue', '융착기': 'badge-green', '펀칭기': 'badge-amber' }

  useEffect(() => {
    supabase.from('equipment').select('no,name,model,type').neq('type','지그').order('no')
      .then(({ data }) => { setEquipment(data || []); setEqLoading(false) })
  }, [])

  async function selectEquipment(eq: any) {
    setSelected(eq); setLoading(true)
    const { data } = await supabase.from('alarm').select('*').eq('equipment_no', eq.no).order('date', { ascending: false })
    setData(data || []); setLoading(false)
  }

  async function reload() {
    if (!selected) return
    const { data } = await supabase.from('alarm').select('*').eq('equipment_no', selected.no).order('date', { ascending: false })
    setData(data || [])
  }

  const { showToast, ToastUI } = useToast()

  function openAdd() {
    setEditItem(null)
    const structure = selected ? getEquipmentStructure(selected.no) : null
    const defaultCategory = structure?.groups[0]?.category || ''
    const defaultHolder = structure?.groups[0]?.holders[0] || ''
    setForm({ date: new Date().toISOString().slice(0,10), punch_alarm: 0, weld_alarm: 0, holder_category: defaultCategory, holder_no: defaultHolder, note: '' })
    setModal(true)
  }

  function openEdit(r: any) {
    setEditItem(r)
    const { category, holderNo } = parseHolderKey(r.holder_no)
    setForm({ date: r.date, punch_alarm: r.punch_alarm, weld_alarm: r.weld_alarm, holder_category: category, holder_no: holderNo, note: r.note||'' })
    setModal(true)
  }

  async function handleSave() {
    // holder_category 와 holder_no 를 합쳐서 저장
    const combinedHolder = form.holder_category && form.holder_no
      ? makeHolderKey(form.holder_category, form.holder_no)
      : (form.holder_no || null)
    const payload = { equipment_no: selected.no, date: form.date, punch_alarm: Number(form.punch_alarm)||0, weld_alarm: Number(form.weld_alarm)||0, holder_no: combinedHolder, note: form.note }
    if (editItem) {
      const { error } = await supabase.from('alarm').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editItem.id)
      if (error) { showToast('수정 실패', 'error'); return }
      showToast('수정되었습니다')
      logAudit(getCurrentUserName(), 'UPDATE', 'alarm', '알람 수정', { targetId: editItem?.id })
    } else {
      const { error } = await supabase.from('alarm').insert([payload])
      if (error) { showToast('등록 실패', 'error'); return }
      showToast('등록되었습니다')
      logAudit(getCurrentUserName(), 'CREATE', 'alarm', '알람 등록')
    }
    setModal(false); reload()
  }

  async function handleDelete(id: number) {
    await supabase.from('alarm').delete().eq('id', id)
    showToast('삭제되었습니다')
      logAudit(getCurrentUserName(), 'DELETE', 'alarm', '알람 삭제'); setDeleteId(null); reload()
  }

  const filtered = data.filter(r => {
    if (dateFrom && r.date < dateFrom) return false
    if (dateTo && r.date > dateTo) return false
    return true
  })

  // 설비별 구조 가져오기
  const structure = selected ? getEquipmentStructure(selected.no) : null

  // 표시할 홀더 키 목록 결정
  // 1. 구조가 정의된 설비: 정의된 순서대로 모든 홀더 표시 (데이터 없어도 "-")
  // 2. 구조가 정의 안 된 설비: 데이터에서 사용된 홀더만 추출 (기존 동작)
  let holderKeys: string[] = []
  if (structure) {
    holderKeys = getFlatHolderKeys(selected.no)
  } else {
    holderKeys = Array.from(new Set(filtered.map(r => r.holder_no).filter(Boolean))).sort((a: any, b: any) => String(a).localeCompare(String(b))) as string[]
  }

  const dates = Array.from(new Set(filtered.map(r => r.date))).sort((a: any, b: any) => b.localeCompare(a)) as any[]
  const hasHolder = holderKeys.length > 1
  const totalPunch = filtered.reduce((s, r) => s + (r.punch_alarm||0), 0)
  const totalWeld = filtered.reduce((s, r) => s + (r.weld_alarm||0), 0)

  // 카테고리별 그룹핑 (헤더 colspan 계산용)
  // 각 holderKey를 파싱해서 같은 카테고리끼리 묶는다
  const categoryGroups: { category: string; holders: { key: string; holderNo: string }[] }[] = []
  if (structure) {
    // 정의된 구조 그대로 사용
    structure.groups.forEach(g => {
      categoryGroups.push({
        category: g.category,
        holders: g.holders.map(h => ({ key: makeHolderKey(g.category, h), holderNo: h })),
      })
    })
  } else if (hasHolder) {
    // 구조 정의 없음 - 데이터에서 카테고리 추출
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

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Alarm</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>설비를 선택하면 알람 데이터가 표시됩니다</div>
          </div>
        </div>
        <div className="content-area" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* 설비 목록 */}
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

          {/* 데이터 영역 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {!selected ? (
              <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>←</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>설비를 선택해주세요</div>
                <div style={{ fontSize: 12 }}>왼쪽 목록에서 설비를 클릭하면 알람 데이터가 표시됩니다</div>
              </div>
            ) : (
              <>
                {/* 설비 헤더 */}
                <div className="card" style={{ marginBottom: 12, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{String(selected.no).padStart(2,'0')}</span>
                    <span className={`badge ${typeColors[selected.type]||'badge-gray'}`}>{selected.type}</span>
                    <span className="badge badge-gray">{selected.model}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{selected.name}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => exportAlarmData(selected.name, filtered)}>↓ Export</button>
                    <button className="btn btn-primary btn-sm" onClick={openAdd}>+ 등록</button>
                  </div>
                </div>

                {/* 요약 카드 + 기간 필터 */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                  <div className="card" style={{ flex: 1, minWidth: 130, padding: '12px 16px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>총 알람</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-amber)' }}>{totalPunch + totalWeld}</div>
                  </div>
                  <div className="card" style={{ flex: 1, minWidth: 130, padding: '12px 16px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>펀칭불량</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-blue)' }}>{totalPunch}</div>
                  </div>
                  <div className="card" style={{ flex: 1, minWidth: 130, padding: '12px 16px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>융착불량</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-red)' }}>{totalWeld}</div>
                  </div>
                  <div className="card" style={{ minWidth: 220, padding: '12px 16px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>기간 설정</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input className="form-input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ fontSize: 11, padding: '4px 6px' }} />
                      <span style={{ fontSize: 11 }}>~</span>
                      <input className="form-input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ fontSize: 11, padding: '4px 6px' }} />
                    </div>
                  </div>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>
                    알람 내역 <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>{filtered.length}건</span>
                  </div>
                  {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>로딩 중...</div>
                  ) : filtered.length === 0 && !structure ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>데이터 없음</div>
                  ) : hasHolder ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          {/* 1행: 카테고리 그룹 헤더 (LH, RH 등) */}
                          <tr>
                            <th className="tbl-th" rowSpan={3}>일자</th>
                            {categoryGroups.map((g, gi) => (
                              <th
                                key={`cat-${gi}`}
                                className="tbl-th" style={{ textAlign: 'center', borderLeft: gi > 0 ? '2px solid var(--border)' : undefined }}
                                colSpan={g.holders.length * 2}
                              >
                                {g.category}
                              </th>
                            ))}
                            <th className="tbl-th" rowSpan={3}>비고</th>
                            <th className="tbl-th" rowSpan={3}>관리</th>
                          </tr>
                          {/* 2행: 홀더 번호 */}
                          <tr>
                            {categoryGroups.flatMap((g, gi) =>
                              g.holders.map((h, hi) => (
                                <th
                                  key={`h-${gi}-${hi}`}
                                  className="tbl-th" style={{ textAlign: 'center', borderLeft: hi === 0 && gi > 0 ? '2px solid var(--border)' : undefined }}
                                  colSpan={2}
                                >
                                  {h.holderNo}
                                </th>
                              ))
                            )}
                          </tr>
                          {/* 3행: 펀칭/융착 구분 */}
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
                          {dates.length === 0 ? (
                            <tr>
                              <td className="tbl-td" style={{ textAlign: 'center', color: 'var(--text-muted)' }} colSpan={categoryGroups.reduce((s, g) => s + g.holders.length * 2, 0) + 3}>
                                데이터 없음
                              </td>
                            </tr>
                          ) : dates.map(date => {
                            const dayRows = filtered.filter(r => r.date === date)
                            const note = dayRows.find(r => r.note && r.note !== '-')?.note || '-'
                            return (
                              <tr key={date}>
                                <td className="tbl-td">{date}</td>
                                {categoryGroups.flatMap((g, gi) =>
                                  g.holders.flatMap((h, hi) => {
                                    const hr = dayRows.find(r => r.holder_no === h.key)
                                    const leftBorder = hi === 0 && gi > 0 ? '2px solid var(--border)' : undefined
                                    return [
                                      <td key={`p-${gi}-${hi}`} className="tbl-td" style={{ textAlign: 'center', borderLeft: leftBorder }}><span className={`badge ${(hr?.punch_alarm||0)>0?'badge-blue':'badge-gray'}`}>{hr?.punch_alarm||0}</span></td>,
                                      <td key={`w-${gi}-${hi}`} className="tbl-td" style={{ textAlign: 'center' }}><span className={`badge ${(hr?.weld_alarm||0)>0?'badge-red':'badge-gray'}`}>{hr?.weld_alarm||0}</span></td>,
                                    ]
                                  })
                                )}
                                <td className="tbl-td">{note}</td>
                                <td className="tbl-td">
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(dayRows[0])}>수정</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(dayRows[0]?.id)}>삭제</button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>{['일자','펀칭불량','융착불량','합계','비고','관리'].map(h => <th key={h} className="tbl-th">{h}</th>)}</tr></thead>
                      <tbody>{filtered.map(r => (
                        <tr key={r.id}>
                          <td className="tbl-td">{r.date}</td>
                          <td className="tbl-td"><span className={`badge ${r.punch_alarm>0?'badge-blue':'badge-gray'}`}>{r.punch_alarm}</span></td>
                          <td className="tbl-td"><span className={`badge ${r.weld_alarm>0?'badge-red':'badge-gray'}`}>{r.weld_alarm}</span></td>
                          <td className="tbl-td"><span className={`badge ${(r.punch_alarm+r.weld_alarm)>0?'badge-amber':'badge-green'}`}>{r.punch_alarm+r.weld_alarm}</span></td>
                          <td className="tbl-td">{r.note||'-'}</td>
                          <td className="tbl-td">
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>수정</button>
                              <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(r.id)}>삭제</button>
                            </div>
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 등록/수정 모달 */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editItem ? '알람 수정' : '알람 등록'}</div>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">일자 *</label>
                <input className="form-input" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              {/* 카테고리 + 홀더 번호 (구조가 정의된 설비는 select, 아니면 free input) */}
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
                  <input className="form-input" type="text" placeholder="예: 1, 2, LH..." value={form.holder_no} onChange={e => setForm({...form, holder_no: e.target.value})} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">펀칭불량 건수</label>
                <input className="form-input" type="number" min="0" value={form.punch_alarm} onChange={e => setForm({...form, punch_alarm: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">융착불량 건수</label>
                <input className="form-input" type="number" min="0" value={form.weld_alarm} onChange={e => setForm({...form, weld_alarm: e.target.value})} />
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

      {/* 삭제 확인 */}
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

      <ToastUI />
    </div>
  )
}
