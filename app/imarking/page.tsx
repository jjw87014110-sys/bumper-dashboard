'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

const CATEGORIES = ['펀칭','융착','Air']
const MODES = ['Time','Energy','Air','탈거력']
const UNITS = ['AMP[%]','Energy[W]','[sec]','bar','kgf/cm2']

export default function ImarkingPage() {
  const { isLoggedIn } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [equipment, setEquipment] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState<any>({ equipment_no:'', change_date:new Date().toISOString().slice(0,10), category:'펀칭', mode:'Time', unit:'AMP[%]', value:'', note:'' })
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const [deleteId, setDeleteId] = useState<number|null>(null)
  const [filterEq, setFilterEq] = useState('전체')

  useEffect(() => {
    if (!isLoggedIn) { router.push('/login'); return }
    fetchData()
  }, [isLoggedIn])

  async function fetchData() {
    setLoading(true)
    const [im, eq] = await Promise.all([
      supabase.from('imarking').select('*, equipment(no,name,model)').order('change_date', { ascending:false }),
      supabase.from('equipment').select('no,name,model').order('no')
    ])
    setData(im.data || [])
    setEquipment(eq.data || [])
    setLoading(false)
  }

  function showToast(msg:string,type='success'){ setToast({msg,type}); setTimeout(()=>setToast(null),3000) }
  function openAdd(){ setEditItem(null); setForm({equipment_no:'',change_date:new Date().toISOString().slice(0,10),category:'펀칭',mode:'Time',unit:'AMP[%]',value:'',note:''}); setModal(true) }
  function openEdit(item:any){ setEditItem(item); setForm({...item}); setModal(true) }

  async function handleSave(){
    if(!form.equipment_no||!form.value){ showToast('필수 항목을 입력해주세요','error'); return }
    const payload = {...form, value:Number(form.value)}
    if(editItem){
      const {error} = await supabase.from('imarking').update({...payload,updated_at:new Date().toISOString()}).eq('id',editItem.id)
      if(error){ showToast('수정 실패','error'); return }
      showToast('수정되었습니다')
    } else {
      const {error} = await supabase.from('imarking').insert([payload])
      if(error){ showToast('등록 실패','error'); return }
      showToast('등록되었습니다')
    }
    setModal(false); fetchData()
  }

  async function handleDelete(id:number){
    await supabase.from('imarking').delete().eq('id',id)
    showToast('삭제되었습니다'); setDeleteId(null); fetchData()
  }

  const filtered = filterEq==='전체' ? data : data.filter(d=>String(d.equipment_no)===filterEq)

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{fontSize:17,fontWeight:700}}>아이마킹 관리</div>
            <div style={{fontSize:11,color:'var(--text-secondary)',marginTop:2}}>설비별 아이마킹 조건값 변경 이력 관리</div>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ 아이마킹 등록</button>
        </div>

        <div className="content-area">
          <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
            <button className={`btn btn-sm ${filterEq==='전체'?'btn-primary':'btn-ghost'}`} onClick={()=>setFilterEq('전체')}>전체</button>
            {equipment.slice(0,12).map(eq=>(
              <button key={eq.no} className={`btn btn-sm ${filterEq===String(eq.no)?'btn-primary':'btn-ghost'}`} onClick={()=>setFilterEq(String(eq.no))}>{eq.no}번</button>
            ))}
          </div>

          <div className="card">
            <div className="section-header">
              <div className="section-title">아이마킹 내역 <span style={{fontSize:12,fontWeight:400,color:'var(--text-muted)',marginLeft:6}}>총 {filtered.length}건</span></div>
            </div>
            {loading ? (
              <div style={{textAlign:'center',padding:'40px 0',color:'var(--text-muted)'}}>로딩 중...</div>
            ) : filtered.length===0 ? (
              <div style={{textAlign:'center',padding:'40px 0',color:'var(--text-muted)'}}>
                <div style={{marginBottom:12}}>등록된 아이마킹 데이터가 없습니다</div>
                <button className="btn btn-primary" onClick={openAdd}>+ 첫 번째 데이터 등록</button>
              </div>
            ) : (
              <table className="data-table">
                <thead><tr><th>변경일자</th><th>설비</th><th>차종</th><th>구분</th><th>모드</th><th>단위</th><th>값</th><th>비고</th><th>관리</th></tr></thead>
                <tbody>
                  {filtered.map(r=>(
                    <tr key={r.id}>
                      <td className="mono" style={{fontSize:11}}>{r.change_date}</td>
                      <td><span className="badge badge-gray">#{r.equipment_no}</span></td>
                      <td><span className="badge badge-teal">{r.equipment?.model||'-'}</span></td>
                      <td><span className={`badge ${r.category==='펀칭'?'badge-blue':r.category==='융착'?'badge-green':'badge-amber'}`}>{r.category}</span></td>
                      <td style={{fontSize:11}}>{r.mode}</td>
                      <td style={{fontSize:11,color:'var(--text-muted)'}}>{r.unit}</td>
                      <td style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:600,color:'var(--text-primary)'}}>{r.value}</td>
                      <td style={{fontSize:11}}>{r.note||'-'}</td>
                      <td>
                        <div style={{display:'flex',gap:4}}>
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
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editItem?'아이마킹 수정':'아이마킹 등록'}</div>
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
                <label className="form-label">변경일자</label>
                <input className="form-input" type="date" value={form.change_date} onChange={e=>setForm({...form,change_date:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">구분</label>
                <select className="form-select" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">설정 모드</label>
                <select className="form-select" value={form.mode} onChange={e=>setForm({...form,mode:e.target.value})}>
                  {MODES.map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">단위</label>
                <select className="form-select" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>
                  {UNITS.map(u=><option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">값 *</label>
                <input className="form-input" type="number" step="0.01" placeholder="수치 입력" value={form.value} onChange={e=>setForm({...form,value:e.target.value})} />
              </div>
              <div className="form-group form-grid-full">
                <label className="form-label">비고</label>
                <textarea className="form-textarea" value={form.note||''} onChange={e=>setForm({...form,note:e.target.value})} style={{minHeight:50}} />
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
          <div className="modal" style={{maxWidth:360}}>
            <div className="modal-header"><div className="modal-title">삭제 확인</div><button className="modal-close" onClick={()=>setDeleteId(null)}>×</button></div>
            <div style={{fontSize:13,color:'var(--text-secondary)',marginBottom:20}}>이 데이터를 삭제하시겠습니까?</div>
            <div className="modal-footer" style={{marginTop:0,paddingTop:0,border:'none'}}>
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
