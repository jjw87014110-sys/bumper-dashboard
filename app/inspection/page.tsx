'use client'
import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/auth'
import { useToast } from '@/lib/useToast'
import { supabase } from '@/lib/supabase'
import { logAudit, getCurrentUserName } from '@/lib/auditLog'
import Sidebar from '@/components/Sidebar'
import { exportScratchData } from '@/lib/exportCSV'

type Tab = 'scratch' | 'imarking'

export default function InspectionPage() {
  useRequireAuth()
  const { showToast, ToastUI } = useToast()
  const [tab, setTab] = useState<Tab>('scratch')
  const [equipment, setEquipment] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [eqLoading, setEqLoading] = useState(true)

  // 공통 데이터
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // 스크라치 전용
  const [modal, setModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<number|null>(null)
  const [form, setForm] = useState<any>({ date: new Date().toISOString().slice(0,10), time_of_day: '오전', model: '', category: '', scratch_location: '', jig_status: '양호', equipment_issue: '해당없음', action: '', note: '' })
  const [imageFile, setImageFile] = useState<File|null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchText, setSearchText] = useState('')
  const [uploading, setUploading] = useState(false)

  // 아이마킹 전용
  const [inspectDate, setInspectDate] = useState(new Date().toISOString().slice(0,10))
  const [inspectNote, setInspectNote] = useState('')
  const [deleteImId, setDeleteImId] = useState<number|null>(null)

  const typeColors: any = { '복합기': 'badge-blue', '융착기': 'badge-green', '펀칭기': 'badge-amber', '지그': 'badge-gray' }

  useEffect(() => {
    supabase.from('equipment').select('no,name,model,type').neq('type','지그').order('no')
      .then(({ data }) => { setEquipment(data || []); setEqLoading(false) })
  }, [])

  async function selectEquipment(eq: any) {
    setSelected(eq); setLoading(true)
    await loadData(eq.no, tab)
  }

  async function loadData(eqNo: number, t: Tab) {
    setLoading(true)
    if (t === 'scratch') {
      const { data } = await supabase.from('scratch').select('*').eq('equipment_no', eqNo).order('date', { ascending: false })
      setData(data || [])
    } else {
      const { data } = await supabase.from('imarking').select('*').eq('equipment_no', eqNo).order('change_date', { ascending: false })
      setData(data || [])
    }
    setLoading(false)
  }

  // 탭 변경 시 데이터 다시 로드
  useEffect(() => {
    if (selected) loadData(selected.no, tab)
  }, [tab])

  async function reload() {
    if (!selected) return
    await loadData(selected.no, tab)
  }

  // ─── 스크라치 함수들 ───
  function openAddScratch() {
    setEditItem(null)
    setForm({ date: new Date().toISOString().slice(0,10), time_of_day: '오전', model: selected?.model || '', category: '', scratch_location: '', jig_status: '양호', equipment_issue: '해당없음', action: '', note: '' })
    setImageFile(null); setImagePreview('')
    setModal(true)
  }

  function openEditScratch(item: any) {
    setEditItem(item)
    setForm({ date: item.date, time_of_day: item.time_of_day||'오전', model: item.model||'', category: item.category||'', scratch_location: item.scratch_location||'', jig_status: item.jig_status||'양호', equipment_issue: item.equipment_issue||'해당없음', action: item.action||'', note: item.note||'' })
    setImagePreview(item.image_url || '')
    setImageFile(null)
    setModal(true)
  }

  async function handleSaveScratch() {
    setUploading(true)
    let imageUrl = editItem?.image_url || null

    if (imageFile) {
      const fileName = `scratch_${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
      const { error: uploadError } = await supabase.storage.from('images').upload(fileName, imageFile)
      if (uploadError) {
        showToast('이미지 업로드 실패: ' + uploadError.message, 'error')
        setUploading(false); return
      }
      const { data } = supabase.storage.from('images').getPublicUrl(fileName)
      imageUrl = data.publicUrl
    }

    const payload = { ...form, equipment_no: selected.no, image_url: imageUrl }

    if (editItem) {
      const { error } = await supabase.from('scratch').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editItem.id)
      if (error) { showToast('수정 실패', 'error'); setUploading(false); return }
      showToast('수정되었습니다')
      logAudit(getCurrentUserName(), 'UPDATE', 'scratch', '찍힘 수정', { targetId: editItem.id })
    } else {
      const { error } = await supabase.from('scratch').insert([payload])
      if (error) { showToast('등록 실패', 'error'); setUploading(false); return }
      showToast('등록되었습니다')
      logAudit(getCurrentUserName(), 'CREATE', 'scratch', '찍힘 등록')
    }
    setUploading(false)
    setModal(false)
    reload()
  }

  async function handleDeleteScratch() {
    if (!deleteId) return
    const { error } = await supabase.from('scratch').delete().eq('id', deleteId)
    if (error) { showToast('삭제 실패', 'error'); return }
    showToast('삭제되었습니다')
    logAudit(getCurrentUserName(), 'DELETE', 'scratch', '찍힘 삭제')
    setDeleteId(null)
    reload()
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  // ─── 아이마킹 함수들 ───
  async function handleAddInspection() {
    if (!inspectDate) return
    const payload = {
      equipment_no: selected.no,
      change_date: inspectDate,
      category: '점검',
      mode: '아이마킹',
      unit: '점검완료',
      value: '✓',
      reason: inspectNote || '정기 점검',
      person: getCurrentUserName(),
    }
    const { error } = await supabase.from('imarking').insert([payload])
    if (error) { showToast('등록 실패: ' + error.message, 'error'); return }
    showToast('점검 기록 등록 완료')
    logAudit(getCurrentUserName(), 'CREATE', 'imarking', '아이마킹 점검 등록')
    setInspectDate(new Date().toISOString().slice(0,10))
    setInspectNote('')
    reload()
  }

  async function handleDeleteImarking() {
    if (!deleteImId) return
    const { error } = await supabase.from('imarking').delete().eq('id', deleteImId)
    if (error) { showToast('삭제 실패', 'error'); return }
    showToast('삭제되었습니다')
    logAudit(getCurrentUserName(), 'DELETE', 'imarking', '아이마킹 삭제')
    setDeleteImId(null)
    reload()
  }

  // ─── 필터링 ───
  const filteredData = data.filter(r => {
    if (tab === 'scratch') {
      if (dateFrom && r.date < dateFrom) return false
      if (dateTo && r.date > dateTo) return false
      if (searchText) {
        const q = searchText.toLowerCase()
        const target = `${r.category||''} ${r.scratch_location||''} ${r.action||''} ${r.note||''}`.toLowerCase()
        if (!target.includes(q)) return false
      }
    }
    return true
  })

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Inspection</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>설비 점검 통합 관리 (스크라치 + 아이마킹)</div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className={`btn btn-sm ${tab === 'scratch' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTab('scratch')}
              style={tab === 'scratch' ? { background: 'var(--accent-amber)' } : {}}
            >🔍 스크라치</button>
            <button
              className={`btn btn-sm ${tab === 'imarking' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTab('imarking')}
              style={tab === 'imarking' ? { background: 'var(--accent-teal)' } : {}}
            >📊 아이마킹</button>
          </div>
        </div>

        <div className="content-area">
          <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 130px)' }}>

            {/* 좌측: 설비 목록 */}
            <div className="card eq-sidebar" style={{ padding: 0, overflow: 'hidden', width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>
                설비 목록 ({equipment.length}대)
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {eqLoading ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>로딩...</div> :
                equipment.map(eq => (
                  <button key={eq.no} onClick={() => selectEquipment(eq)}
                    style={{
                      width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
                      border: 'none', borderLeft: `3px solid ${selected?.no === eq.no ? (tab === 'scratch' ? 'var(--accent-amber)' : 'var(--accent-teal)') : 'transparent'}`,
                      background: selected?.no === eq.no ? (tab === 'scratch' ? 'var(--accent-amber-dim)' : 'var(--accent-teal-dim)') : 'transparent',
                      cursor: 'pointer', fontSize: 12, textAlign: 'left',
                      color: 'var(--text-primary)', fontFamily: 'Pretendard, sans-serif',
                      borderBottom: '1px solid var(--border)',
                    }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)', minWidth: 32 }}>#{String(eq.no).padStart(2, '0')}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eq.name}</span>
                    <span className={`badge ${typeColors[eq.type] || 'badge-gray'}`} style={{ fontSize: 9 }}>{eq.type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 우측: 데이터 영역 */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {!selected ? (
                <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="empty-state-pro">
                    <div className="empty-icon">{tab === 'scratch' ? '🔍' : '📊'}</div>
                    <div className="empty-title">설비를 선택해주세요</div>
                    <div className="empty-desc">좌측 목록에서 설비를 클릭하면 {tab === 'scratch' ? '찍힘' : '아이마킹'} 데이터가 표시됩니다</div>
                  </div>
                </div>
              ) : (
                <>
                  {/* 선택된 설비 헤더 */}
                  <div className="card" style={{ padding: '14px 18px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: `4px solid ${tab === 'scratch' ? 'var(--accent-amber)' : 'var(--accent-teal)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color: tab === 'scratch' ? 'var(--accent-amber)' : 'var(--accent-teal)' }}>#{String(selected.no).padStart(2,'0')}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{selected.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selected.model} · {selected.type}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {tab === 'scratch' ? (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => exportScratchData(selected.name, data)}>📥 CSV</button>
                          <button className="btn btn-primary btn-sm" onClick={openAddScratch}>+ 찍힘 등록</button>
                        </>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>아래에서 점검 기록 등록</span>
                      )}
                    </div>
                  </div>

                  {/* ───────── 스크라치 탭 ───────── */}
                  {tab === 'scratch' && (
                    <>
                      {/* 필터 */}
                      <div className="card" style={{ padding: '10px 14px', marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>기간:</span>
                        <input type="date" className="form-input" style={{ width: 130 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>~</span>
                        <input type="date" className="form-input" style={{ width: 130 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
                        <input type="text" className="form-input" placeholder="검색..." style={{ flex: 1, minWidth: 120 }} value={searchText} onChange={e => setSearchText(e.target.value)} />
                        {(dateFrom || dateTo || searchText) && (
                          <button className="btn btn-ghost btn-sm" onClick={() => { setDateFrom(''); setDateTo(''); setSearchText('') }}>초기화</button>
                        )}
                      </div>

                      <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                          {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>로딩 중...</div> :
                          filteredData.length === 0 ? (
                            <div className="empty-state-pro">
                              <div className="empty-icon">🔍</div>
                              <div className="empty-title">찍힘 데이터가 없습니다</div>
                              <div className="empty-desc">"+ 찍힘 등록" 버튼으로 추가하세요</div>
                            </div>
                          ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead><tr>{['일자','시간대','모델','구분','위치','지그','설비이상','조치','이미지','관리'].map(h => <th key={h} className="tbl-th">{h}</th>)}</tr></thead>
                              <tbody>{filteredData.map(r => (
                                <tr key={r.id}>
                                  <td className="tbl-td">{r.date}</td>
                                  <td className="tbl-td">{r.time_of_day||'-'}</td>
                                  <td className="tbl-td">{r.model||'-'}</td>
                                  <td className="tbl-td">{r.category||'-'}</td>
                                  <td className="tbl-td">{r.scratch_location||'-'}</td>
                                  <td className="tbl-td"><span className={`badge ${r.jig_status === '양호' ? 'badge-green' : 'badge-red'}`}>{r.jig_status||'-'}</span></td>
                                  <td className="tbl-td"><span className={`badge ${r.equipment_issue === '해당없음' ? 'badge-gray' : 'badge-amber'}`}>{r.equipment_issue||'-'}</span></td>
                                  <td className="tbl-td">{r.action||'-'}</td>
                                  <td className="tbl-td">
                                    {r.image_url ? <a href={r.image_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)' }}>📷 보기</a> : '-'}
                                  </td>
                                  <td className="tbl-td">
                                    <div style={{ display: 'flex', gap: 4 }}>
                                      <button className="btn btn-ghost btn-sm" onClick={() => openEditScratch(r)}>수정</button>
                                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(r.id)}>삭제</button>
                                    </div>
                                  </td>
                                </tr>
                              ))}</tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* ───────── 아이마킹 탭 ───────── */}
                  {tab === 'imarking' && (
                    <>
                      {/* 점검 기록 입력 */}
                      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--text-primary)' }}>✓ 아이마킹 점검 기록</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <input type="date" className="form-input" style={{ width: 150 }} value={inspectDate} onChange={e => setInspectDate(e.target.value)} />
                          <input type="text" className="form-input" style={{ flex: 1, minWidth: 200 }} placeholder="비고 (선택)" value={inspectNote} onChange={e => setInspectNote(e.target.value)} />
                          <button className="btn btn-primary btn-sm" onClick={handleAddInspection}>+ 점검 등록</button>
                        </div>
                      </div>

                      {/* 점검 이력 */}
                      <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                          <span>점검 이력</span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>총 {data.length}건</span>
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                          {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>로딩 중...</div> :
                          data.length === 0 ? (
                            <div className="empty-state-pro">
                              <div className="empty-icon">📊</div>
                              <div className="empty-title">점검 기록이 없습니다</div>
                              <div className="empty-desc">위에서 "+ 점검 등록" 버튼으로 추가하세요</div>
                            </div>
                          ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead><tr>{['점검일','구분','내용','비고','담당자','관리'].map(h => <th key={h} className="tbl-th">{h}</th>)}</tr></thead>
                              <tbody>{data.map(r => (
                                <tr key={r.id}>
                                  <td className="tbl-td">{r.change_date}</td>
                                  <td className="tbl-td"><span className="badge badge-teal">{r.category||'점검'}</span></td>
                                  <td className="tbl-td">{r.mode||'-'} {r.value && `(${r.value})`}</td>
                                  <td className="tbl-td">{r.reason||'-'}</td>
                                  <td className="tbl-td">{r.person||'-'}</td>
                                  <td className="tbl-td">
                                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteImId(r.id)}>삭제</button>
                                  </td>
                                </tr>
                              ))}</tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 찍힘 모달 */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 700 }}>
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
                <label className="form-label">시간대</label>
                <select className="form-select" value={form.time_of_day} onChange={e => setForm({...form, time_of_day: e.target.value})}>
                  <option>오전</option><option>오후</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">모델</label>
                <input className="form-input" type="text" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">구분</label>
                <input className="form-input" type="text" placeholder="예: 안쪽, 외측" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
              </div>
              <div className="form-group form-grid-full">
                <label className="form-label">찍힘 위치</label>
                <input className="form-input" type="text" value={form.scratch_location} onChange={e => setForm({...form, scratch_location: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">지그 상태</label>
                <select className="form-select" value={form.jig_status} onChange={e => setForm({...form, jig_status: e.target.value})}>
                  <option>양호</option><option>이상</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">설비 이상</label>
                <select className="form-select" value={form.equipment_issue} onChange={e => setForm({...form, equipment_issue: e.target.value})}>
                  <option>해당없음</option><option>위치이상</option><option>마모</option><option>기타</option>
                </select>
              </div>
              <div className="form-group form-grid-full">
                <label className="form-label">조치사항</label>
                <input className="form-input" type="text" value={form.action} onChange={e => setForm({...form, action: e.target.value})} />
              </div>
              <div className="form-group form-grid-full">
                <label className="form-label">비고</label>
                <textarea className="form-textarea" value={form.note} onChange={e => setForm({...form, note: e.target.value})} />
              </div>
              <div className="form-group form-grid-full">
                <label className="form-label">사진 첨부 (선택)</label>
                <input type="file" accept="image/*" onChange={handleImageSelect} style={{ fontSize: 11 }} />
                {imagePreview && (
                  <div style={{ marginTop: 8 }}>
                    <img src={imagePreview} alt="미리보기" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 4, border: '1px solid var(--border)' }} />
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleSaveScratch} disabled={uploading}>{uploading ? '저장 중...' : editItem ? '저장' : '등록'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 찍힘 삭제 확인 */}
      {deleteId && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-title" style={{ marginBottom: 12 }}>찍힘 삭제</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>이 찍힘 기록을 삭제하시겠습니까?</p>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>취소</button>
              <button className="btn btn-danger" onClick={handleDeleteScratch}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* 아이마킹 삭제 확인 */}
      {deleteImId && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteImId(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-title" style={{ marginBottom: 12 }}>아이마킹 삭제</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>이 점검 기록을 삭제하시겠습니까?</p>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteImId(null)}>취소</button>
              <button className="btn btn-danger" onClick={handleDeleteImarking}>삭제</button>
            </div>
          </div>
        </div>
      )}

      <ToastUI />
    </div>
  )
}
