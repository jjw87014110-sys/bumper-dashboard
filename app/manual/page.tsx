'use client'
import { useState, useEffect } from 'react'
import { useRequireAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

// ─── 타입 정의 ───────────────────────────────────────────

interface ManualSection {
  id: string
  icon: string
  title: string
  category: string
  description: string
  steps: { num: number; text: string; subSteps?: string[] }[]
  tips?: string[]
}

interface ParamRow {
  defect: string
  energy: string
  output: string
  air: string
  time: string
}

interface SubItem { label: string; value: string }
interface EtcItem { symptom: string; action: string }

interface Guide {
  id: string
  icon: string
  title: string
  color: string
  dimColor: string
  desc: string
  keywords: string[]
  steps: string[]
  paramTable?: ParamRow[]
  subItems?: SubItem[]
  etcItems?: EtcItem[]
}

interface MaintenanceRow {
  equipment_no: number
  maintenance_date: string
  defect_type: string
  action_detail: string
}

// ─── 정적 데이터 (컴포넌트 외부) ─────────────────────────

const MANUALS: ManualSection[] = [
  {
    id: 'alarm', icon: '🔔', title: '알람', category: 'Alarm Management',
    description: '전 설비의 융착 · 펀칭 관련 알람 기록을 관리합니다.',
    steps: [
      { num: 1, text: '오전 8시, 오후 4시에 전 설비의 융착 · 펀칭 관련 알람 발생 여부를 점검합니다.' },
      { num: 2, text: '설비에 알람이 있을 경우 다음 절차에 따라 처리합니다.', subSteps: ['후가공설비 일지 기입', '실제 미융착 / 미펀칭 여부 판정', '미융착 · 미펀칭일 경우 보전반 작업 이력 확인', '정비 내역 및 추가 자재 구입 필요 여부, 설비 파라미터 조정, 기구적 조정 여부 점검', '작업자 실수로 판단되는 경우 별도 조치 없이 종료'] },
    ],
    tips: ['정기 점검 시간: 매일 08:00, 16:00'],
  },
  {
    id: 'scratch', icon: '🔍', title: '스크라치', category: 'Scratch Management',
    description: '오전 7시 30분, 오후 3시 30분 1라인 공정회의에서 나온 불량품 중 설비에 의한 스크라치를 판단하여 기록합니다.',
    steps: [
      { num: 1, text: '오전 7시 30분, 오후 3시 30분 1라인 공정회의에 참여하여 설비에 의한 스크라치 발생 여부를 점검합니다.' },
      { num: 2, text: '설비에 의한 스크라치가 확인되면, 후가공설비 시스템 > 스크라치 목록에 추가합니다.' },
      { num: 3, text: '설비에 의한 스크라치가 없으면 별도 등록 없이 종료합니다.' },
    ],
    tips: ['공정회의 참여 시간: 매일 07:30, 15:30'],
  },
  {
    id: 'imarking', icon: '📊', title: '아이마킹', category: 'i-Marking Inspection',
    description: '매일 1일 1설비씩 담당하여 후가공설비 아이마킹을 실시합니다.',
    steps: [
      { num: 1, text: '오전 7시 30분 조례 후, 해당 일자의 담당 설비로 이동합니다.' },
      { num: 2, text: '클램프, 스토퍼, 융착혼 등 설비 관련 모든 볼트를 점검하여 아이마킹을 실시합니다.' },
    ],
    tips: ['예외: 주말, 공휴일, 휴가, 함평 출근일 제외', '점검 시작 시간: 매일 07:30 조례 후'],
  },
  {
    id: 'condition', icon: '⚙️', title: '조건표', category: 'Condition Table',
    description: '전 설비의 설비 파라미터를 관리합니다. 융착 에너지/출력/시간, 에어압, 펀칭 에너지/출력/시간 등을 관리합니다.',
    steps: [{ num: 1, text: '전 설비 정비 또는 설비 파라미터 조정 시, 후가공설비 시스템에 변경된 데이터를 즉시 수정합니다.' }],
    tips: ['관리 항목: 융착 에너지 / 출력 / 융착시간 / 에어압 / 펀칭 에너지 / 출력 / 융착시간', '파라미터 변경 시 반드시 즉시 기록'],
  },
  {
    id: 'maintenance', icon: '🔧', title: '정비표', category: 'Maintenance Record',
    description: '전 설비의 정비이력을 관리합니다.',
    steps: [
      { num: 1, text: 'ERP 접속 → 자산/설비관리 → 조업일보목록 → 보전조업일보 → 조회출력' },
      { num: 2, text: '일자를 작일자로 설정하여 작일 조업일보 내용을 시스템에 기입합니다.' },
    ],
    tips: ['월요일에는 반드시 주말작업 이력까지 함께 확인', 'ERP 경로: 자산/설비관리 > 조업일보목록 > 보전조업일보'],
  },
  {
    id: 'materials', icon: '📦', title: '자재관리', category: 'Materials Management',
    description: '정비 시 사용한 자재를 스페어로 주문 · 관리합니다.',
    steps: [{ num: 1, text: '작일 조업일보를 통해 사용된 자재를 조사하고 구매합니다.' }],
    tips: ['스페어 자재 부족 시 즉시 구매 진행'],
  },
  {
    id: 'worktime', icon: '⏰', title: '근무시간 관리', category: 'Worktime Management',
    description: '보전반 4명의 주간 근무시간을 관리하고 법정 한도(주 64h) 초과 여부를 사전 모니터링합니다.',
    steps: [
      { num: 1, text: 'ERP 접속 → 인사관리 → 개인별 출퇴근현황 조회' },
      { num: 2, text: '보전반 4명(이동주·이수열·정수연·차상정) 각각의 데이터를 HTML 또는 엑셀로 다운로드' },
      { num: 3, text: '파일명을 "5월_이동주.html" 형식으로 변경 (이름 포함 필수)' },
      { num: 4, text: 'Worktime 페이지 → "+ ERP 파일 업로드" 클릭' },
      { num: 5, text: '연도·월 선택 후 4개 파일 한번에 선택하여 업로드' },
      { num: 6, text: '카드별 원형 게이지와 주말 예상 시간 확인 → 초과 위험자 사전 조치' },
    ],
    tips: ['인원: B반 2명(이동주·이수열, 주간→야간), A반 2명(정수연·차상정, 야간→주간)', '52h: 주의 / 64h: 법정 한도 (근로기준법 제53조)', '같은 날짜 재업로드 시 덮어쓰기 (수정 가능)'],
  },
]

const GUIDES: Guide[] = [
  {
    id: 'param', icon: '⚡', title: '파라미터 조정',
    color: 'var(--accent-blue)', dimColor: 'var(--accent-blue-dim)',
    desc: '미융착·외관굴곡·Time Out·버 발생·Over Load 등 파라미터로 해결 가능한 불량',
    steps: ['알람 내용 확인', '앰프 초기화 시도', '아래 표 기준으로 파라미터 조정 (융착 에너지 / 출력 / 융착시간 / 에어압)'],
    paramTable: [
      { defect: '미융착',    energy: '▲ 상승', output: '유지',   air: '▲ 상승', time: '▲ 상승' },
      { defect: '외관굴곡',  energy: '▼ 하강', output: '▼ 하강', air: '▼ 하강', time: '▼ 하강' },
      { defect: 'Time Out', energy: '▼ 하강', output: '▲ 상승', air: '▲ 상승', time: '▲ 상승' },
      { defect: '버 발생',   energy: '▼ 하강', output: '유지',   air: '▼ 하강', time: '▼ 하강' },
      { defect: 'Over Load', energy: '유지',   output: '▼ 하강', air: '▼ 하강', time: '유지'   },
    ],
    keywords: ['미융착', '융착불량', '융착 불량', '외관굴곡', 'time out', 'Time Out', 'TIME OUT', '버 발생', 'Over Load', '초음파 알람', 'Frequency', '에너지', '출력값', '융착시간', '앰프'],
  },
  {
    id: 'mech', icon: '🔩', title: '기구적 조정',
    color: 'var(--accent-teal)', dimColor: 'var(--accent-teal-dim, #e0f7f5)',
    desc: '파라미터 조정으로 해결 안 될 때 — 부품 교체 또는 케이블·커넥터 체결 불량',
    steps: ['부품 교체 — 혼 → 진동자 → 부스터 → 앰프 순서로 점검', '케이블·커넥터 완체결 확인'],
    subItems: [
      { label: '교체 순서',    value: '혼 → 진동자 → 부스터 → 앰프 (컨버터)' },
      { label: '주요 교체 부품', value: '융착혼, 진동자, 부스터, 컨버터, 전자접촉기, 광센서, 솔밸브, LM가이드' },
      { label: '체결 확인',    value: '발진기 케이블 커넥터, 에어호스, 베어링 단자 볼트' },
    ],
    keywords: ['진동자', '부스터', '혼', '앰프', '케이블', '커넥터', '컨버터', '교체', '광센서', '솔밸브', 'LM 가이드', '전자접촉기', '무드볼트', '스프링', '파손'],
  },
  {
    id: 'plc', icon: '💻', title: 'PLC 수정',
    color: '#8b5cf6', dimColor: '#f3f0ff',
    desc: '원점 복귀 불가·가짜 알람·제어 오동작 등 PLC 레벨의 문제',
    steps: ['병목 구간 파악 (어느 동작에서 멈추는지 확인)', 'PLC 수정 가능 여부 판단', '업체 통해서 원격 수정 진행'],
    subItems: [
      { label: '해당 증상', value: '가짜 미융착 알람, 원점 복귀 불가, 지그 전/후진 불가, 알람 시간 편차' },
      { label: '조치 주체', value: '자체 수정 불가 시 설비 업체 원격 수정 요청' },
    ],
    keywords: ['PLC', '원점', '가짜', '마그네트', '제어', '프로그램', '비가동', '원위치', '양수버튼', '시간 편차'],
  },
  {
    id: 'etc', icon: '📌', title: '기타',
    color: 'var(--accent-amber)', dimColor: 'var(--accent-amber-dim)',
    desc: '스크라치·미감지·실린더 이상·부품 파손 등 기타 유형별 조치',
    steps: [],
    etcItems: [
      { symptom: '제품 스크라치 / 긁힘',    action: '지그 연삭 또는 패드 교체 (소가죽 패드)' },
      { symptom: '제품 미감지',             action: '센서 감도 조정 또는 각도 조절' },
      { symptom: '실린더 / 상하강 이상',    action: '감지 센서 위치 조정 또는 에어압 조정 또는 부품 교체' },
      { symptom: '삽입 / 안착 불량',        action: '볼트 조임, 동부싱 위치 조정, 가이드바 설치' },
      { symptom: '간섭 발생',               action: '간섭 부위 그라인더 커팅 또는 사상' },
      { symptom: '나사풀림 / 에어누출 / 녹', action: '볼트 조임, 에어 부품 교체, 녹 제거' },
    ],
    keywords: ['스크라치', '긁힘', '미감지', '감지불량', '실린더', '상하강', '상/하강', '삽입불량', '안착', '간섭', '나사풀림', '에어', '녹', '위치 쏠림'],
  },
]

// ─── 헬퍼 ────────────────────────────────────────────────

function dirColor(val: string): string {
  if (val.includes('▲')) return 'var(--accent-blue)'
  if (val.includes('▼')) return 'var(--accent-red)'
  return 'var(--text-muted)'
}

function filterByKeywords(rows: MaintenanceRow[], keywords: string[]): MaintenanceRow[] {
  const lower = keywords.map(k => k.toLowerCase())
  return rows.filter(r => {
    const d = (r.defect_type || '').toLowerCase()
    const a = (r.action_detail || '').toLowerCase()
    return lower.some(k => d.includes(k) || a.includes(k))
  })
}

// ─── 서브 컴포넌트 ────────────────────────────────────────

function GuideDetail({ guide, history, loading }: { guide: Guide; history: MaintenanceRow[]; loading: boolean }) {
  const th: React.CSSProperties = {
    padding: '10px 14px', textAlign: 'center', fontWeight: 700,
    background: 'var(--bg-hover)', borderBottom: '2px solid var(--border)',
    color: 'var(--text-secondary)', fontSize: 11,
  }
  const td: React.CSSProperties = { padding: '11px 14px', textAlign: 'center', borderBottom: '1px solid var(--border)', fontSize: 12 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* 헤더 카드 */}
      <div className="card" style={{ padding: '18px 22px', borderLeft: `4px solid ${guide.color}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 22 }}>{guide.icon}</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: guide.color }}>{guide.title}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{guide.desc}</div>
      </div>

      {/* 파라미터 표 (param 전용) */}
      {guide.paramTable && (
        <div className="card" style={{ padding: '18px 22px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>📊 불량별 파라미터 조정 방향</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['불량', '에너지 (J)', '출력 (%)', 'Air압 (bar)', '융착시간 (sec)'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {guide.paramTable.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                    <td style={{ ...td, fontWeight: 700, color: 'var(--text-primary)' }}>{row.defect}</td>
                    {[row.energy, row.output, row.air, row.time].map((v, j) => (
                      <td key={j} style={{ ...td, fontWeight: 600, color: dirColor(v) }}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 조치 순서 */}
      {guide.steps.length > 0 && (
        <div className="card" style={{ padding: '18px 22px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>📋 조치 순서</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {guide.steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', background: guide.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{i + 1}</div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, paddingTop: 3 }}>{step}</div>
              </div>
            ))}
          </div>
          {guide.subItems && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {guide.subItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: guide.color, whiteSpace: 'nowrap', paddingTop: 1 }}>{item.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 기타 유형별 카드 */}
      {guide.etcItems && (
        <div className="card" style={{ padding: '18px 22px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>📌 유형별 조치방법</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {guide.etcItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ background: 'var(--bg-hover)', padding: '12px 16px', minWidth: 200, fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
                  {item.symptom}
                </div>
                <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', flex: 1 }}>
                  {item.action}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 실제 정비이력 */}
      <div className="card" style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            📂 실제 정비이력 <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>DB 자동 조회</span>
          </div>
          {!loading && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{history.length}건</span>}
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 12 }}>불러오는 중...</div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 12 }}>관련 이력 없음</div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>{['설비', '날짜', '불량 내용', '조치 내용'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, background: 'var(--bg-hover)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 11 }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {history.slice(0, 15).map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '9px 12px', color: 'var(--accent-blue)', fontWeight: 600, whiteSpace: 'nowrap' }}>#{String(r.equipment_no).padStart(2, '0')}</td>
                    <td style={{ padding: '9px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{String(r.maintenance_date).slice(0, 10)}</td>
                    <td style={{ padding: '9px 12px', color: 'var(--text-primary)', maxWidth: 200 }}>{r.defect_type}</td>
                    <td style={{ padding: '9px 12px', color: 'var(--text-secondary)', maxWidth: 260 }}>{r.action_detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {history.length > 15 && (
              <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 11, color: 'var(--text-muted)' }}>외 {history.length - 15}건 더 있음</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────

export default function ManualPage() {
  useRequireAuth()
  const [activeTab, setActiveTab]       = useState<'manual' | 'guide'>('manual')
  const [activeId, setActiveId]         = useState<string>('alarm')
  const [activeGuideId, setActiveGuideId] = useState<string>('param')
  const [allHistory, setAllHistory]     = useState<MaintenanceRow[]>([])
  const [guideLoading, setGuideLoading] = useState(false)

  const active      = MANUALS.find(m => m.id === activeId) || MANUALS[0]
  const activeGuide = GUIDES.find(g => g.id === activeGuideId) || GUIDES[0]
  const history     = filterByKeywords(allHistory, activeGuide.keywords)

  // 가이드 탭 전환 시 DB 한 번만 조회 (전체 가져온 후 클라이언트 필터)
  useEffect(() => {
    if (activeTab !== 'guide' || allHistory.length > 0) return
    setGuideLoading(true)
    supabase
      .from('maintenance')
      .select('equipment_no, maintenance_date, defect_type, action_detail')
      .not('defect_type', 'is', null)
      .neq('defect_type', '-')
      .neq('defect_type', '')
      .order('maintenance_date', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setAllHistory((data as MaintenanceRow[]) || [])
        setGuideLoading(false)
      })
  }, [activeTab])

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">

        {/* topbar */}
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Manual</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>후가공설비 관리 업무 표준 절차서</div>
          </div>
          <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 3 }}>
            <button onClick={() => setActiveTab('manual')} className={activeTab === 'manual' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}>📋 업무 매뉴얼</button>
            <button onClick={() => setActiveTab('guide')}  className={activeTab === 'guide'  ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}>🔧 불량조치 가이드</button>
          </div>
        </div>

        <div className="content-area">

          {/* ── 불량조치 가이드 탭 ── */}
          {activeTab === 'guide' && (
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>

              {/* 좌측 카테고리 */}
              <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'sticky', top: 80, alignSelf: 'flex-start' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 1 }}>조치 유형</div>
                {GUIDES.map((g, i) => (
                  <button key={g.id} onClick={() => setActiveGuideId(g.id)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '13px 16px', border: 'none',
                    background: activeGuideId === g.id ? g.dimColor : 'transparent',
                    borderLeft: `3px solid ${activeGuideId === g.id ? g.color : 'transparent'}`,
                    color: activeGuideId === g.id ? g.color : 'var(--text-secondary)',
                    fontSize: 12, fontWeight: activeGuideId === g.id ? 700 : 400,
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    borderBottom: i < GUIDES.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <span style={{ fontSize: 15 }}>{g.icon}</span>
                    <span>{g.title}</span>
                  </button>
                ))}
              </div>

              {/* 우측 상세 */}
              <GuideDetail guide={activeGuide} history={history} loading={guideLoading} />
            </div>
          )}

          {/* ── 업무 매뉴얼 탭 ── */}
          {activeTab === 'manual' && (
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>

              {/* 좌측 목록 */}
              <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'sticky', top: 80, alignSelf: 'flex-start' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 1 }}>목록</div>
                {MANUALS.map((m, i) => (
                  <button key={m.id} onClick={() => setActiveId(m.id)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px', border: 'none',
                    background: activeId === m.id ? 'var(--accent-blue-dim)' : 'transparent',
                    borderLeft: `3px solid ${activeId === m.id ? 'var(--accent-blue)' : 'transparent'}`,
                    color: activeId === m.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    fontSize: 12, fontWeight: activeId === m.id ? 600 : 400,
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    borderBottom: i < MANUALS.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                    onMouseEnter={e => { if (activeId !== m.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { if (activeId !== m.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <span style={{ fontSize: 16 }}>{m.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: activeId === m.id ? 600 : 400 }}>{m.title}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{m.category}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* 우측 상세 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* 헤더 */}
                <div className="card" style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 22 }}>{active.icon}</span>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{active.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{active.category}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 10 }}>{active.description}</div>
                </div>

                {/* 절차 */}
                <div className="card" style={{ padding: '20px 24px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>업무 방법</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {active.steps.map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: 14 }}>
                        <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{step.num}</div>
                        <div style={{ flex: 1, paddingTop: 4 }}>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7 }}>{step.text}</div>
                          {step.subSteps && (
                            <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--bg-hover)', borderRadius: 8, borderLeft: '2px solid var(--accent-blue)' }}>
                              {step.subSteps.map((sub, j) => (
                                <div key={j} style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, padding: '4px 0' }}>
                                  <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: '50%', background: 'var(--bg-surface)', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{j + 1}</span>
                                  <span>{sub}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 핵심 포인트 */}
                {active.tips && active.tips.length > 0 && (
                  <div className="card" style={{ padding: '18px 24px', background: 'var(--accent-amber-dim)', border: '1px solid var(--accent-amber)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 16 }}>💡</span>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-amber)' }}>핵심 포인트</div>
                    </div>
                    {active.tips.map((tip, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.7, display: 'flex', gap: 8 }}>
                        <span style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>·</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 하단 네비게이션 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
                  {(() => {
                    const idx  = MANUALS.findIndex(m => m.id === activeId)
                    const prev = idx > 0 ? MANUALS[idx - 1] : null
                    const next = idx < MANUALS.length - 1 ? MANUALS[idx + 1] : null
                    return (
                      <>
                        {prev ? (
                          <button className="btn btn-ghost" onClick={() => setActiveId(prev.id)} style={{ flex: 1, justifyContent: 'flex-start' }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>← 이전</span>
                            <span style={{ marginLeft: 8, fontSize: 12 }}>{prev.icon} {prev.title}</span>
                          </button>
                        ) : <div style={{ flex: 1 }} />}
                        {next ? (
                          <button className="btn btn-ghost" onClick={() => setActiveId(next.id)} style={{ flex: 1, justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: 12 }}>{next.icon} {next.title}</span>
                            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>다음 →</span>
                          </button>
                        ) : <div style={{ flex: 1 }} />}
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
