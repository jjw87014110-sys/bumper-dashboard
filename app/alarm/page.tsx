'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

export default function AlarmPage() {
  useAuth()
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
  const [form, setForm] = useState<any>({ date: new Date().toISOString().slice(0,10), punch_alarm: 0, weld_alarm: 0, holder_no: '', note: '' })

  const typeColors: any = { '복합기': 'badge-blue', '융착기': 'badge-green', '펀칭기': 'badge-amber' }
  const td: React.CSSProperties = { fontSize: 11, padding: '7px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }
  const th: React.CSSProperties = { fontSize: 10, padding: '7px 10px', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', background: 'var(--bg-card)', textAlign: 'left' as const }

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

  function showToast(msg: string, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  function openAdd() {
    setEditItem(null)
    setForm({ date: new Date().toISOString().slice(0,10), punch_alarm: 0, weld_alarm: 0, holder_no: '', note: '' })
    setModal(true)
  }

  function openEdit(r: any) { setEditItem(r); setForm({ date: r.date, punch_alarm: r.punch_alarm, weld_alarm: r.weld_alarm, holder_no: r.holder_no||'', note: r.note||'' }); setModal(true) }

  async function handleSave() {
    const payload = { equipment_no: selected.no, date: form.date, punch_alarm: Number(form.punch_alarm)||0, weld_alarm: Number(form.weld_alarm)||0, holder_no: form.holder_no||null, note: form.note }
    if (editItem) {
      const { error } = await supabase.from('alarm').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editItem.id)
      if (error) { showToast('수정 실패', 'error'); return }
      showToast('수정되었습니다')
    } else {
      const { error } = await supabase.from('alarm').insert([payload])
      if (error) { showToast('등록 실패', 'error'); return }
      showToast('등록되었습니다')
    }
    setModal(false); reload()
  }

  async function handleDelete(id: number) {
    await supabase.from('alarm').delete().eq('id', id)
    showToast('삭제되었습니다'); setDeleteId(null); reload()
  }

  const filtered = data.filter(r => {
    if (dateFrom && r.date < dateFrom) return false
    if (dateTo && r.date > dateTo) return false
    return true
  })

  const holders = Array.from(new Set(filtered.map(r => r.holder_no).filter(Boolean))).sort((a: any, b: any) => String(a).localeCompare(String(b))) as any[]
  const dates = Array.from(new Set(filtered.map(r => r.date))).sort((a: any, b: any) => b.localeCompare(a)) as any[]
  const hasHolder = holders.length > 1
  const totalPunch = filtered.reduce((s, r) => s + (r.punch_alarm||0), 0)
  const totalWeld = filtered.reduce((s, r) => s + (r.weld_alarm||0), 0)

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
                    <button className="btn btn-primary btn-sm" onClick={openAdd}>+ 등록</button>
                  </div>
                </div>

                {/* 요약 + 기간 필터 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr) auto', gap: 12, marginBottom: 12, alignItems: 'stretch' }}>
                  {[
                    { label: '총 알람', value: totalPunch + totalWeld, color: 'var(--accent-amber)' },
                    { label: '펀칭불량', value: totalPunch, color: 'var(--accent-blue)' },
                    { label: '융착불량', value: totalWeld, color: 'var(--accent-red)' },
                  ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{s.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
                    </div>
                  ))}
                  <div className="card" style={{ padding: '12px 14px', minWidth: 220 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>기간 설정</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="date" className="form-input" style={{ padding: '4px 8px', fontSize: 11 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>~</span>
                      <input type="date" className="form-input" style={{ padding: '4px 8px', fontSize: 11 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
                      {(dateFrom || dateTo) && <button className="btn btn-ghost btn-sm" onClick={() => { setDateFrom(''); setDateTo('') }}>초기화</button>}
                    </div>
                  </div>
                </div>

                {/* 테이블 */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>
                    알람 내역 <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>{filtered.length}건</span>
                  </div>
                  {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>로딩 중...</div>
                  ) : filtered.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>데이터 없음</div>
                  ) : hasHolder ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={th} rowSpan={2}>일자</th>
                            {holders.map(h => <th key={h} style={{ ...th, textAlign: 'center' }} colSpan={2}>홀더 {h}</th>)}
                            <th style={th} rowSpan={2}>비고</th>
                            <th style={th} rowSpan={2}>관리</th>
                          </tr>
                          <tr>
                            {holders.map(h => <>
                              <th key={h+'p'} style={{ ...th, color: 'var(--accent-blue)', textAlign: 'center' }}>펀칭</th>
                              <th key={h+'w'} style={{ ...th, color: 'var(--accent-red)', textAlign: 'center' }}>융착</th>
                            </>)}
                          </tr>
                        </thead>
                        <tbody>
                          {dates.map(date => {
                            const dayRows = filtered.filter(r => r.date === date)
                            const note = dayRows.find(r => r.note && r.note !== '-')?.note || '-'
                            return (
                              <tr key={date}>
                                <td style={td}>{date}</td>
                                {holders.map(h => {
                                  const hr = dayRows.find(r => r.holder_no === h)
                                  return <>
                                    <td key={h+'p'} style={{ ...td, textAlign: 'center' }}><span className={`badge ${(hr?.punch_alarm||0)>0?'badge-blue':'badge-gray'}`}>{hr?.punch_alarm||0}</span></td>
                                    <td key={h+'w'} style={{ ...td, textAlign: 'center' }}><span className={`badge ${(hr?.weld_alarm||0)>0?'badge-red':'badge-gray'}`}>{hr?.weld_alarm||0}</span></td>
                                  </>
                                })}
                                <td style={td}>{note}</td>
                                <td style={td}>
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
                      <thead><tr>{['일자','펀칭불량','융착불량','합계','비고','관리'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                      <tbody>{filtered.map(r => (
                        <tr key={r.id}>
                          <td style={td}>{r.date}</td>
                          <td style={td}><span className={`badge ${r.punch_alarm>0?'badge-blue':'badge-gray'}`}>{r.punch_alarm}</span></td>
                          <td style={td}><span className={`badge ${r.weld_alarm>0?'badge-red':'badge-gray'}`}>{r.weld_alarm}</span></td>
                          <td style={td}><span className={`badge ${(r.punch_alarm+r.weld_alarm)>0?'badge-amber':'badge-green'}`}>{r.punch_alarm+r.weld_alarm}</span></td>
                          <td style={td}>{r.note||'-'}</td>
                          <td style={td}>
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
              <div className="form-group">
                <label className="form-label">홀더 번호</label>
                <input className="form-input" type="text" placeholder="예: 1, 2, LH..." value={form.holder_no} onChange={e => setForm({...form, holder_no: e.target.value})} />
              </div>
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

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
