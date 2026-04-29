'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import ExcelToolbar from '@/components/ExcelToolbar'

const MAT_COLUMNS = [
  { key: 'equipment_no', label: '설비No' },
  { key: 'item_no', label: '품목No' },
  { key: 'item_name', label: '품목명' },
  { key: 'spec', label: '규격' },
  { key: 'maker', label: 'MAKER' },
  { key: 'unit', label: '단위' },
  { key: 'quantity', label: '수량' },
  { key: 'note', label: '비고' },
]

function parseMatRow(row: any) {
  if (!row['품목명']) return null
  return {
    equipment_no: row['설비No'] ? Number(row['설비No']) : null,
    item_no: Number(row['품목No']) || 1,
    item_name: row['품목명'] || '',
    spec: row['규격'] || '',
    maker: row['MAKER'] || '',
    unit: row['단위'] || 'EA',
    quantity: Number(row['수량']) || 0,
    note: row['비고'] || '',
  }
}

export default function MaterialsPage() {
  const { isLoggedIn } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [equipment, setEquipment] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState<any>({ equipment_no:'', item_no:1, item_name:'', spec:'', maker:'', unit:'EA', quantity:0, note:'' })
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const [deleteId, setDeleteId] = useState<number|null>(null)
  const [filterEq, setFilterEq] = useState('전체')

  useEffect(() => {
    if (!isLoggedIn) { router.push('/login'); return }
    fetchData()
  }, [isLoggedIn])

  async function fetchData() {
    setLoading(true)
    const [mt, eq] = await Promise.all([
      supabase.from('materials').select('*, equipment(no,name,model)').order('equipment_no').order('item_no'),
      supabase.from('equipment').select('no, name, model').order('no')
    ])
    setData(mt.data || [])
    setEquipment(eq.data || [])
    setLoading(false)
  }

  function showToast(msg: string, type='success') { setToast({msg,type}); setTimeout(()=>setToast(null),3000) }

  function openAdd() {
    setEditItem(null)
    setForm({ equipment_no:'', item_no:1, item_name:'', spec:'', maker:'', unit:'EA', quantity:0, note:'' })
    setModal(true)
  }

  function openEdit(item: any) { setEditItem(item); setForm({...item}); setModal(true) }

  async function handleSave() {
    if (!form.equipment_no || !form.item_name) { showToast('필수 항목을 입력해주세요','error'); return }
    const payload = { ...form, item_no:Number(form.item_no)||1, quantity:Number(form.quantity)||0 }
    if (editItem) {
      const { error } = await supabase.from('materials').update({...payload, updated_at:new Date().toISOString()}).eq('id',editItem.id)
      if (error) { showToast('수정 실패','error'); return }
      showToast('수정되었습니다')
    } else {
      const { error } = await supabase.from('materials').insert([payload])
      if (error) { showToast('등록 실패','error'); return }
      showToast('등록되었습니다')
    }
    setModal(false); fetchData()
  }

  async function handleDelete(id: number) {
    await supabase.from('materials').delete().eq('id', id)
    showToast('삭제되었습니다'); setDeleteId(null); fetchData()
  }

  const filtered = filterEq === '전체' ? data : data.filter(d => String(d.equipment_no) === filterEq)

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize:17, fontWeight:700 }}>자재 관리</div>
            <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:2 }}>설비별 소모품 및 부품 자재 현황</div>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ 자재 등록</button>
        </div>

        <div className="content-area">
          {/* Filter */}
          <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
            <button className={`btn btn-sm ${filterEq==='전체'?'btn-primary':'btn-ghost'}`} onClick={()=>setFilterEq('전체')}>전체</button>
            {equipment.slice(0,15).map(eq => (
              <button key={eq.no} className={`btn btn-sm ${filterEq===String(eq.no)?'btn-primary':'btn-ghost'}`} onClick={()=>setFilterEq(String(eq.no))}>
                {eq.no}번
              </button>
            ))}
          </div>

          <div className="card">
            <div className="section-header">
              <div className="section-title">자재 목록 <span style={{ fontSize:12, fontWeight:400, color:'var(--text-muted)', marginLeft:6 }}>총 {filtered.length}건</span></div>
              <ExcelToolbar tableName="materials" columns={MAT_COLUMNS} data={filtered} onImportComplete={fetchData} parseRow={parseMatRow} />
            </div>
            {loading ? (
              <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)' }}>로딩 중...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)' }}>
                <div style={{ marginBottom:12 }}>등록된 자재가 없습니다</div>
                <button className="btn btn-primary" onClick={openAdd}>+ 자재 등록</button>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>NO</th><th>설비</th><th>품목명</th><th>규격</th><th>MAKER</th><th>단위</th><th>수량</th><th>비고</th><th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id}>
                      <td className="mono" style={{ fontSize:11, color:'var(--text-muted)' }}>{r.item_no}</td>
                      <td><span className="badge badge-gray">#{r.equipment_no}</span></td>
                      <td style={{ fontSize:12, fontWeight:500, color:'var(--text-primary)' }}>{r.item_name}</td>
                      <td style={{ fontSize:11 }}>{r.spec||'-'}</td>
                      <td style={{ fontSize:11 }}>{r.maker||'-'}</td>
                      <td><span className="badge badge-teal">{r.unit}</span></td>
                      <td>
                        <span className={`badge ${r.quantity===0?'badge-red':r.quantity<3?'badge-amber':'badge-green'}`}>{r.quantity}</span>
                      </td>
                      <td style={{ fontSize:11 }}>{r.note||'-'}</td>
                      <td>
                        <div style={{ display:'flex', gap:4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(r)}>수정</button>
                          <button className="btn btn-danger btn-sm" onClick={()=>setDeleteId(r.id)}>삭제</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editItem?'자재 수정':'자재 등록'}</div>
              <button className="modal-close" onClick={()=>setModal(false)}>×</button>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">설비 *</label>
                <select className="form-select" value={form.equipment_no} onChange={e=>setForm({...form,equipment_no:e.target.value})}>
                  <option value="">선택</option>
                  {equipment.map(eq=><option key={eq.no} value={eq.no}>{eq.no}번 ({eq.model})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">품목 번호</label>
                <input className="form-input" type="number" min="1" value={form.item_no} onChange={e=>setForm({...form,item_no:e.target.value})} />
              </div>
              <div className="form-group form-grid-full">
                <label className="form-label">품목명 *</label>
                <input className="form-input" placeholder="예: ABS 다이, 융착혼, 펀칭혼" value={form.item_name} onChange={e=>setForm({...form,item_name:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">규격</label>
                <input className="form-input" placeholder="예: #5(35KHz), M8*25" value={form.spec||''} onChange={e=>setForm({...form,spec:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">MAKER</label>
                <input className="form-input" placeholder="예: 부영ENG, 대원SD" value={form.maker||''} onChange={e=>setForm({...form,maker:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">단위</label>
                <select className="form-select" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>
                  <option>EA</option><option>SET</option><option>BOX</option><option>M</option><option>KG</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">수량</label>
                <input className="form-input" type="number" min="0" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} />
              </div>
              <div className="form-group form-grid-full">
                <label className="form-label">비고</label>
                <textarea className="form-textarea" value={form.note||''} onChange={e=>setForm({...form,note:e.target.value})} style={{ minHeight:50 }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleSave}>{editItem?'저장':'등록'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:360 }}>
            <div className="modal-header"><div className="modal-title">삭제 확인</div><button className="modal-close" onClick={()=>setDeleteId(null)}>×</button></div>
            <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:20 }}>이 자재를 삭제하시겠습니까?</div>
            <div className="modal-footer" style={{ marginTop:0, paddingTop:0, border:'none' }}>
              <button className="btn btn-ghost" onClick={()=>setDeleteId(null)}>취소</button>
              <button className="btn btn-danger" onClick={()=>handleDelete(deleteId)}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
