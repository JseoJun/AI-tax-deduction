import type { CompanyProfile, EmployeeRecord } from '@/schemas';

/**
 * ⚠ 데모용 가상 데이터 (Mock Data)
 * 실제 고객사 직원 정보가 아니며, 개인정보를 포함하지 않습니다.
 * 과세연도 2026년 기준으로 이전 연도(2025) / 당해 연도(2026) 입·퇴사 케이스가 섞여 있습니다.
 */
export const defaultCompanyProfile: CompanyProfile = {
  id: 'company-demo-001',
  name: '(주)공제레이더',
  region: 'non_capital',
  size: 'sme',
  industry: '제조업',
  targetYear: 2026,
  calculatedTax: 120_000_000,
  smeReductionRate: 0.07,
  appliedCredits: ['sme_special'],
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const mockEmployees27: EmployeeRecord[] = [
  // ── 재직 중 / 일반 정규직 ─────────────────────────────
  { employeeId: 'EMP-001', name: '김민준', birthDate: '1979-04-18', hireDate: '2018-01-02', resignDate: null, contractType: 'regular', isExecutive: false, militaryMonths: 0, specialFlag: 'NONE' },
  { employeeId: 'EMP-002', name: '이서연', birthDate: '1998-09-07', hireDate: '2023-03-02', resignDate: null, contractType: 'regular', isExecutive: false, militaryMonths: 0, specialFlag: 'NONE' },
  { employeeId: 'EMP-003', name: '박도윤', birthDate: '1994-12-11', hireDate: '2021-06-14', resignDate: null, contractType: 'regular', isExecutive: false, militaryMonths: 21, specialFlag: 'NONE' },
  { employeeId: 'EMP-004', name: '최지우', birthDate: '2001-02-25', hireDate: '2024-01-08', resignDate: null, contractType: 'regular', isExecutive: false, militaryMonths: 0, specialFlag: 'NONE' },
  { employeeId: 'EMP-005', name: '정하준', birthDate: '1979-07-30', hireDate: '2015-04-01', resignDate: null, contractType: 'regular', isExecutive: true, militaryMonths: 0, specialFlag: 'NONE' },
  { employeeId: 'EMP-007', name: '윤예준', birthDate: '1986-05-19', hireDate: '2019-09-02', resignDate: null, contractType: 'over_1y', isExecutive: false, militaryMonths: 0, specialFlag: 'NONE' },
  { employeeId: 'EMP-008', name: '임채원', birthDate: '1993-08-22', hireDate: '2022-02-14', resignDate: null, contractType: 'regular', isExecutive: false, militaryMonths: 0, specialFlag: 'NONE' },
  { employeeId: 'EMP-009', name: '한지호', birthDate: '1997-01-30', hireDate: '2024-07-01', resignDate: null, contractType: 'over_1y', isExecutive: false, militaryMonths: 0, specialFlag: 'NONE' },
  { employeeId: 'EMP-010', name: '오서준', birthDate: '1976-10-09', hireDate: '2016-11-21', resignDate: null, contractType: 'regular', isExecutive: false, militaryMonths: 24, specialFlag: 'NONE' },
  { employeeId: 'EMP-011', name: '서다은', birthDate: '1995-06-16', hireDate: '2023-09-11', resignDate: null, contractType: 'regular', isExecutive: false, militaryMonths: 0, specialFlag: 'NONE' },
  { employeeId: 'EMP-014', name: '황도현', birthDate: '1980-09-08', hireDate: '2017-03-13', resignDate: null, contractType: 'regular', isExecutive: false, militaryMonths: 0, specialFlag: 'NONE' },
  { employeeId: 'EMP-016', name: '송현우', birthDate: '1974-02-17', hireDate: '2014-08-25', resignDate: null, contractType: 'regular', isExecutive: false, militaryMonths: 18, specialFlag: 'NONE' },
  { employeeId: 'EMP-018', name: '전시우', birthDate: '1982-11-11', hireDate: '2019-12-02', resignDate: null, contractType: 'regular', isExecutive: false, militaryMonths: 0, specialFlag: 'NONE' },
  { employeeId: 'EMP-022', name: '배도윤', birthDate: '1992-10-28', hireDate: '2021-11-15', resignDate: null, contractType: 'regular', isExecutive: false, militaryMonths: 0, specialFlag: 'NONE' },
  { employeeId: 'EMP-026', name: '심예린', birthDate: '1994-09-15', hireDate: '2022-08-16', resignDate: null, contractType: 'regular', isExecutive: false, militaryMonths: 0, specialFlag: 'NONE' },
  { employeeId: 'EMP-027', name: '조은찬', birthDate: '1980-12-31', hireDate: '2012-05-07', resignDate: null, contractType: 'regular', isExecutive: true, militaryMonths: 0, specialFlag: 'NONE' },

  // ── 신규 입사 (증가 인원 산정 대상) ───────────────────
  { employeeId: 'EMP-006', name: '강수아', birthDate: '1999-11-05', hireDate: '2026-03-02', resignDate: null, contractType: 'regular', isExecutive: false, militaryMonths: 0, specialFlag: 'NONE' },
  { employeeId: 'EMP-013', name: '권민서', birthDate: '2000-07-13', hireDate: '2025-01-06', resignDate: null, contractType: 'regular', isExecutive: false, militaryMonths: 0, specialFlag: 'NONE' },
  { employeeId: 'EMP-024', name: '허윤서', birthDate: '2001-06-21', hireDate: '2026-05-04', resignDate: null, contractType: 'over_1y', isExecutive: false, militaryMonths: 0, specialFlag: 'NONE' },

  // ── 당해 연도 퇴사 (감소 인원 산정 대상) ──────────────
  { employeeId: 'EMP-012', name: '신은우', birthDate: '1991-03-27', hireDate: '2020-05-04', resignDate: '2026-04-30', contractType: 'regular', isExecutive: false, militaryMonths: 0, specialFlag: 'NONE' },
  { employeeId: 'EMP-023', name: '백지호', birthDate: '1995-02-14', hireDate: '2025-03-10', resignDate: '2026-02-28', contractType: 'regular', isExecutive: false, militaryMonths: 0, specialFlag: 'NONE' },

  // ── 이전 연도 퇴사 (양 연도 모두 제외) ────────────────
  { employeeId: 'EMP-019', name: '홍지아', birthDate: '1999-08-19', hireDate: '2025-06-02', resignDate: '2025-12-31', contractType: 'regular', isExecutive: false, militaryMonths: 0, specialFlag: 'NONE' },

  // ── 특수 케이스 (Track B 예규 검색 대상) ──────────────
  { employeeId: 'EMP-017', name: '류하은', birthDate: '1998-04-24', hireDate: '2026-01-05', resignDate: null, contractType: 'regular', isExecutive: false, militaryMonths: 0, specialFlag: 'PARENTAL_LEAVE', specialNote: '2026-05-01부터 육아휴직 예정, 2027년 복직 예정' },
  { employeeId: 'EMP-020', name: '문준서', birthDate: '1984-05-05', hireDate: '2013-02-18', resignDate: null, contractType: 'regular', isExecutive: false, militaryMonths: 0, specialFlag: 'BUSINESS_SUCCESSION', specialNote: '2026-01-01 사업 포괄양수도로 고용승계' },
  { employeeId: 'EMP-021', name: '양서윤', birthDate: '1997-03-03', hireDate: '2026-02-16', resignDate: null, contractType: 'short_time_under_60h', isExecutive: false, militaryMonths: 0, specialFlag: 'PART_TIME_PRO_RATA', specialNote: '1개월 소정근로시간 80시간 단시간 근로' },
  { employeeId: 'EMP-025', name: '남주원', birthDate: '1989-01-09', hireDate: '2018-07-02', resignDate: null, contractType: 'regular', isExecutive: false, militaryMonths: 0, specialFlag: 'REHIRED_SAME_YEAR', specialNote: '2026-03-01 퇴사 후 2026-07-01 재입사' },
  { employeeId: 'EMP-015', name: '안지민', birthDate: '1996-12-02', hireDate: '2024-03-04', resignDate: null, contractType: 'under_1y', isExecutive: false, militaryMonths: 0, specialFlag: 'NONE' },
];

export default mockEmployees27;