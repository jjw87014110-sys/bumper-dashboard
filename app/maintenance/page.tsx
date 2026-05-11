'use client'
import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { exportMaintenanceData } from '@/lib/exportCSV'

export default function MaintenancePage() {
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
  const [form, setForm] = useState<any>({ maintenance_date: new Date().toISOString().slice(0,16), shift: '주간', worker: '', alarm_content: '', defect_type: '', action_detail: '', replaced_parts: '', note: '' })

  const typeColors: any = { '복합기': 'badge-blue', '융착기': 'badge-green', '펀칭기': 'badge-amber', '지그': 'badge-gray' }
  const td: React.CSSProperties = { fontSize: 11, padding: '7px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }
  const th: React.CSSProperties = { fontSize: 10, padding: '7px 10px', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', background: 'var(--bg-card)', textAlign: 'left' as const }

  useEffect(() => {
    supabase.from('equipment').select('no,name,model,type').order('no')
      .then(({ data }) => { setEquipment(data || []); setEqLoading(false) })
  }, [])

  async function selectEquipment(eq: any) {
    setSelected(eq); setLoading(true)
    const { data } = await supabase.from('maintenance').select('*').eq('equipment_no', eq.no).order('maintenance_date', { ascending: false })
    setData(data || []); setLoading(false)
  }

  async function reload() {
    if (!selected) return
    const { data } = await supabase.from('maintenance').select('*').eq('equipment_no', selected.no).order('maintenance_date', { ascending: false })
    setData(data || [])
  }

  function showToast(msg: string, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }
  function openAdd() { setEditItem(null); setForm({ maintenance_date: new Date().toISOString().slice(0,16), shift: '주간', worker: '', alarm_content: '', defect_type: '', action_detail: '', replaced_parts: '', note: '' }); setModal(true) }
  function openEdit(r: any) { setEditItem(r); setForm({ maintenance_date: String(r.maintenance_date||'').slice(0,16), shift: r.shift, worker: r.worker, alarm_content: r.alarm_content||'', defect_type: r.defect_type||'', action_detail: r.action_detail||'', replaced_parts: r.replaced_parts||'', note: r.note||'' }); setModal(true) }

  async function handleSave() {
    const payload = { equipment_no: selected.no, ...form }
    if (editItem) {
      const { error } = await supabase.from('maintenance').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editItem.id)
      if (error) { showToast('수정 실패', 'error'); return }
      showToast('수정되었습니다')
    } else {
      const { error } = await supabase.from('maintenance').insert([payload])
      if (error) { showToast('등록 실패', 'error'); return }
      showToast('등록되었습니다')
    }
    setModal(false); reload()
  }

  async function handleDelete(id: number) {
    await supabase.from('maintenance').delete().eq('id', id)
    showToast('삭제되었습니다'); setDeleteId(null); reload()
  }

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Maintenance</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>설비를 선택하면 정비 이력이 표시됩니다</div>
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
                <div style={{ fontSize: 12 }}>왼쪽 목록에서 설비를 클릭하면 정비 이력이 표시됩니다</div>
              </div>
            ) : (
              <>
                <div className="card" style={{ marginBottom: 12, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{String(selected.no).padStart(2,'0')}</span>
                    <span className={`badge ${typeColors[selected.type]||'badge-gray'}`}>{selected.type}</span>
                    <span className="badge badge-gray">{selected.model}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{selected.name}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => exportMaintenanceData(selected.name, data)}>↓ Export</button>
                    <button className="btn btn-primary btn-sm" onClick={openAdd}>+ 등록</button>
                  </div>
                </div>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>
                    정비 이력 <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>{data.length}건</span>
                  </div>
                  {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>로딩 중...</div>
                  ) : data.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>데이터 없음</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr>{['정비일시','주/야','작업자','알람내용','불량유형','조치내역','교체부품','비고','관리'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                        <tbody>{data.map(r => (
                          <tr key={r.id}>
                            <td style={td}>{String(r.maintenance_date||'').slice(0,16)}</td>
                            <td style={td}><span className={`badge ${r.shift==='주간'?'badge-amber':'badge-blue'}`}>{r.shift}</span></td>
                            <td style={td}>{r.worker}</td>
                            <td style={td}>{r.alarm_content||'-'}</td>
                            <td style={td}>{r.defect_type||'-'}</td>
                            <td style={td}>{r.action_detail||'-'}</td>
                            <td style={td}>{r.replaced_parts||'-'}</td>
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
              <div className="modal-title">{editItem ? '정비이력 수정' : '정비이력 등록'}</div>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">정비일시 *</label>
                <input className="form-input" type="datetime-local" value={form.maintenance_date} onChange={e => setForm({...form, maintenance_date: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">주/야</label>
                <select className="form-select" value={form.shift} onChange={e => setForm({...form, shift: e.target.value})}>
                  <option value="주간">주간</option><option value="야간">야간</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">작업자</label>
                <input className="form-input" type="text" value={form.worker} onChange={e => setForm({...form, worker: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">불량유형</label>
                <input className="form-input" type="text" value={form.defect_type} onChange={e => setForm({...form, defect_type: e.target.value})} />
              </div>
              <div className="form-group form-grid-full">
                <label className="form-label">알람내용</label>
                <input className="form-input" type="text" value={form.alarm_content} onChange={e => setForm({...form, alarm_content: e.target.value})} />
              </div>
              <div className="form-group form-grid-full">
                <label className="form-label">조치내역</label>
                <textarea className="form-textarea" value={form.action_detail} onChange={e => setForm({...form, action_detail: e.target.value})} style={{ minHeight: 60 }} />
              </div>
              <div className="form-group">
                <label className="form-label">교체부품</label>
                <input className="form-input" type="text" value={form.replaced_parts} onChange={e => setForm({...form, replaced_parts: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">비고</label>
                <input className="form-input" type="text" value={form.note} onChange={e => setForm({...form, note: e.target.value})} />
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
            <div className="modal-header"><div className="modal-title">삭제 확인</div><button className="modal-close" onClick={() => setDeleteId(null)}>×</button></div>
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
