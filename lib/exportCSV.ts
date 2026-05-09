/**
 * 데이터를 CSV 파일로 다운로드
 * (브라우저 환경에서만 동작)
 */
export function exportToCSV(filename: string, headers: string[], rows: string[][]) {
  // BOM 추가 (엑셀에서 한글 깨짐 방지)
  const BOM = '\uFEFF'
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      // 쉼표, 줄바꿈, 따옴표 포함 시 따옴표로 감싸기
      const s = String(cell ?? '')
      if (s.includes(',') || s.includes('\n') || s.includes('"')) {
        return '"' + s.replace(/"/g, '""') + '"'
      }
      return s
    }).join(','))
  ].join('\n')

  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * 알람 데이터 Export
 */
export function exportAlarmData(equipmentName: string, data: any[]) {
  const headers = ['일자', '홀더', '펀칭불량', '융착불량', '비고']
  const rows = data.map(r => [
    r.date || '',
    r.holder_no || '',
    String(r.punch_alarm || 0),
    String(r.weld_alarm || 0),
    r.note || '',
  ])
  const safeName = equipmentName.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 50)
  exportToCSV(`알람_${safeName}_${new Date().toISOString().slice(0,10)}.csv`, headers, rows)
}

/**
 * 조건표 데이터 Export
 */
export function exportConditionData(equipmentName: string, data: any[]) {
  const headers = ['변경일자', '구분', '모드', '단위', '홀더', '값', '비고']
  const rows = data.map(r => [
    (r.change_date || '').slice(0, 10),
    r.category || '',
    r.mode || '',
    r.unit || '',
    r.holder_no || '',
    String(r.value ?? ''),
    r.note || '',
  ])
  const safeName = equipmentName.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 50)
  exportToCSV(`조건표_${safeName}_${new Date().toISOString().slice(0,10)}.csv`, headers, rows)
}

/**
 * 찍힘 데이터 Export
 */
export function exportScratchData(equipmentName: string, data: any[]) {
  const headers = ['일자', '오전/오후', '차종', '구분', '찍힘부위', '지그상태', '설비문제', '조치', '비고']
  const rows = data.map(r => [
    r.date || '',
    r.time_of_day || '',
    r.model || '',
    r.category || '',
    r.scratch_location || '',
    r.jig_status || '',
    r.equipment_issue || '',
    r.action || '',
    r.note || '',
  ])
  const safeName = equipmentName.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 50)
  exportToCSV(`찍힘_${safeName}_${new Date().toISOString().slice(0,10)}.csv`, headers, rows)
}

/**
 * 정비이력 Export
 */
export function exportMaintenanceData(equipmentName: string, data: any[]) {
  const headers = ['정비일시', '주/야', '작업자', '알람내용', '불량유형', '조치내역', '교체부품', '비고']
  const rows = data.map(r => [
    String(r.maintenance_date || '').slice(0, 16),
    r.shift || '',
    r.worker || '',
    r.alarm_content || '',
    r.defect_type || '',
    r.action_detail || '',
    r.replaced_parts || '',
    r.note || '',
  ])
  const safeName = equipmentName.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 50)
  exportToCSV(`정비이력_${safeName}_${new Date().toISOString().slice(0,10)}.csv`, headers, rows)
}

/**
 * 자재 Export
 */
export function exportMaterialsData(equipmentName: string, data: any[]) {
  const headers = ['품번', '품명', '규격', '제조사', '단위', '수량', '비고']
  const rows = data.map(r => [
    r.item_no || '',
    r.item_name || '',
    r.spec || '',
    r.maker || '',
    r.unit || '',
    String(r.quantity ?? ''),
    r.note || '',
  ])
  const safeName = equipmentName.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 50)
  exportToCSV(`자재_${safeName}_${new Date().toISOString().slice(0,10)}.csv`, headers, rows)
}

/**
 * 인사정보 Export
 */
export function exportStaffData(data: any[]) {
  const headers = ['이름', '부서', '사번', '그룹웨어ID', '이메일', 'MS ID', '직급', '연차']
  const rows = data.map(r => [
    r.name || '',
    r.department || '',
    r.employee_no || '',
    r.groupware_id || '',
    r.email || '',
    r.microsoft_id || '',
    r.position || '',
    String(r.total_leave ?? ''),
  ])
  exportToCSV(`인사정보_${new Date().toISOString().slice(0,10)}.csv`, headers, rows)
}
