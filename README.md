# 후가공설비 관리 시스템 - 배포 가이드

## 📁 프로젝트 구조
```
bumper-dashboard/
├── app/
│   ├── login/         - 로그인 페이지
│   ├── dashboard/     - 메인 대시보드
│   ├── equipment/     - 설비 목록
│   ├── alarm/         - 알람 관리
│   ├── scratch/       - 찍힘 관리
│   ├── imarking/      - 아이마킹 관리
│   ├── condition/     - 조건표
│   ├── maintenance/   - 정비이력
│   └── materials/     - 자재 관리
├── components/
│   └── Sidebar.tsx
├── lib/
│   ├── supabase.ts
│   └── auth.tsx
└── supabase_schema.sql
```

---

## 🚀 배포 순서 (총 15분)

### STEP 1: Supabase 설정 (5분)

1. https://supabase.com 접속 → **Start your project** 클릭
2. GitHub 계정으로 가입/로그인
3. **New project** 클릭
   - Name: `bumper-dashboard`
   - Database Password: 기억할 비밀번호 입력
   - Region: **Northeast Asia (Tokyo)** 선택 (한국과 가장 가까움)
4. 프로젝트 생성 후 (약 1분 대기)
5. 좌측 메뉴 **SQL Editor** 클릭
6. `supabase_schema.sql` 파일 내용 전체 복사 → 붙여넣기 → **Run** 클릭
7. **Project Settings → API** 에서 두 가지 값 복사:
   - `Project URL` → NEXT_PUBLIC_SUPABASE_URL
   - `anon public` key → NEXT_PUBLIC_SUPABASE_ANON_KEY

---

### STEP 2: GitHub 업로드 (5분)

1. https://github.com 가입/로그인
2. **New repository** → 이름: `bumper-dashboard` → Create
3. 이 폴더 전체를 GitHub에 업로드 (Upload files 버튼)

---

### STEP 3: Vercel 배포 (5분)

1. https://vercel.com 접속 → GitHub 계정으로 로그인
2. **New Project** → GitHub에서 `bumper-dashboard` 선택 → Import
3. **Environment Variables** 섹션에서:
   - `NEXT_PUBLIC_SUPABASE_URL` = Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase anon key
4. **Deploy** 클릭 → 약 2분 후 완료
5. 생성된 URL (예: `bumper-dashboard.vercel.app`) 로 접속!

---

## 🔐 로그인 정보
- ID: 103613
- PW: 103613

---

## 📝 기능 목록
- ✅ 로그인/로그아웃
- ✅ 대시보드 (설비 현황, 찍힘 현황 요약)
- ✅ 설비 목록 조회 (필터링)
- ✅ 알람 관리 (등록/수정/삭제)
- ✅ 찍힘 관리 (등록/수정/삭제)
- ✅ 아이마킹 관리 (등록/수정/삭제)
- ✅ 조건표 관리 (등록/수정/삭제)
- ✅ 정비이력 관리 (등록/수정/삭제)
- ✅ 자재 관리 (등록/수정/삭제)
