-- =============================================
-- 후가공설비 관리 시스템 - Supabase DB 스키마
-- Supabase SQL Editor에 그대로 붙여넣기 하세요
-- =============================================

-- 1. 설비 마스터 테이블
CREATE TABLE equipment (
  id SERIAL PRIMARY KEY,
  no INTEGER UNIQUE NOT NULL,
  type TEXT NOT NULL,           -- 복합기/융착기/펀칭기/지그
  rr_frt TEXT NOT NULL,         -- RR/FRT
  model TEXT NOT NULL,          -- OV1/SP2/SP3/NQ5
  location TEXT NOT NULL,       -- 조립1라인/조립2라인/2층 FRT라인 등
  name TEXT NOT NULL,           -- 설비명
  vendor TEXT NOT NULL,         -- 부영ENG/대원SD
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 알람 관리 테이블
CREATE TABLE alarm (
  id SERIAL PRIMARY KEY,
  equipment_no INTEGER REFERENCES equipment(no),
  date DATE NOT NULL,
  punch_alarm INTEGER DEFAULT 0,   -- 펀칭불량 건수
  weld_alarm INTEGER DEFAULT 0,    -- 융착불량 건수
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 찍힘 관리 테이블
CREATE TABLE scratch (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  time_of_day TEXT NOT NULL,        -- 오전/오후
  model TEXT NOT NULL,              -- SP3/OV1/NQ5/SP2
  category TEXT NOT NULL,           -- FRNT/STD, FRNT/GTL 등
  scratch_location TEXT NOT NULL,   -- 찍힘 부위 (H/L LH 등)
  equipment_no INTEGER REFERENCES equipment(no),
  jig_status TEXT DEFAULT '양호',   -- 양호/불량
  equipment_issue TEXT DEFAULT '해당없음', -- 해당없음/조치필요
  action TEXT DEFAULT '해당없음',   -- 해당없음/조치내역
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 아이마킹 관리 테이블
CREATE TABLE imarking (
  id SERIAL PRIMARY KEY,
  equipment_no INTEGER REFERENCES equipment(no),
  change_date DATE NOT NULL,
  category TEXT NOT NULL,           -- 펀칭/융착/Air
  mode TEXT NOT NULL,               -- Time/Energy/Air 등
  unit TEXT NOT NULL,               -- AMP[%]/Energy[W]/[sec]/bar/kgf/cm2
  value NUMERIC,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 조건표 테이블
CREATE TABLE condition_table (
  id SERIAL PRIMARY KEY,
  equipment_no INTEGER REFERENCES equipment(no),
  change_date DATE NOT NULL,
  category TEXT NOT NULL,           -- 펀칭/융착/Air
  mode TEXT NOT NULL,
  unit TEXT NOT NULL,
  value NUMERIC,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 정비이력 테이블
CREATE TABLE maintenance (
  id SERIAL PRIMARY KEY,
  equipment_no INTEGER REFERENCES equipment(no),
  maintenance_date TIMESTAMPTZ NOT NULL,
  shift TEXT NOT NULL,              -- 주/야
  worker TEXT NOT NULL,             -- 작업자
  alarm_content TEXT,               -- 알람내용
  defect_type TEXT,                 -- 불량 유형
  action_detail TEXT,               -- 조치 내역
  pull_force TEXT,                  -- 탈거력
  appearance TEXT,                  -- 외관굴곡
  replaced_parts TEXT,              -- 교체 부품
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 자재 관리 테이블
CREATE TABLE materials (
  id SERIAL PRIMARY KEY,
  equipment_no INTEGER REFERENCES equipment(no),
  item_no INTEGER NOT NULL,
  item_name TEXT NOT NULL,          -- 품목명
  spec TEXT,                        -- 규격
  maker TEXT,                       -- MAKER
  unit TEXT DEFAULT 'EA',           -- 단위
  quantity INTEGER DEFAULT 0,       -- 수량
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 설비 기초 데이터 입력
-- =============================================
INSERT INTO equipment (no, type, rr_frt, model, location, name, vendor) VALUES
(1,'복합기','RR','OV1','조립1라인','OV1 RR BPR UPR (STD) 펀칭&융착기','부영ENG'),
(2,'복합기','RR','SP2','조립1라인','SP2 PE RR BPR PUNCH G & WELD''G M/C (LWR)','대원SD'),
(3,'융착기','RR','SP3','조립1라인','SP3 RR BPR LWR 융착기','부영ENG'),
(4,'복합기','RR','SP3','조립1라인','SP3 GTL RR BPR CON RAD, NO1 BRK P&W M/C','부영ENG'),
(5,'복합기','RR','OV1','조립1라인','OV1 STD RR BPR LWR 펀칭융착기','부영ENG'),
(6,'펀칭기','RR','OV1','조립1라인','OV1 RR BPR L/PLATE PUNCH''G M/C','대원SD'),
(7,'복합기','RR','OV1','조립1라인','OV1 GT GTL RR BPR UPR COVER RADAR & 펀칭 융착기','부영ENG'),
(8,'복합기','RR','OV1','조립1라인','OV1 GT GTL RR BPR LWR 펀칭&융착기','부영ENG'),
(9,'복합기','RR','SP2','조립1라인','SP2 PE RR BPR(OPT) PUNCH''G & WELD''G M/C (UPR)','대원SD'),
(10,'복합기','RR','OV1','조립1라인','OV1 GT RR BPR LWR PDW 펀칭&융착기','부영ENG'),
(11,'복합기','RR','SP3','조립1라인','SP3 RR BPR LWR STD/OPT 펀칭융착기','부영ENG'),
(12,'펀칭기','RR','SP3','조립1라인','SP3 RR BPR LWR L/PLATE HOLE 펀칭기','부영ENG'),
(13,'복합기','RR','NQ5','조립2라인','NQ5 PE RR BPR UPR PUNCH''G & WELD''G M/C','대원SD'),
(14,'복합기','RR','NQ5','조립2라인','NQ5 PE RR BPR X-LINE UPR PUNCH''G & WELD''G M/C','대원SD'),
(15,'복합기','RR','NQ5','조립2라인','NQ5 PE RR BPR X-LINE LWR PUNCH''G & WELD''G M/C','대원SD'),
(16,'복합기','RR','NQ5','조립2라인','NQ5 PE RR BPR STD UPR PUNCH''G & WELD''G M/C','대원SD'),
(17,'복합기','RR','NQ5','조립2라인','NQ5 PE RR BPR STD LWR PUNCH''G & WELD''G M/C','대원SD'),
(18,'복합기','FRT','NQ5','2층 FRT라인','NQ5 PE FRT BPR PUNCH''G & WELD''G M/C 2호기','대원SD'),
(19,'복합기','FRT','NQ5','2층 FRT라인','NQ5 PE FRT BPR PUNCH''G & WELD''G M/C 1호기','대원SD'),
(20,'복합기','FRT','SP2','2층 FRT라인','SP2 PE FRT BPR STD PUNCH G & WELD''G M/C','대원SD'),
(21,'복합기','FRT','SP3','2층 FRT라인','SP3 FRT BPR LWR PDW (STD) 펀칭&융착기','부영ENG'),
(22,'복합기','FRT','SP3','2층 FRT라인','SP3 GTL FRT UPR / LWR 펀칭&융착기','부영ENG'),
(23,'융착기','FRT','SP3','2층 FRT라인','SP3 STD FRT BPR UPR COVER HL MTG BRKT 융착기','부영ENG'),
(24,'융착기','FRT','SP3','2층 FRT라인','SP3 GTL FRT BPR UPR COVER HL MTG BRKT 융착기','부영ENG'),
(25,'융착기','FRT','NQ5','2층 FRT라인','NQ5 PE FRT BPR H/L BRK''T WELD''G M/C','대원SD'),
(26,'복합기','FRT','OV1','2층 FRT라인','OV1 FRT BPR LWR GTL/GT 펀칭 & 융착기','부영ENG'),
(27,'복합기','FRT','OV1','2층 FRT라인','OV1 GTL FRT BPR UPR 펀칭융착기','부영ENG'),
(28,'복합기','FRT','OV1','2층 FRT라인','OV1 FRT BPR LWR_STD P&W M/C','부영ENG'),
(29,'복합기','FRT','OV1','2층 FRT라인','OV1 STD FR BPR UPR 펀칭융착기','부영ENG'),
(30,'융착기','FRT','OV1','2층 FRT라인','OV1 GTL/GT FR BPR UPR SIDE BRKT 융착기','부영ENG'),
(31,'융착기','FRT','OV1','2층 FRT라인','OV1 STD FR BPR UPR SIDE BRKT 융착기','부영ENG'),
(32,'지그','FRT','SP3','1층 FRT라인','SP3 STD FRNT 지그','부영ENG'),
(33,'지그','FRT','SP3','1층 FRT라인','SP3 GTL FRNT 지그','부영ENG'),
(34,'지그','FRT','NQ5','1층 FRT라인','NQ5 PE FRT지그','부영ENG');

-- RLS 비활성화 (공용 로그인이므로 단순하게)
ALTER TABLE equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE alarm DISABLE ROW LEVEL SECURITY;
ALTER TABLE scratch DISABLE ROW LEVEL SECURITY;
ALTER TABLE imarking DISABLE ROW LEVEL SECURITY;
ALTER TABLE condition_table DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance DISABLE ROW LEVEL SECURITY;
ALTER TABLE materials DISABLE ROW LEVEL SECURITY;
