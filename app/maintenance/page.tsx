'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import ExcelToolbar from '@/components/ExcelToolbar'

const MAINT_COLUMNS = [
  { key: 'maintenance_date', label: '정비일시' },
  { key: 'equipment_no', label: '설비No' },
  { key: 'shift', label: '주/야' },
  { key: 'worker', label: '작업자' },
  { key: 'alarm_content', label: '알람내용' },
  { key: 'defect_type', label: '불량유형' },
  { key: 'action_detail', label: '조치내역' },
  { key: 'pull_force', label: '탈거력' },
  { key: 'appearance', label: '외관굴곡' },
  { key: 'replaced_parts', label: '교체부품' },
  { key: 'note', label: '비고' },
]

function parseMaintRow(row: any) {
  if (!row['설비No'] && !row['작업자']) return null
  return {
    maintenance_date: row['정비일시'] || new Date().toISOString().slice(0,16),
    equipment_no: row['설비No'] ? Number(row['설비No']) : null,
    shift: row['주/야'] || '주간',
    worker: row['작업자'] || '',
    alarm_content: row['알람내용'] || '',
    defect_type: row['불량유형'] || '기타',
    action_detail: row['조치내역'] || '',
    pull_force: row['탈거력'] || '',
    appearance: row['외관굴곡'] || '',
    replaced_parts: row['교체부품'] || '',
    note: row['비고'] || '',
  }
}

const SHIFTS = ['주간','야간']
const DEFECT_TYPES = ['펀칭불량','융착불량','Air불량','기계적결함','기타']

