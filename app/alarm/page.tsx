'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import ExcelToolbar from '@/components/ExcelToolbar'

const ALARM_COLUMNS = [
  { key: 'date', label: '일자' },
  { key: 'equipment_no', label: '설비No' },
  { key: 'punch_alarm', label: '펀칭불량' },
  { key: 'weld_alarm', label: '융착불량' },
  { key: 'note', label: '비고' },
]

function parseAlarmRow(row: any) {
  if (!row['일자'] && !row['설비No']) return null
  return {
    date: row['일자'] ? String(row['일자']).slice(0,10) : new Date().toISOString().slice(0,10),
    equipment_no: row['설비No'] ? Number(row['설비No']) : null,
    punch_alarm: Number(row['펀칭불량']) || 0,
    weld_alarm: Number(row['융착불량']) || 0,
    note: row['비고'] || '',
  }
}

export default function AlarmPage() {
  const { isLoggedIn } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [equipment, setEquipment] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState<any>({ date: new Date().toISOString().slice(0,10), equipment_no: '', punch_alarm: 0, weld_alarm: 0, note: '' })
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const [deleteId, setDeleteId] = useState<number|null>(null)
  const [filterEq, setFilterEq] = useState('전체')

  useEffect(() => {
    if (!isLoggedIn) { router.push('/login'); return }
    fetchData()
  }, [isLoggedIn])

  async function fetchData() {
    setLoading(true)
    const [al, eq] = await Promise.all([
      supabase.from('alarm').select('*, equipment(no,name,model)').order('date', { ascending: false }),
      supabase.from('equipment').select('no, name, model').order('no')
    ])
    setData(al.data || [])
    setEquipment(eq.data || [])
    setLoading(false)
  }

  function showToast(msg: string, type='success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  function openAdd() {
    setEditItem(null)
    setForm({ date: new Date().toISOString().slice(0,10), equipment_no: '', punch_alarm: 0, weld_alarm: 0, note: '' })
    setModal(true)
  }

  function openEdit(item: any) { setEditItem(item); setForm({ ...item, equipment_no: item.equipment_no }); setModal(true) }

  async function handleSave() {
    if (!form.date || !form.equipment_no) { showToast('필수 항목을 입력해주세요', 'error'); return }
    const payload = { ...form, punch_alarm: Number(form.punch_alarm)||0, weld_alarm: Number(form.weld_alarm)||0 }
    if (editItem) {
      const { error } = await supabase.from('alarm').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editItem.id)
      if (error) { showToast('수정 실패', 'error'); return }
      showToast('수정되었습니다')
    } else {
      const { error } = await supabase.from('alarm').insert([payload])
      if (error) { showToast('등록 실패', 'error'); return }
      showToast('등록되었습니다')
    }
    setModal(false); fetchData()
  }

  async function handleDelete(id: number) {
    await supabase.from('alarm').delete().eq('id', id)
    showToast('삭제되었습니다'); setDeleteId(null); fetchData()
  }

  const filtered = filterEq === '전체' ? data : data.filter(d => String(d.equipment_no) === filterEq)
  const totalPunch = filtered.reduce((s, r) => s + (r.punch_alarm||0), 0)
  const totalWeld = filtered.reduce((s, r) => s + (r.weld_alarm||0), 0)

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize:17, fontWeight:700 }}>알람 관리</div>
            <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:2 }}>설비별 펀칭/융착 알람 발생 현황</div>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ 알람 등록</button>
        </div>

        <div className="content-area">
          {/* Summary */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
            <div className="card">
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8 }}>총 알람 건수</div>
              <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:28, fontWeight:700, color:'var(--accent-amber)' }}>{totalPunch+totalWeld}</div>
            </div>
            <div className="card">
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8 }}>펀칭불량</div>
              <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:28, fontWeight:700, color:'var(--accent-blue)' }}>{totalPunch}</div>
            </div>
            <div className="card">
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8 }}>융착불량</div>
              <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:28, fontWeight:700, color:'var(--accent-red)' }}>{totalWeld}</div>
            </div>
          </div>

          {/* Filter by equipment */}
          <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
            <button className={`btn btn-sm ${filterEq==='전체'?'btn-primary':'btn-ghost'}`} onClick={() => setFilterEq('전체')}>전체</button>
            {equipment.slice(0,10).map(eq => (
              <button key={eq.no} className={`btn btn-sm ${filterEq===String(eq.no)?'btn-primary':'btn-ghost'}`} onClick={() => setFilterEq(String(eq.no))}>
                {eq.no}번
              </button>
            ))}
          </div>

          <div className="card">
            <div className="section-header">
              <div className="section-title">알람 내역 <span style={{ fontSize:12, fontWeight:400, color:'var(--text-muted)', marginLeft:6 }}>총 {filtered.length}건</span></div>
              <ExcelToolbar tableName="alarm" columns={ALARM_COLUMNS} data={filtered} onImportComplete={fetchData} parseRow={parseAlarmRow} />
            </div>
            {loading ? (
              <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)' }}>로딩 중...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)' }}>
                <div style={{ marginBottom:12 }}>등록된 데이터가 없습니다</div>
                <button className="btn btn-primary" onClick={openAdd}>+ 첫 번째 알람 등록</button>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>일자</th><th>설비No</th><th>설비명</th><th>차종</th><th>펀칭불량</th><th>융착불량</th><th>합계</th><th>비고</th><th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id}>
                      <td className="mono" style={{ fontSize:11 }}>{r.date}</td>
                      <td><span className="badge badge-gray">#{r.equipment_no}</span></td>
                      <td style={{ fontSize:11, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.equipment?.name || '-'}</td>
                      <td><span className="badge badge-teal">{r.equipment?.model || '-'}</span></td>
                      <td>
                        <span className={`badge ${r.punch_alarm>0?'badge-blue':'badge-gray'}`}>{r.punch_alarm}</span>
                      </td>
                      <td>
                        <span className={`badge ${r.weld_alarm>0?'badge-red':'badge-gray'}`}>{r.weld_alarm}</span>
                      </td>
                      <td>
                        <span className={`badge ${(r.punch_alarm+r.weld_alarm)>0?'badge-amber':'badge-green'}`}>{r.punch_alarm+r.weld_alarm}</span>
                      </td>
                      <td style={{ fontSize:11 }}>{r.note||'-'}</td>
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
            )}
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editItem ? '알람 수정' : '알람 등록'}</div>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">일자 *</label>
                <input className="form-input" type="date" value={form.date} onChange={e => setForm({...form,date:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">설비 *</label>
                <select className="form-select" value={form.equipment_no} onChange={e => setForm({...form,equipment_no:e.target.value})}>
                  <option value="">선택</option>
                  {equipment.map(eq => <option key={eq.no} value={eq.no}>{eq.no}번 ({eq.model})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">펀칭불량 건수</label>
                <input className="form-input" type="number" min="0" value={form.punch_alarm} onChange={e => setForm({...form,punch_alarm:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">융착불량 건수</label>
                <input className="form-input" type="number" min="0" value={form.weld_alarm} onChange={e => setForm({...form,weld_alarm:e.target.value})} />
              </div>
              <div className="form-group form-grid-full">
                <label className="form-label">비고</label>
                <textarea className="form-textarea" value={form.note||''} onChange={e => setForm({...form,note:e.target.value})} style={{ minHeight:60 }} />
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
            <div className="modal-header">
              <div className="modal-title">삭제 확인</div>
              <button className="modal-close" onClick={() => setDeleteId(null)}>×</button>
            </div>
            <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:20 }}>이 항목을 삭제하시겠습니까?</div>
            <div className="modal-footer" style={{ marginTop:0, paddingTop:0, border:'none' }}>
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
