'use client'
import { useEffect, useState } from 'react'
import { useRequireAdmin } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { hashPassword } from '@/lib/passwordHash'
import Sidebar from '@/components/Sidebar'

export default function SecurityPage() {
  const { userRole, userName, changePassword, changePin } = useRequireAdmin()

  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  // 비밀번호 변경
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  // PIN 변경
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  // 사용자 관리 (admin only)
  const [users, setUsers] = useState<any[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [userModal, setUserModal] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)
  const [userForm, setUserForm] = useState({ user_id: '', password: '', pin: '0515', name: '', role: 'user', department: '생산기술', position: 'PM' })
  // 접속 로그
  const [logs, setLogs] = useState<any[]>([])
  // 세션 정보
  const [sessionExpire, setSessionExpire] = useState<string | null>(null)

  function showToast(msg: string, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  useEffect(() => {
    if (userRole === 'admin') {
      fetchUsers()
      fetchLogs()
    }
    const exp = sessionStorage.getItem('bumper_expire')
    if (exp) setSessionExpire(new Date(Number(exp)).toLocaleString('ko-KR'))
  }, [userRole])

  async function fetchUsers() {
    const { data } = await supabase.from('users').select('*').order('id')
    setUsers(data || [])
  }

  async function fetchLogs() {
    const { data } = await supabase.from('access_logs').select('*').order('created_at', { ascending: false }).limit(20)
    setLogs(data || [])
  }

  async function handlePwChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPw !== confirmPw) { showToast('새 비밀번호가 일치하지 않습니다', 'error'); return }
    const result = await changePassword(oldPw, newPw)
    showToast(result.msg, result.ok ? 'success' : 'error')
    if (result.ok) { setOldPw(''); setNewPw(''); setConfirmPw('') }
  }

  async function handlePinChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPin !== confirmPin) { showToast('새 PIN이 일치하지 않습니다', 'error'); return }
    const result = await changePin(oldPin, newPin)
    showToast(result.msg, result.ok ? 'success' : 'error')
    if (result.ok) { setOldPin(''); setNewPin(''); setConfirmPin('') }
  }

  async function handleUserSave() {
    if (!userForm.user_id || !userForm.name) { showToast('아이디와 이름은 필수입니다', 'error'); return }
    // 신규 등록 시에만 비번 필수
    if (!editUser && !userForm.password) { showToast('비밀번호를 입력하세요', 'error'); return }

    if (editUser) {
      // 비번 비워두면 기존 유지, 입력하면 변경 (해싱해서 저장)
      const updatePayload: any = {
        name: userForm.name, role: userForm.role,
        department: userForm.department, position: userForm.position,
        pin: userForm.pin, updated_at: new Date().toISOString(),
      }
      if (userForm.password) updatePayload.password = await hashPassword(userForm.password)
      const { error } = await supabase.from('users').update(updatePayload).eq('id', editUser.id)
      if (error) { showToast('수정 실패', 'error'); return }
      showToast('수정 완료')
    } else {
      // 중복 ID 체크
      const { data: dup } = await supabase.from('users').select('id').eq('user_id', userForm.user_id).maybeSingle()
      if (dup) { showToast('이미 존재하는 아이디입니다', 'error'); return }
      // 신규 등록 — 비번 해싱
      const newUser = { ...userForm, password: await hashPassword(userForm.password) }
      const { error } = await supabase.from('users').insert([newUser])
      if (error) { showToast('등록 실패: ' + error.message, 'error'); return }
      showToast('등록 완료')
    }
    setUserModal(false); fetchUsers()
  }

  async function handleUserToggle(user: any) {
    await supabase.from('users').update({ is_active: !user.is_active, updated_at: new Date().toISOString() }).eq('id', user.id)
    fetchUsers()
  }

  async function handleUserDelete(user: any) {
    if (user.role === 'admin') { showToast('관리자 계정은 삭제할 수 없습니다', 'error'); return }
    if (!confirm(`"${user.name}(${user.user_id})" 계정을 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return
    const { error } = await supabase.from('users').delete().eq('id', user.id)
    if (error) { showToast('삭제 실패: ' + error.message, 'error'); return }
    showToast('삭제되었습니다')
    fetchUsers()
  }

  const th: React.CSSProperties = { fontSize: 10, padding: '7px 10px', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', textAlign: 'left' }
  const td: React.CSSProperties = { fontSize: 11, padding: '7px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }

  const filteredUsers = users.filter(u => {
    if (!userSearch.trim()) return true
    const q = userSearch.toLowerCase()
    return (u.name||'').toLowerCase().includes(q)
      || (u.user_id||'').toLowerCase().includes(q)
      || (u.department||'').toLowerCase().includes(q)
  })

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Security</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>보안 설정 및 사용자 관리</div>
          </div>
        </div>
        <div className="content-area">

          {/* 세션 정보 + 현재 사용자 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            <div className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>현재 사용자</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-blue)' }}>{userName || '-'}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>권한: {userRole === 'admin' ? '관리자' : '일반'}</div>
            </div>
            <div className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>세션 만료</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-amber)' }}>{sessionExpire || '-'}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>8시간 후 자동 로그아웃</div>
            </div>
            <div className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>보안 수준</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-green)' }}>3단계</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>IP + ID/PW + PIN</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* 비밀번호 변경 */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700 }}>🔐 비밀번호 변경</div>
              <form onSubmit={handlePwChange} style={{ padding: 18 }}>
                <div style={{ marginBottom: 12 }}>
                  <div className="form-label" style={{ marginBottom: 4 }}>현재 비밀번호</div>
                  <input className="form-input" type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div className="form-label" style={{ marginBottom: 4 }}>새 비밀번호</div>
                  <input className="form-input" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div className="form-label" style={{ marginBottom: 4 }}>새 비밀번호 확인</div>
                  <input className="form-input" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
                </div>
                <button className="btn btn-primary btn-sm" type="submit" disabled={!oldPw || !newPw || !confirmPw}>변경</button>
              </form>
            </div>

            {/* PIN 변경 */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700 }}>🔑 PIN 변경</div>
              <form onSubmit={handlePinChange} style={{ padding: 18 }}>
                <div style={{ marginBottom: 12 }}>
                  <div className="form-label" style={{ marginBottom: 4 }}>현재 PIN (4자리)</div>
                  <input className="form-input" type="password" maxLength={4} value={oldPin} onChange={e => setOldPin(e.target.value)} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div className="form-label" style={{ marginBottom: 4 }}>새 PIN (4자리)</div>
                  <input className="form-input" type="password" maxLength={4} value={newPin} onChange={e => setNewPin(e.target.value)} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div className="form-label" style={{ marginBottom: 4 }}>새 PIN 확인</div>
                  <input className="form-input" type="password" maxLength={4} value={confirmPin} onChange={e => setConfirmPin(e.target.value)} />
                </div>
                <button className="btn btn-primary btn-sm" type="submit" disabled={!oldPin || !newPin || !confirmPin}>변경</button>
              </form>
            </div>
          </div>

          {/* 사용자 관리 (admin only) */}
          {userRole === 'admin' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>👥 사용자 관리 <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>({filteredUsers.length}명)</span></div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="form-input" placeholder="이름/아이디/부서 검색..." value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ fontSize: 11, padding: '5px 10px', width: 180 }} />
                  <button className="btn btn-primary btn-sm" onClick={() => { setEditUser(null); setUserForm({ user_id:'', password:'', pin:'0515', name:'', role:'user', department:'생산기술', position:'PM' }); setUserModal(true) }}>+ 사용자 추가</button>
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['아이디','이름','부서','직책','권한','상태','관리'].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: 'var(--text-muted)' }}>{userSearch ? '검색 결과 없음' : '등록된 사용자 없음'}</td></tr>
                  ) : filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td style={td}>{u.user_id}</td>
                      <td style={td}>{u.name}</td>
                      <td style={td}>{u.department}</td>
                      <td style={td}>{u.position || '-'}</td>
                      <td style={td}><span className={`badge ${u.role === 'admin' ? 'badge-red' : 'badge-blue'}`}>{u.role === 'admin' ? '관리자' : '일반'}</span></td>
                      <td style={td}><span className={`badge ${u.is_active ? 'badge-green' : 'badge-gray'}`}>{u.is_active ? '활성' : '비활성'}</span></td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setEditUser(u); setUserForm({ user_id:u.user_id, password:'', pin:u.pin, name:u.name, role:u.role, department:u.department, position:u.position || 'PM' }); setUserModal(true) }}>수정</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleUserToggle(u)}>{u.is_active ? '비활성' : '활성'}</button>
                          {u.role !== 'admin' && (
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-red)' }} onClick={() => handleUserDelete(u)}>삭제</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 접속 로그 (admin only) */}
          {userRole === 'admin' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>🔐 최근 접속 로그</div>
                <button className="btn btn-ghost btn-sm" onClick={fetchLogs}>🔄 새로고침</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['시간','IP','상태','User Agent'].map(h => <th key={h} style={th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: 'var(--text-muted)' }}>로그 없음</td></tr>
                    ) : logs.map((l, i) => (
                      <tr key={i}>
                        <td style={td}>{l.created_at ? new Date(l.created_at).toLocaleString('ko-KR') : '-'}</td>
                        <td style={{ ...td, fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>{l.ip_address || '-'}</td>
                        <td style={td}><span className={`badge ${l.status === 'allowed' ? 'badge-green' : 'badge-red'}`}>{l.status}</span></td>
                        <td style={{ ...td, fontSize: 9, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.user_agent?.slice(0, 60) || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 사용자 추가/수정 모달 */}
      {userModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setUserModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editUser ? '사용자 수정' : '사용자 추가'}</div>
              <button className="modal-close" onClick={() => setUserModal(false)}>×</button>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">아이디 *</label>
                <input className="form-input" value={userForm.user_id} onChange={e => setUserForm({ ...userForm, user_id: e.target.value })} disabled={!!editUser} />
              </div>
              <div className="form-group">
                <label className="form-label">이름 *</label>
                <input className="form-input" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{editUser ? '비밀번호 (변경 시에만 입력)' : '비밀번호 *'}</label>
                <input className="form-input" type="password" placeholder={editUser ? '비워두면 기존 비밀번호 유지' : ''} value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">PIN (4자리)</label>
                <input className="form-input" maxLength={4} value={userForm.pin} onChange={e => setUserForm({ ...userForm, pin: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">부서</label>
                <input className="form-input" value={userForm.department} onChange={e => setUserForm({ ...userForm, department: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">직책</label>
                <select className="form-select" value={userForm.position} onChange={e => setUserForm({ ...userForm, position: e.target.value })}>
                  <option value="PM">매니저 (PM)</option>
                  <option value="TJ">팀장 (TJ)</option>
                  <option value="EX">임원 (EX)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">권한</label>
                <select className="form-select" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                  <option value="user">일반</option>
                  <option value="admin">관리자</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setUserModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleUserSave}>{editUser ? '저장' : '등록'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
