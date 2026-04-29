'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import ExcelToolbar from '@/components/ExcelToolbar'

const SCRATCH_COLUMNS = [
  { key: 'date', label: '일자' },
  { key: 'time_of_day', label: '오전/오후' },
  { key: 'model', label: '차종' },
  { key: 'category', label: '구분' },
  { key: 'scratch_location', label: '찍힘부위' },
  { key: 'equipment_no', label: '설비No' },
  { key: 'jig_status', label: '지그상태' },
  { key: 'equipment_issue', label: '설비문제' },
  { key: 'action', label: '조치' },
  { key: 'note', label: '비고' },
]

function parseScratchRow(row: any) {
  if (!row['일자'] && !row['찍힘부위']) return null
  return {
    date: row['일자'] ? String(row['일자']).slice(0, 10) : new Date().toISOString().slice(0, 10),
    time_of_day: row['오전/오후'] || '오전',
    model: row['차종'] || 'SP3',
    category: row['구분'] || 'FRNT / STD',
    scratch_location: row['찍힘부위'] || '',
    equipment_no: row['설비No'] ? Number(row['설비No']) : null,
    jig_status: row['지그상태'] || '양호',
    equipment_issue: row['설비문제'] || '해당없음',
    action: row['조치'] || '해당없음',
    note: row['비고'] || '',
  }
}

const MODELS = ['SP3','OV1','NQ5','SP2']
const CATEGORIES = ['FRNT / STD','FRNT / GTL','RR / STD','RR / GTL','FRNT / PDW']
const JIG_STATUS = ['양호','불량','점검필요']
const EQ_ISSUE = ['해당없음','조치필요','조치완료']
const ACTION = ['해당없음','조치내역','조치완료']

