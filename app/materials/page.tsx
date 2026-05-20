'use client'
import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/auth'
import { useToast } from '@/lib/useToast'
import { supabase } from '@/lib/supabase'
import { logAudit, getCurrentUserName } from '@/lib/auditLog'
import Sidebar from '@/components/Sidebar'
import { exportMaterialsData } from '@/lib/exportCSV'

export default function MaterialsPage() {
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
  const [form, setForm] = useState<any>({ item_no: '', item_name: '', spec: '', maker: '', unit: 'EA', quantity: 0, min_quantity: 0, note: '' })

  const typeColors: any = { '복합기': 'badge-blue', '융착기': 'badge-green', '펀칭기': 'badge-amber' }

  useEffect(() => {
    supabase.from('equipment').select('no,name,model,type').neq('type','지그').order('no')
      .then(({ data }) => { setEquipment(data || []); setEqLoading(false) })
  }, [])

  async function selectEquipment(eq: any) {
    setSelected(eq); setLoading(true)
    const { data } = await supabase.from('materials').select('*').eq('equipment_no', eq.no).order('item_no')
    setData(data || []); setLoading(false)
  }

  async function reload() {
    if (!selected) return
    const { data } = await supabase.from('materials').select('*').eq('equipment_no', selected.no).order('item_no')
    setData(data || [])
  }

  const { showToast, ToastUI } = useToast()
  function openAdd() { setEditItem(null); setForm({ item_no: (data.length + 1), item_name: '', spec: '', maker: '', unit: 'EA', quantity: 0, min_quantity: 0, note: '' }); setModal(true) }
  function openEdit(r: any) { setEditItem(r); setForm({ item_no: r.item_no, item_name: r.item_name, spec: r.spec||'', maker: r.maker||'', unit: r.unit, quantity: r.quantity, min_quantity: r.min_quantity||0, note: r.note||'' }); setModal(true) }

  async function handleSave() {
    const payload = { equipment_no: selected.no, item_no: Number(form.item_no), item_name: form.item_name, spec: form.spec, maker: form.maker, unit: form.unit, quantity: Number(form.quantity), min_quantity: Number(form.min_quantity||0), note: form.note }
    if (editItem) {
      const { error } = await supabase.from('materials').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editItem.id)
      if (error) { showToast('수정 실패', 'error'); return }
      showToast('수정되었습니다')
      logAudit(getCurrentUserName(), 'UPDATE', 'materials', '자재 수정', { targetId: editItem?.id })
    } else {
      const { error } = await supabase.from('materials').insert([payload])
      if (error) { showToast('등록 실패', 'error'); return }
      showToast('등록되었습니다')
      logAudit(getCurrentUserName(), 'CREATE', 'materials', '자재 등록')
    }
    setModal(false); reload()
  }

  async function handleDelete(id: number) {
    await supabase.from('materials').delete().eq('id', id)
    showToast('삭제되었습니다')
      logAudit(getCurrentUserName(), 'DELETE', 'materials', '자재 삭제'); setDeleteId(null); reload()
  }

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Materials</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>설비를 선택하면 자재 목록이 표시됩니다</div>
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
                <div style={{ fontSize: 12 }}>왼쪽 목록에서 설비를 클릭하면 자재 목록이 표시됩니다</div>
              </div>
            ) : (
              <>
                <div className="card" style={{ marginBottom: 12, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{String(selected.no).padStart(2,'0')}</span>
                    <span className={`badge ${typeColors[selected.type]||'badge-gray'}`}>{selected.type}</span>
                    <span className="badge badge-gray">{selected.model}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{selected.name}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => exportMaterialsData(selected.name, data)}>↓ Export</button>
                    <button className="btn btn-primary btn-sm" onClick={openAdd}>+ 등록</button>
                  </div>
                </div>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>
                    자재 목록 <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>{data.length}종</span>
                  </div>
                  {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>로딩 중...</div>
                  ) : data.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>데이터 없음</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>{['No','품목명','규격','MAKER','단위','수량','최소','상태','비고','관리'].map(h => <th key={h} className="tbl-th">{h}</th>)}</tr></thead>
                      <tbody>{data.map(r => {
                        const minQ = r.min_quantity || 0
                        const isLow = minQ > 0 && r.quantity <= minQ
                        return (
                        <tr key={r.id} style={isLow ? { background: 'var(--accent-red-dim)' } : {}}>
                          <td className="tbl-td">{r.item_no}</td>
                          <td className="tbl-td">{r.item_name}</td>
                          <td className="tbl-td">{r.spec||'-'}</td>
                          <td className="tbl-td">{r.maker||'-'}</td>
                          <td className="tbl-td">{r.unit}</td>
                          <td className="tbl-td"><span className={`badge ${isLow ? 'badge-red' : 'badge-teal'}`}>{r.quantity}</span></td>
                          <td className="tbl-td" style={{ color: 'var(--text-muted)' }}>{minQ || '-'}</td>
                          <td className="tbl-td">{isLow ? <span className="badge badge-red">⚠ 부족</span> : <span className="badge badge-green">정상</span>}</td>
                          <td className="tbl-td">{r.note||'-'}</td>
                          <td className="tbl-td">
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>수정</button>
                              <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(r.id)}>삭제</button>
                            </div>
                          </td>
                        </tr>
                      )})}</tbody>
                    </table>
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
              <div className="modal-title">{editItem ? '자재 수정' : '자재 등록'}</div>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">No</label>
                <input className="form-input" type="number" value={form.item_no} onChange={e => setForm({...form, item_no: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">단위</label>
                <input className="form-input" type="text" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} />
              </div>
              <div className="form-group form-grid-full">
                <label className="form-label">품목명 *</label>
                <input className="form-input" type="text" value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">규격</label>
                <input className="form-input" type="text" value={form.spec} onChange={e => setForm({...form, spec: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">MAKER</label>
                <input className="form-input" type="text" value={form.maker} onChange={e => setForm({...form, maker: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">수량</label>
                <input className="form-input" type="number" min="0" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">최소 재고 (0=알림 없음)</label>
                <input className="form-input" type="number" min="0" value={form.min_quantity} onChange={e => setForm({...form, min_quantity: e.target.value})} placeholder="이 수량 이하 시 부족 알림" />
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
      <ToastUI />
    </div>
  )
}
