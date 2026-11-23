# 프론트엔드 핸드오프 (Team 2)

최종 갱신: feat/ui-gap-fill 브랜치

이 문서는 **프론트엔드(Team 2)가 무엇을 만들었고, 다른 팀에서 무엇을 받아야 하는지**를 정리한 것입니다.
화면 코드는 `src/components/dashboard/` 아래에만 있으며, 아래 목록 외의 디렉터리는 수정하지 않았습니다.

## 1. 화면 구조 (탭 8개)

| 탭 | 컴포넌트 | 역할 |
| --- | --- | --- |
| 회사 정보 | `company-profile-form.tsx` | 지역·규모·과세연도·산출세액·감면률·적용 공제 입력 (localStorage 저장) |
| 엑셀 업로드 | `excel-upload-panel.tsx` | 로컬 파싱 → `/api/map-columns`로 **열 이름만** 전송 → 매핑 확정 |
| 직원 명부 | `employee-roster.tsx` | 판정 결과 표, 성명/사번 검색, 분류 필터, NEEDS_REVIEW → 예규 Drawer |
| 산출 결과 | `credit-result-panel.tsx` | 엔진 결과 표시 + 규칙 테이블 Modal |
| 시뮬레이션 | `simulation-panel.tsx` | 채용/퇴사 인원 증감에 따른 재계산 결과 비교 |
| 법령·중복 점검 | `compliance-panel.tsx` | 중복 혜택 체크리스트 + 감면 비교 + 특수 케이스 예규 검색 |
| 명부 변화 | `roster-diff-panel.tsx` | 직전 명부와 비교, 공제액 차이 |
| 사후관리 | `post-care-panel.tsx` | 감원 시 손실 추정, 12/24개월 확인 타임라인 |

공통 요소: `ui-bits.tsx`(금액/인원 포맷, `▲ 법령 원문 검수 필요` 배너), `app-error-boundary.tsx`(앱 전체 오류 경계),
`use-precedents.ts`(예규 검색 상태 훅), `precedent-result.tsx`(결과 표시 공용), `mapping-validation.ts`(열 매핑 검증 순수 함수).

## 2. 프론트가 의존하는 인터페이스 (수정 금지, 시그니처만 유지해 주세요)

```ts
// src/lib/rules/calculateCredits.ts (Track A / Team 3)
calculateCredits(company, employees, rule): CalculationResult
simulateCredits(company, employees, rule, simulation): SimulationResponse
buildDecreaseImpacts(result, rule): DecreaseImpactRow[]
buildCheckTimeline(employees, year): CheckTimelineItem[]

// src/lib/rules/postCare.ts
buildRosterDiff(previous | null, current): RosterDiffItem[]

// src/lib/excel.ts
parseEmployeeExcel(file): Promise<ParsedSheet>
buildEmployeesFromRows(rows, mapping): { employees, warnings }

// src/lib/storage.ts
loadCompanyProfile / saveCompanyProfile / loadEmployees / saveEmployees
loadPreviousRoster / savePreviousRoster / clearStorage

// src/lib/api-client.ts (Team 4 API 호출)
mapColumns(headers): Promise<{ source, mapping, confidence }>
searchPrecedents(request): Promise<RagPrecedentResponse>
```

`calculateCredits` 가 반환하는 `isRuleVerified`(= `rule.isVerified`)가 `false` 이면 모든 화면에
`▲ 법령 원문 검수 필요` 가 노출됩니다. 규칙 테이블에 `isVerified: true` 를 넣기 전에는 금액을 신고 자료로 쓰면 안 됩니다.

## 3. 다른 팀에 요청하는 것