export default function ScratchPage() {
  const { isLoggedIn } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [equipment, setEquipment] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState<any>({
    date: new Date().toISOString().slice(0,10),
    time_of_day: '오전', model: 'SP3', category: 'FRNT / STD',
    scratch_location: '', equipment_no: '',
    jig_status: '양호', equipment_issue: '해당없음', action: '해당없음', note: ''
  })
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const [deleteId, setDeleteId] = useState<number|null>(null)
  const [filterModel, setFilterModel] = useState('전체')

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('bumper_auth')) { router.push('/login'); return }
    fetchData()
  }, [isLoggedIn])

  async function fetchData() {
    setLoading(true)
    const [sc, eq] = await Promise.all([
      supabase.from('scratch').select('*').order('date', { ascending: false }),
      supabase.from('equipment').select('no, name, model').order('no')
    ])
    setData(sc.data || [])
    setEquipment(eq.data || [])
    setLoading(false)
  }

  function showToast(msg: string, type='success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function openAdd() {
    setEditItem(null)
    setForm({ date: new Date().toISOString().slice(0,10), time_of_day: '오전', model: 'SP3', category: 'FRNT / STD', scratch_location: '', equipment_no: '', jig_status: '양호', equipment_issue: '해당없음', action: '해당없음', note: '' })
    setModal(true)
  }

  function openEdit(item: any) {
    setEditItem(item)
    setForm({ ...item })
    setModal(true)
  }

  async function handleSave() {
    if (!form.date || !form.scratch_location || !form.equipment_no) {
      showToast('필수 항목을 입력해주세요', 'error'); return
    }
    if (editItem) {
      const { error } = await supabase.from('scratch').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editItem.id)
      if (error) { showToast('수정 실패: '+error.message, 'error'); return }
      showToast('수정되었습니다')
    } else {
      const { error } = await supabase.from('scratch').insert([form])
      if (error) { showToast('등록 실패: '+error.message, 'error'); return }
      showToast('등록되었습니다')
    }
    setModal(false)
    fetchData()
  }

  async function handleDelete(id: number) {
    const { error } = await supabase.from('scratch').delete().eq('id', id)
    if (error) { showToast('삭제 실패', 'error'); return }
    showToast('삭제되었습니다')
    setDeleteId(null)
    fetchData()
  }

  const filtered = filterModel === '전체' ? data : data.filter(d => d.model === filterModel)

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>찍힘 관리</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>설비 찍힘 발생 현황 입력 및 관리</div>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ 찍힘 등록</button>
        </div>

        <div className="content-area">
          {/* Filter */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {['전체', ...MODELS].map(m => (
              <button key={m} className={`btn btn-sm ${filterModel===m?'btn-primary':'btn-ghost'}`} onClick={() => setFilterModel(m)}>{m}</button>
            ))}
          </div>

          <div className="card">
            <div className="section-header">
              <div className="section-title">
                찍힘 내역 <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, fontWeight:400, color:'var(--text-muted)', marginLeft:6 }}>총 {filtered.length}건</span>
              </div>
              <ExcelToolbar tableName="scratch" columns={SCRATCH_COLUMNS} data={filtered} onImportComplete={fetchData} parseRow={parseScratchRow} />
            </div>
            {loading ? (
              <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)' }}>로딩 중...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)' }}>
                <div style={{ marginBottom:12 }}>등록된 데이터가 없습니다</div>
                <button className="btn btn-primary" onClick={openAdd}>+ 첫 번째 데이터 등록</button>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>NO</th><th>일자</th><th>오전/오후</th><th>차종</th><th>구분</th>
                    <th>찍힘부위</th><th>설비No</th><th>지그상태</th><th>설비문제</th><th>조치</th><th>비고</th><th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id}>
                      <td className="mono" style={{ fontSize:11, color:'var(--text-muted)' }}>{i+1}</td>
                      <td className="mono" style={{ fontSize:11 }}>{r.date}</td>
                      <td>{r.time_of_day}</td>
                      <td><span className="badge badge-blue">{r.model}</span></td>
                      <td style={{ fontSize:11 }}>{r.category}</td>
                      <td style={{ fontSize:11 }}>{r.scratch_location}</td>
                      <td><span className="badge badge-gray">#{r.equipment_no}</span></td>
                      <td><span className={`badge ${r.jig_status==='양호'?'badge-green':'badge-red'}`}>{r.jig_status}</span></td>
                      <td><span className={`badge ${r.equipment_issue==='해당없음'?'badge-gray':'badge-amber'}`}>{r.equipment_issue}</span></td>
                      <td><span className={`badge ${r.action==='해당없음'?'badge-gray':r.action==='조치완료'?'badge-green':'badge-amber'}`}>{r.action}</span></td>
                      <td style={{ fontSize:11, maxWidth:100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.note||'-'}</td>
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

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editItem ? '찍힘 수정' : '찍힘 등록'}</div>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">일자 *</label>
                <input className="form-input" type="date" value={form.date} onChange={e => setForm({...form, date:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">오전/오후</label>
                <select className="form-select" value={form.time_of_day} onChange={e => setForm({...form, time_of_day:e.target.value})}>
                  <option>오전</option><option>오후</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">차종</label>
                <select className="form-select" value={form.model} onChange={e => setForm({...form, model:e.target.value})}>
                  {MODELS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">구분</label>
                <select className="form-select" value={form.category} onChange={e => setForm({...form, category:e.target.value})}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group form-grid-full">
                <label className="form-label">찍힘 부위 *</label>
                <input className="form-input" placeholder="예: H/L LH, FOG LH 등" value={form.scratch_location} onChange={e => setForm({...form, scratch_location:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">해당 설비 번호 *</label>
                <select className="form-select" value={form.equipment_no} onChange={e => setForm({...form, equipment_no:e.target.value})}>
                  <option value="">선택</option>
                  {equipment.map(eq => <option key={eq.no} value={eq.no}>{eq.no}번 - {eq.name.substring(0,20)}...</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">지그 상태</label>
                <select className="form-select" value={form.jig_status} onChange={e => setForm({...form, jig_status:e.target.value})}>
                  {JIG_STATUS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">설비 문제 여부</label>
                <select className="form-select" value={form.equipment_issue} onChange={e => setForm({...form, equipment_issue:e.target.value})}>
                  {EQ_ISSUE.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">조치 유무</label>
                <select className="form-select" value={form.action} onChange={e => setForm({...form, action:e.target.value})}>
                  {ACTION.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group form-grid-full">
                <label className="form-label">비고</label>
                <textarea className="form-textarea" placeholder="추가 내용 입력" value={form.note||''} onChange={e => setForm({...form, note:e.target.value})} style={{ minHeight:60 }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleSave}>{editItem ? '저장' : '등록'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 360 }}>
            <div className="modal-header">
              <div className="modal-title">삭제 확인</div>
              <button className="modal-close" onClick={() => setDeleteId(null)}>×</button>
            </div>
            <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:20 }}>이 항목을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.</div>
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
