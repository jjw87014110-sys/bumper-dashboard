'use client'
// ============================================
// 재사용 가능한 메트릭 카드 컴포넌트
// 대시보드, 워크타임, 인스펙션 등에서 통일된 KPI 표시
// ============================================

export interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  icon?: string
  color?: string
  warning?: boolean
  warningText?: string
  trend?: 'up' | 'down' | 'flat'
  trendValue?: string
}

export default function MetricCard({
  label, value, unit, icon, color = 'var(--accent-blue)',
  warning, warningText, trend, trendValue
}: MetricCardProps) {
  return (
    <div
      className="card kpi-card"
      style={{
        padding: '16px 18px',
        ['--accent-color' as any]: color,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
        {icon && <span style={{ fontSize: 20, opacity: 0.8 }}>{icon}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 28, fontWeight: 700, color }}>{value}</span>
        {unit && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{unit}</span>}
        {trend && trendValue && (
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: trend === 'up' ? 'var(--accent-red)' : trend === 'down' ? 'var(--accent-green)' : 'var(--text-muted)',
            marginLeft: 'auto',
          }}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </span>
        )}
        {warning && (
          <span style={{
            fontSize: 10,
            color: 'var(--accent-red)',
            marginLeft: 'auto',
            fontWeight: 700,
          }}>● {warningText || '주의'}</span>
        )}
      </div>
    </div>
  )
}

// 상태 배지 컴포넌트
export interface StatusBadgeProps {
  status: 'danger' | 'warning' | 'success' | 'info' | 'neutral'
  label: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const colors = {
    danger: { c: 'var(--accent-red)', bg: 'var(--accent-red-dim)' },
    warning: { c: 'var(--accent-amber)', bg: 'var(--accent-amber-dim)' },
    success: { c: 'var(--accent-green)', bg: 'var(--accent-green-dim, rgba(34,197,94,0.1))' },
    info: { c: 'var(--accent-blue)', bg: 'var(--accent-blue-dim)' },
    neutral: { c: 'var(--text-muted)', bg: 'var(--bg-hover)' },
  }
  const s = colors[status]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: size === 'sm' ? 10 : 11,
      fontWeight: 700,
      color: s.c,
      background: s.bg,
      padding: size === 'sm' ? '2px 6px' : '3px 8px',
      borderRadius: 5,
      border: `1px solid ${s.c}`,
    }}>
      ● {label}
    </span>
  )
}