1. **Team 1 / Track A — 규칙 테이블 및 표준 시나리오**
   - 표준 시나리오(작년말 13명 → 올해말 21명, 순증 8명 = 청년 6 + 일반 2)의 기대값
     **50,000,000 / 114,000,000 / 122,000,000 (합계 286,000,000)** 이 나오도록
     `src/data/defaultRules.ts` ・ 엔진을 확정해 주세요.
     현재 임시 규칙표(청년 14.5M/14.5M/7.25M, 일반 7M/7M/3.5M)로는 101M / 101M / 50.5M (252.5M) 이 나옵니다.
   - 과세연도 2024·2025, 수도권, 중견기업 조합의 규칙표도 필요합니다.
     해당 조합이 없으면 화면은 기본 규칙으로 계산하고 **“선택한 조건에 맞는 규칙 테이블이 없습니다”** 경고를 표시합니다.
   - `src/data/mockEmployees27.ts` 는 27명이라 18명 → 19명(순증 1)입니다. 13 → 21 시나리오용 명부가 별도로 필요합니다.

2. **Team 1 — `ComplianceAndPostCare` 생산자**
   - `src/schemas/index.ts` 에 타입만 있고 값을 만드는 코드가 없습니다.
   - `compliance-panel.tsx` 는 `compliance?: ComplianceAndPostCare` prop 을 받을 준비가 되어 있습니다.
     (없으면 `rule.smeReductionVerified` / `smeReductionCapBase` / `smeReductionPenaltyPerWorker` 기반 체크리스트로 대체)
   - 특히 `duplicateWarnings`(중복 적용 배제 검토), `minimumTaxNotice`(최저한세) 값을 주면 그대로 표시됩니다.

3. **공통 — `next.config.ts` 에 개발 오리진 추가**
   - `127.0.0.1:3000` 으로 접속하면 Next dev 가 `/_next/hmr` 을 막아 **화면이 하이드레이트되지 않습니다**(버튼 무반응).
   - `allowedDevOrigins: ['127.0.0.1']` 를 추가하면 해결됩니다. (localhost 로 접속하면 현재도 정상)

4. **Team 4 — API 계약 유지**
   - `/api/map-columns`: `{ source, mapping, confidence }` (source 는 `AI` | `KEYWORD_FALLBACK`)
   - `/api/rag/precedents`: `{ exceptionReason, precedents[] }` (최대 3건, relevanceScore 0~1)
   - 프론트는 Zod 로 응답을 검증하며, 형식이 다르면 “응답 형식이 예상과 다릅니다” 오류를 표시합니다.

## 4. 프론트 정책 체크리스트 (수정 시 확인)

- 세액·자격 계산은 **엔진 호출 결과만** 표시합니다. 컴포넌트에서 금액을 계산하지 않습니다.
- 금액을 보여주는 모든 화면에 `▲ 법령 원문 검수 필요`(조건부)가 있어야 합니다.
- “확정/보장/추천/절세” 같은 단정·권유 표현을 쓰지 않습니다. (판단은 세무사)
- 직원 개인정보·엑셀 원본은 서버로 보내지 않습니다. (열 이름·특이사항만 전송)
- 엑셀 업로드 후에는 `localStorage` 의 `gongje-radar:employees:v1` 에만 저장합니다.

## 5. 로컬 확인 방법

```bash
npm run dev          # http://localhost:3000  (127.0.0.1 로 열면 하이드레이션 안 됨)
npm run typecheck
npm run lint
npm run test         # 엔진 스모크 15건 + 매핑 검증 8건
```

데모: `http://localhost:3000/?demo=1&tab=result` (27명 샘플 + 예규 Drawer 자동 열림)

수동 확인 시나리오:

1. `?demo=1&tab=upload` → .xlsx 업로드 → 매핑 표 확인 → 명부 생성 → 명부 탭 판정 확인
2. 명부에서 “검토 필요” 행의 **예규 검색** → Drawer 에 예규 요약 표시
3. 산출 결과 → **규칙 테이블 보기** → 단가표/근거 법령/검수 상태 확인
4. 엑셀을 한 번 더 업로드 → **명부 변화** 탭에서 변동·공제액 차이 확인
5. 회사 정보에서 과세연도 2024 선택 → 상단에 “규칙 테이블 없음” 경고 확인