export default function MaintenancePage() {
  const { isLoggedIn } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [equipment, setEquipment] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState<any>({
    equipment_no: '', maintenance_date: new Date().toISOString().slice(0,16),
    shift: '주간', worker: '', alarm_content: '', defect_type: '펀칭불량',
    action_detail: '', pull_force: '', appearance: '', replaced_parts: '', note: ''
  })
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const [deleteId, setDeleteId] = useState<number|null>(null)

  useEffect(() => {
    if (!isLoggedIn) { router.push('/login'); return }
    fetchData()
  }, [isLoggedIn])

  async function fetchData() {
    setLoading(true)
    const [mn, eq] = await Promise.all([
      supabase.from('maintenance').select('*, equipment(no,name,model)').order('maintenance_date', { ascending: false }),
      supabase.from('equipment').select('no, name, model').order('no')
    ])
    setData(mn.data || [])
    setEquipment(eq.data || [])
    setLoading(false)
  }

  function showToast(msg: string, type='success') { setToast({msg,type}); setTimeout(()=>setToast(null),3000) }

  function openAdd() {
    setEditItem(null)
    setForm({ equipment_no:'', maintenance_date:new Date().toISOString().slice(0,16), shift:'주간', worker:'', alarm_content:'', defect_type:'펀칭불량', action_detail:'', pull_force:'', appearance:'', replaced_parts:'', note:'' })
    setModal(true)
  }

  function openEdit(item: any) { setEditItem(item); setForm({...item, maintenance_date: item.maintenance_date?.slice(0,16)||''}); setModal(true) }

  async function handleSave() {
    if (!form.equipment_no || !form.worker) { showToast('필수 항목을 입력해주세요','error'); return }
    if (editItem) {
      const { error } = await supabase.from('maintenance').update({...form, updated_at:new Date().toISOString()}).eq('id',editItem.id)
      if (error) { showToast('수정 실패','error'); return }
      showToast('수정되었습니다')
    } else {
      const { error } = await supabase.from('maintenance').insert([form])
      if (error) { showToast('등록 실패','error'); return }
      showToast('등록되었습니다')
    }
    setModal(false); fetchData()
  }

  async function handleDelete(id: number) {
    await supabase.from('maintenance').delete().eq('id', id)
    showToast('삭제되었습니다'); setDeleteId(null); fetchData()
  }

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize:17, fontWeight:700 }}>정비이력 관리</div>
            <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:2 }}>설비별 정비 및 수리 이력 관리</div>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ 정비이력 등록</button>
        </div>

        <div className="content-area">
          <div className="card">
            <div className="section-header">
              <div className="section-title">정비이력 <span style={{ fontSize:12, fontWeight:400, color:'var(--text-muted)', marginLeft:6 }}>총 {data.length}건</span></div>
              <ExcelToolbar tableName="maintenance" columns={MAINT_COLUMNS} data={data} onImportComplete={fetchData} parseRow={parseMaintRow} />
            </div>
            {loading ? (
              <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)' }}>로딩 중...</div>
            ) : data.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)' }}>
                <div style={{ marginBottom:12 }}>등록된 정비이력이 없습니다</div>
                <button className="btn btn-primary" onClick={openAdd}>+ 첫 번째 이력 등록</button>
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table className="data-table" style={{ minWidth:900 }}>
                  <thead>
                    <tr>
                      <th>정비일시</th><th>설비</th><th>차종</th><th>구분</th><th>작업자</th>
                      <th>알람내용</th><th>불량유형</th><th>조치내역</th><th>탈거력</th><th>외관굴곡</th><th>교체부품</th><th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map(r => (
                      <tr key={r.id}>
                        <td className="mono" style={{ fontSize:10 }}>{r.maintenance_date?.slice(0,16)||'-'}</td>
                        <td><span className="badge badge-gray">#{r.equipment_no}</span></td>
                        <td><span className="badge badge-teal">{r.equipment?.model||'-'}</span></td>
                        <td><span className={`badge ${r.shift==='주간'?'badge-blue':'badge-amber'}`}>{r.shift}</span></td>
                        <td style={{ fontSize:11 }}>{r.worker}</td>
                        <td style={{ fontSize:11, maxWidth:100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.alarm_content||'-'}</td>
                        <td><span className="badge badge-red">{r.defect_type||'-'}</span></td>
                        <td style={{ fontSize:11, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.action_detail||'-'}</td>
                        <td style={{ fontSize:11 }}>{r.pull_force||'-'}</td>
                        <td style={{ fontSize:11 }}>{r.appearance||'-'}</td>
                        <td style={{ fontSize:11, maxWidth:80, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.replaced_parts||'-'}</td>
                        <td>
                          <div style={{ display:'flex', gap:4 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>수정</button>
                            <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(r.id)}>삭제</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth:640 }}>
            <div className="modal-header">
              <div className="modal-title">{editItem?'정비이력 수정':'정비이력 등록'}</div>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">설비 *</label>
                <select className="form-select" value={form.equipment_no} onChange={e => setForm({...form,equipment_no:e.target.value})}>
                  <option value="">선택</option>
                  {equipment.map(eq => <option key={eq.no} value={eq.no}>{eq.no}번 - {eq.name.substring(0,25)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">정비일시</label>
                <input className="form-input" type="datetime-local" value={form.maintenance_date} onChange={e => setForm({...form,maintenance_date:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">구분(주/야)</label>
                <select className="form-select" value={form.shift} onChange={e => setForm({...form,shift:e.target.value})}>
                  {SHIFTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">작업자 *</label>
                <input className="form-input" placeholder="작업자 이름" value={form.worker} onChange={e => setForm({...form,worker:e.target.value})} />
              </div>
              <div className="form-group form-grid-full">
                <label className="form-label">알람 내용</label>
                <input className="form-input" placeholder="발생한 알람 내용" value={form.alarm_content||''} onChange={e => setForm({...form,alarm_content:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">불량 유형</label>
                <select className="form-select" value={form.defect_type} onChange={e => setForm({...form,defect_type:e.target.value})}>
                  {DEFECT_TYPES.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">교체 부품</label>
                <input className="form-input" placeholder="교체한 부품명" value={form.replaced_parts||''} onChange={e => setForm({...form,replaced_parts:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">탈거력</label>
                <input className="form-input" placeholder="예: 양호, 3.2kgf" value={form.pull_force||''} onChange={e => setForm({...form,pull_force:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">외관굴곡</label>
                <input className="form-input" placeholder="예: 양호, 이상" value={form.appearance||''} onChange={e => setForm({...form,appearance:e.target.value})} />
              </div>
              <div className="form-group form-grid-full">
                <label className="form-label">조치 내역</label>
                <textarea className="form-textarea" placeholder="수행한 조치 내용 상세 기입" value={form.action_detail||''} onChange={e => setForm({...form,action_detail:e.target.value})} />
              </div>
              <div className="form-group form-grid-full">
                <label className="form-label">비고</label>
                <textarea className="form-textarea" value={form.note||''} onChange={e => setForm({...form,note:e.target.value})} style={{ minHeight:50 }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleSave}>{editItem?'저장':'등록'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:360 }}>
            <div className="modal-header"><div className="modal-title">삭제 확인</div><button className="modal-close" onClick={()=>setDeleteId(null)}>×</button></div>
            <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:20 }}>이 정비이력을 삭제하시겠습니까?</div>
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
