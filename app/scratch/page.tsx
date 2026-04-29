'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

export default function ScratchPage() {
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
  const [form, setForm] = useState<any>({ date: new Date().toISOString().slice(0,10), time_of_day: '오전', model: '', category: '', scratch_location: '', jig_status: '양호', equipment_issue: '해당없음', action: '', note: '' })

  const typeColors: any = { '복합기': 'badge-blue', '융착기': 'badge-green', '펀칭기': 'badge-amber', '지그': 'badge-gray' }
  const td: React.CSSProperties = { fontSize: 11, padding: '7px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }
  const th: React.CSSProperties = { fontSize: 10, padding: '7px 10px', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', background: 'var(--bg-card)', textAlign: 'left' as const }

  useEffect(() => {
    supabase.from('equipment').select('no,name,model,type').neq('type','지그').order('no')
      .then(({ data }) => { setEquipment(data || []); setEqLoading(false) })
  }, [])

  async function selectEquipment(eq: any) {
    setSelected(eq); setLoading(true)
    const { data } = await supabase.from('scratch').select('*').eq('equipment_no', eq.no).order('date', { ascending: false })
    setData(data || []); setLoading(false)
  }

  async function reload() {
    if (!selected) return
    const { data } = await supabase.from('scratch').select('*').eq('equipment_no', selected.no).order('date', { ascending: false })
    setData(data || [])
  }

  function showToast(msg: string, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  function openAdd() {
    setEditItem(null)
    setForm({ date: new Date().toISOString().slice(0,10), time_of_day: '오전', model: selected?.model || '', category: '', scratch_location: '', jig_status: '양호', equipment_issue: '해당없음', action: '', note: '' })
    setModal(true)
  }

  function openEdit(r: any) { setEditItem(r); setForm({ ...r }); setModal(true) }

  async function handleSave() {
    const payload = { ...form, equipment_no: selected.no }
    if (editItem) {
      const { error } = await supabase.from('scratch').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editItem.id)
      if (error) { showToast('수정 실패', 'error'); return }
      showToast('수정되었습니다')
    } else {
      const { error } = await supabase.from('scratch').insert([payload])
      if (error) { showToast('등록 실패', 'error'); return }
      showToast('등록되었습니다')
    }
    setModal(false); reload()
  }

  async function handleDelete(id: number) {
    await supabase.from('scratch').delete().eq('id', id)
    showToast('삭제되었습니다'); setDeleteId(null); reload()
  }

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>찍힘 관리</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>설비를 선택하면 찍힘 데이터가 표시됩니다</div>
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
                <div style={{ fontSize: 12 }}>왼쪽 목록에서 설비를 클릭하면 찍힘 데이터가 표시됩니다</div>
              </div>
            ) : (
              <>
                <div className="card" style={{ marginBottom: 12, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{String(selected.no).padStart(2,'0')}</span>
                    <span className={`badge ${typeColors[selected.type]||'badge-gray'}`}>{selected.type}</span>
                    <span className="badge badge-gray">{selected.model}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{selected.name}</span>
                    <button className="btn btn-primary btn-sm" onClick={openAdd}>+ 등록</button>
                  </div>
                </div>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>
                    찍힘 내역 <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>{data.length}건</span>
                  </div>
                  {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>로딩 중...</div>
                  ) : data.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>데이터 없음</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr>{['일자','오전/오후','차종','구분','찍힘부위','지그상태','설비문제','조치','비고','관리'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                        <tbody>{data.map(r => (
                          <tr key={r.id}>
                            <td style={td}>{r.date}</td>
                            <td style={td}>{r.time_of_day}</td>
                            <td style={td}><span className="badge badge-gray">{r.model}</span></td>
                            <td style={td}>{r.category}</td>
                            <td style={td}>{r.scratch_location}</td>
                            <td style={td}><span className={`badge ${r.jig_status==='양호'?'badge-green':'badge-red'}`}>{r.jig_status}</span></td>
                            <td style={td}><span className={`badge ${r.equipment_issue==='해당없음'?'badge-gray':'badge-amber'}`}>{r.equipment_issue}</span></td>
                            <td style={td}>{r.action||'-'}</td>
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
              <div className="modal-title">{editItem ? '찍힘 수정' : '찍힘 등록'}</div>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">일자 *</label>
                <input className="form-input" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">오전/오후</label>
                <select className="form-select" value={form.time_of_day} onChange={e => setForm({...form, time_of_day: e.target.value})}>
                  <option value="오전">오전</option><option value="오후">오후</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">차종</label>
                <select className="form-select" value={form.model} onChange={e => setForm({...form, model: e.target.value})}>
                  {['OV1','SP2','SP3','NQ5'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">구분</label>
                <input className="form-input" type="text" placeholder="예: FRNT/STD" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">찍힘부위</label>
                <input className="form-input" type="text" value={form.scratch_location} onChange={e => setForm({...form, scratch_location: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">지그상태</label>
                <select className="form-select" value={form.jig_status} onChange={e => setForm({...form, jig_status: e.target.value})}>
                  <option value="양호">양호</option><option value="불량">불량</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">설비문제</label>
                <select className="form-select" value={form.equipment_issue} onChange={e => setForm({...form, equipment_issue: e.target.value})}>
                  <option value="해당없음">해당없음</option><option value="조치필요">조치필요</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">조치내역</label>
                <input className="form-input" type="text" value={form.action||''} onChange={e => setForm({...form, action: e.target.value})} />
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
