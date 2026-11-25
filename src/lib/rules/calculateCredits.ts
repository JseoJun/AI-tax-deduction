import type {
  CalculationResult,
  CheckTimelineItem,
  CompanyProfile,
  DecreaseImpactRow,
  EmployeeJudgment,
  EmployeeRecord,
  SimulationRequest,
  SimulationResponse,
  TaxRuleTable,
} from '@/schemas';

/**
 * ⚠ 임시 계산 모듈 (PLACEHOLDER — Track A 대체 예정)
 *
 * 이 파일은 화면 개발을 위해 만든 **임시 구현**입니다.
 * 실제 세액공제 금액은 Track A(규칙 계산 담당)의 확정 모듈이 계산해야 합니다.
 *
 * Track A 모듈이 준비되면 아래 시그니처만 유지한 채 내부 구현을 교체하면
 * 화면 컴포넌트는 한 줄도 고치지 않아도 됩니다.
 *
 *   calculateCredits(company, employees, rule)  → CalculationResult
 *   simulateCredits(company, employees, rule, simulation) → SimulationResponse
 *   buildDecreaseImpacts(result, rule) → DecreaseImpactRow[]
 *   buildCheckTimeline(employees, year) → CheckTimelineItem[]
 */

const YOUTH_MIN_AGE = 15;
const YOUTH_MAX_AGE = 34;

// ─────────────────────────────────────────────────────────────
// 날짜 유틸
// ─────────────────────────────────────────────────────────────

