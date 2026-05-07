// =============================================
// 설비별 홀더 구조 정의
// 엑셀 조건표 기준 정확한 홀더/카테고리 매핑
// =============================================

export interface HolderGroup {
  category: string      // 카테고리명 (LH, RH, 홀더, 브라켓 LH 등)
  holders: string[]     // 해당 카테고리의 홀더 번호 목록
}

export interface EquipmentStructure {
  name: string                    // 설비명 (참고용)
  groups: HolderGroup[]           // 카테고리별 홀더 그룹
}

// 설비번호 -> 구조 매핑
// (LH/RH 또는 다중 카테고리 구조를 가진 설비만 정의)
// 정의되지 않은 설비는 기본값(단순 홀더 1~N) 사용
export const EQUIPMENT_HOLDER_STRUCTURE: Record<number, EquipmentStructure> = {
  3: {
    name: 'SP3 RR BPR LWR 융착기',
    groups: [
      { category: 'LH', holders: ['1', '2', '3', '4', '5', '6'] },
      { category: 'RH', holders: ['1', '2', '3'] },
    ],
  },
  4: {
    name: 'SP3 GTL RR LWR CONRAD NO1 복합기',
    groups: [
      { category: 'LH', holders: ['1-1', '2-1', '2-2'] },
      { category: 'RH', holders: ['1-1', '2-1'] },
      { category: '홀더', holders: ['2', '3'] },
      { category: '센터브라켓', holders: ['1-1', '1-2', '1-3', '1-4', '2-1'] },
    ],
  },
  5: {
    name: 'OV RR STD LWR 복합기',
    groups: [
      { category: '라이더브라켓 RH', holders: ['RH'] },
      { category: '홀더', holders: ['4', '3', '2', '1'] },
      { category: '라이더브라켓 LH', holders: ['LH'] },
    ],
  },
  7: {
    name: 'OV1 GT GTL RR BPR UPR COVER RADAR & 펀칭 융착기',
    groups: [
      { category: '라이더브라켓 RH', holders: ['RH'] },
      { category: '홀더', holders: ['5', '1', '4', '6'] },
      { category: '라이더브라켓 LH', holders: ['LH'] },
    ],
  },
  13: {
    name: 'NQ5 PE RR BPR UPR PUNCHING & WELDING M/C',
    groups: [
      { category: '브라켓', holders: ['L 1,5', 'L 2,6', 'L 3,7', 'L 4', 'R 1,5', 'R 2,6', 'LH1', 'RH2'] },
      { category: '홀더', holders: ['5', '6'] },
    ],
  },
  14: {
    name: 'NQ5 PE RR LWR_X-LINE_UPT',
    groups: [
      { category: '홀더(설비)', holders: ['1', '2', '3', '4'] },
      { category: "BRK'T", holders: ['LH', 'RH'] },
    ],
  },
  15: {
    name: 'NQ5 PE RR LWR_X-LINE_LPT',
    groups: [
      { category: '홀더(설비)', holders: ['1', '2', '3', '4'] },
      { category: "BRK'T", holders: ['LH', 'RH'] },
    ],
  },
  23: {
    name: 'SP3 STD FRT BPR UPR COVER HL MTG BRKT 융착기',
    groups: [
      { category: 'LH', holders: ['1-1', '1-2', '1-3', '1-4', '1-5', '2-1', '2-2', '2-3', '2-4', '2-5'] },
      { category: 'RH', holders: ['1-1', '1-2', '1-3', '1-4', '1-5', '2-1', '2-2', '2-3', '2-4', '2-5'] },
    ],
  },
  24: {
    name: 'SP3 GTL FRT BPR UPR COVER HL MTG BRKT 융착기',
    groups: [
      { category: 'LH', holders: ['1-1', '1-2', '1-3', '1-4', '1-5', '2-1', '2-2', '2-3', '2-4', '2-5'] },
      { category: 'RH', holders: ['1-1', '1-2', '1-3', '1-4', '1-5', '2-1', '2-2', '2-3', '2-4', '2-5'] },
    ],
  },
  25: {
    name: "NQ5 PE FRT BPR H/L BRK'T WELDING M/C",
    groups: [
      { category: '브라켓', holders: ['1', '4', '7', '8', '3', '6', '2', '5', '9'] },
    ],
  },
  29: {
    name: 'OV1 STD FR BPR UPR 펀칭융착기',
    groups: [
      { category: '라이더브라켓 RH', holders: ['RH'] },
      { category: '홀더', holders: ['6', '4', '1', '5'] },
      { category: '라이더브라켓 LH', holders: ['LH'] },
    ],
  },
  30: {
    name: 'OV1 GTL/GT FR BPR UPR SIDE BRKT 융착기',
    groups: [
      { category: '브라켓 LH', holders: ['1', '2', '3', '4', '5', '6'] },
      { category: '브라켓 RH', holders: ['1', '2', '3', '4', '5', '6'] },
    ],
  },
  31: {
    name: 'OV1 STD FR BPR UPR SIDE BRKT 융착기',
    groups: [
      { category: '브라켓 LH', holders: ['1', '2', '3', '4', '5', '6'] },
      { category: '브라켓 RH', holders: ['1', '2', '3', '4', '5', '6'] },
    ],
  },
}

// holder_no 와 holder_category 를 합쳐서 unique key 생성
// DB 저장 시 holder_no 필드에 "카테고리|번호" 형식으로 저장
export function makeHolderKey(category: string, holderNo: string): string {
  return `${category}|${holderNo}`
}

// 저장된 holder_no 에서 카테고리와 번호 분리
export function parseHolderKey(holderKey: string | null | undefined): { category: string; holderNo: string } {
  if (!holderKey) return { category: '', holderNo: '' }
  const idx = holderKey.indexOf('|')
  if (idx === -1) {
    // 구버전 호환: 카테고리 없이 번호만 저장된 경우
    return { category: '홀더', holderNo: holderKey }
  }
  return { category: holderKey.slice(0, idx), holderNo: holderKey.slice(idx + 1) }
}

// 설비번호로 구조 가져오기 (없으면 null 반환 - 기본 표시 사용)
export function getEquipmentStructure(equipmentNo: number): EquipmentStructure | null {
  return EQUIPMENT_HOLDER_STRUCTURE[equipmentNo] || null
}

// 설비번호로 평탄화된 홀더 키 목록 생성 (테이블 컬럼 순서대로)
export function getFlatHolderKeys(equipmentNo: number): string[] {
  const structure = getEquipmentStructure(equipmentNo)
  if (!structure) return []
  const keys: string[] = []
  structure.groups.forEach(g => {
    g.holders.forEach(h => keys.push(makeHolderKey(g.category, h)))
  })
  return keys
}