/** 'YYYY-MM-DD' 두 날짜 사이의 만 나이(연 단위)를 계산합니다. */
export function yearsBetween(fromDate: string, toDate: string): number {
  const from = new Date(`${fromDate}T00:00:00Z`);
  const to = new Date(`${toDate}T00:00:00Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;

  let years = to.getUTCFullYear() - from.getUTCFullYear();
  const monthDiff = to.getUTCMonth() - from.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && to.getUTCDate() < from.getUTCDate())) {
    years -= 1;
  }
  return years;
}

/** 해당 과세연도에 재직 이력이 있는지 판단합니다. */
export function employedInYear(employee: EmployeeRecord, year: number): boolean {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  if (employee.hireDate > yearEnd) return false;
  if (employee.resignDate && employee.resignDate < yearStart) return false;
  return true;
}

/** 해당 과세연도 말일 기준 재직 중인지 판단합니다. */
export function employedAtYearEnd(employee: EmployeeRecord, year: number): boolean {
  const yearEnd = `${year}-12-31`;
  if (employee.hireDate > yearEnd) return false;
  if (employee.resignDate && employee.resignDate <= yearEnd) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────
// 직원 1명 판정
// ─────────────────────────────────────────────────────────────

/**
 * 직원 1명을 상시근로자 산입 대상 / 청년 / 제외 / 검토필요 로 분류합니다.
 * 판정 근거를 reason 문자열로 남겨 화면에서 그대로 보여줄 수 있게 합니다.
 */
export function judgeEmployee(
  employee: EmployeeRecord,
  targetYear: number,
): EmployeeJudgment {
  const prevYear = targetYear - 1;
  const isEmployedPrev = employedInYear(employee, prevYear);
  const isEmployedCurr = employedInYear(employee, targetYear);

  // 병역 복무기간은 청년 연령 계산 시 차감합니다(임시 반영).
  const rawAgeAtHire = yearsBetween(employee.birthDate, employee.hireDate);
  const effectiveAgeAtHire = Math.max(
    0,
    rawAgeAtHire - Math.floor((employee.militaryMonths ?? 0) / 12),
  );

  const base = {
    employeeId: employee.employeeId,
    name: employee.name,
    isEmployedPrev,
    isEmployedCurr,
    effectiveAgeAtHire,
  };

  if (employee.isExecutive) {
    return { ...base, category: 'EXCLUDED', reason: '임원은 상시근로자 수에서 제외됩니다.' };
  }

  if (employee.contractType === 'under_1y') {
    return {
      ...base,
      category: 'EXCLUDED',
      reason: '1년 미만 단기 근로계약은 상시근로자 수 산입에서 제외됩니다.',
    };
  }

  if (employee.contractType === 'short_time_under_60h') {
    return {
      ...base,
      category: 'EXCLUDED',
      reason: '1개월 소정근로시간 60시간 미만 단시간근로자는 제외됩니다.',
    };
  }

  if (employee.specialFlag !== 'NONE') {
    return {
      ...base,
      category: 'NEEDS_REVIEW',
      reason: '특수 케이스입니다. Track B 예규 검색으로 산입 여부를 확인하세요.',
    };
  }

  if (!isEmployedPrev && !isEmployedCurr) {
    return {
      ...base,
      category: 'EXCLUDED',
      reason: '직전·당해 과세연도 모두 재직 이력이 없어 제외됩니다.',
    };
  }

  const isYouth =
    effectiveAgeAtHire >= YOUTH_MIN_AGE && effectiveAgeAtHire <= YOUTH_MAX_AGE;

  return {
    ...base,
    category: isYouth ? 'YOUTH_PREFERRED' : 'GENERAL',
    reason: isYouth
      ? `입사 당시 만 ${effectiveAgeAtHire}세로 청년(만 ${YOUTH_MIN_AGE}~${YOUTH_MAX_AGE}세)에 해당합니다.`
      : `입사 당시 만 ${effectiveAgeAtHire}세로 일반 상시근로자에 해당합니다.`,
  };
}

// ─────────────────────────────────────────────────────────────
// 메인 계산
// ─────────────────────────────────────────────────────────────

export function calculateCredits(
  company: CompanyProfile,
  employees: EmployeeRecord[],
  rule: TaxRuleTable,
): CalculationResult {
  const targetYear = company.targetYear;
  const judgments = employees.map((employee) => judgeEmployee(employee, targetYear));

  const counted = judgments.filter(
    (j) => j.category === 'YOUTH_PREFERRED' || j.category === 'GENERAL',
  );

  const prevCount = counted.filter((j) => j.isEmployedPrev).length;
  const currCount = counted.filter((j) => j.isEmployedCurr).length;
  const netIncrease = Math.max(0, currCount - prevCount);

  // 당해 연도 신규 산입 인원 (이전 연도에 없던 사람)
  const newYouth = counted.filter(
    (j) => j.isEmployedCurr && !j.isEmployedPrev && j.category === 'YOUTH_PREFERRED',
  ).length;
  const newRegular = counted.filter(
    (j) => j.isEmployedCurr && !j.isEmployedPrev && j.category === 'GENERAL',
  ).length;

  // 순증가 인원을 초과하는 신규 채용은 공제 대상에서 제외 (청년 우선)
  const youthApplied = Math.min(newYouth, netIncrease);
  const regularApplied = Math.min(newRegular, Math.max(0, netIncrease - youthApplied));

  const yearlyCredits: [number, number, number] =
    netIncrease === 0
      ? [0, 0, 0]
      : [
          youthApplied * rule.youthCredit[0] + regularApplied * rule.regularCredit[0],
          youthApplied * rule.youthCredit[1] + regularApplied * rule.regularCredit[1],
          youthApplied * rule.youthCredit[2] + regularApplied * rule.regularCredit[2],
        ];

  const totalCredit = yearlyCredits[0] + yearlyCredits[1] + yearlyCredits[2];

  const edgeCaseFlags = judgments.filter((j) => j.category === 'NEEDS_REVIEW');

  return {
    prevCount,
    currCount,
    netIncrease,
    youthCount: youthApplied,
    regularCount: regularApplied,
    yearlyCredits,
    totalCredit,
    employeeJudgments: judgments,
    edgeCaseFlags,
    isRuleVerified: rule.isVerified,
  };
}

// ─────────────────────────────────────────────────────────────
// 시뮬레이션 (재용 / 감원)
// ─────────────────────────────────────────────────────────────

export function simulateCredits(
  company: CompanyProfile,
  employees: EmployeeRecord[],
  rule: TaxRuleTable,
  simulation: SimulationRequest,
): SimulationResponse {
  const baselineResult = calculateCredits(company, employees, rule);

  const nextCurrCount = Math.max(
    0,
    baselineResult.currCount +
      simulation.addYouth +
      simulation.addRegular -
      simulation.removeYouth -
      simulation.removeRegular,
  );

  const nextNetIncrease = Math.max(0, nextCurrCount - baselineResult.prevCount);

  const nextYouth = Math.max(0, baselineResult.youthCount + simulation.addYouth - simulation.removeYouth);
  const nextRegular = Math.max(
    0,
    baselineResult.regularCount + simulation.addRegular - simulation.removeRegular,
  );

  const youthApplied = Math.min(nextYouth, nextNetIncrease);
  const regularApplied = Math.min(nextRegular, Math.max(0, nextNetIncrease - youthApplied));

  const simulatedYearly: [number, number, number] =
    nextNetIncrease === 0
      ? [0, 0, 0]
      : [
          youthApplied * rule.youthCredit[0] + regularApplied * rule.regularCredit[0],
          youthApplied * rule.youthCredit[1] + regularApplied * rule.regularCredit[1],
          youthApplied * rule.youthCredit[2] + regularApplied * rule.regularCredit[2],
        ];

  const simulatedTotal =
    simulatedYearly[0] + simulatedYearly[1] + simulatedYearly[2];

  return {
    baseline: {
      currCount: baselineResult.currCount,
      yearlyCredits: baselineResult.yearlyCredits,
      totalCredit: baselineResult.totalCredit,
    },
    simulated: {
      currCount: nextCurrCount,
      yearlyCredits: simulatedYearly,
      totalCredit: simulatedTotal,
    },
    deltaYearlyCredits: [
      simulatedYearly[0] - baselineResult.yearlyCredits[0],
      simulatedYearly[1] - baselineResult.yearlyCredits[1],
      simulatedYearly[2] - baselineResult.yearlyCredits[2],
    ],
    deltaTotalCredit: simulatedTotal - baselineResult.totalCredit,
  };
}

// ─────────────────────────────────────────────────────────────
// 사후관리 (감원 시 손실 / 12·24개월 체크 타임라인)
// ─────────────────────────────────────────────────────────────

export function buildDecreaseImpacts(
  result: CalculationResult,
  rule: TaxRuleTable,
): DecreaseImpactRow[] {
  const rows: DecreaseImpactRow[] = [];

  // 1인당 평균 공제액(2년차·3년차)으로 단순 환산한 임시 계산입니다.
  const perWorker2 =
    result.youthCount + result.regularCount > 0
      ? result.yearlyCredits[1] / (result.youthCount + result.regularCount)
      : 0;
  const perWorker3 =
    result.youthCount + result.regularCount > 0
      ? result.yearlyCredits[2] / (result.youthCount + result.regularCount)
      : 0;

  for (const decreasedBy of [1, 2, 3] as const) {
    const remainingCount = Math.max(0, result.currCount - decreasedBy);
    const year2Loss = decreasedBy * perWorker2;
    const year3Loss = decreasedBy * perWorker3;
    rows.push({
      decreasedBy,
      remainingCount,
      year2Loss,
      year3Loss,
      totalLoss: year2Loss + year3Loss,
    });
  }

  // 규칙 테이블에 감원 페널티가 정의되어 있으면 참고값으로 함께 노출할 수 있습니다.
  void rule;
  return rows;
}

export function buildCheckTimeline(
  employees: EmployeeRecord[],
  targetYear: number,
): CheckTimelineItem[] {
  return employees
    .filter(
      (employee) =>
        employee.hireDate.startsWith(String(targetYear)) && !employee.isExecutive,
    )
    .map((employee) => {
      const hire = new Date(`${employee.hireDate}T00:00:00Z`);
      const plus12 = new Date(hire);
      plus12.setUTCMonth(plus12.getUTCMonth() + 12);
      const plus24 = new Date(hire);
      plus24.setUTCMonth(plus24.getUTCMonth() + 24);
      return {
        employeeId: employee.employeeId,
        name: employee.name,
        hireDate: employee.hireDate,
        check12MonthDate: plus12.toISOString().slice(0, 10),
        check24MonthDate: plus24.toISOString().slice(0, 10),
      };
    });
}