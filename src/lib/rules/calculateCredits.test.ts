import { describe, expect, it } from 'vitest';
import { defaultCompanyProfile, mockEmployees27 } from '@/data/mockEmployees27';
import { DEFAULT_RULE } from '@/data/defaultRules';
import { buildEmployeesFromRows, toIsoDate } from '@/lib/excel';
import { calculateCredits, judgeEmployee, simulateCredits, yearsBetween } from './calculateCredits';

/**
 * 임시 계산 모듈의 동작을 고정하는 스모크 테스트.
 * Track A 가 실제 규칙을 연결하면 이 테스트를 기준으로 회귀를 확인할 수 있습니다.
 */

describe('날짜 계산', () => {
  it('만 나이를 계산한다', () => {
    expect(yearsBetween('1998-09-07', '2023-03-02')).toBe(24);
    expect(yearsBetween('2000-02-25', '2024-01-08')).toBe(23);
  });
});

describe('직원 1명 판정', () => {
  const find = (id: string) => {
    const employee = mockEmployees27.find((item) => item.employeeId === id);
    if (!employee) throw new Error(`${id} 없음`);
    return employee;
  };

  it('임원은 제외된다', () => {
    const judgment = judgeEmployee(find('EMP-005'), 2026);
    expect(judgment.category).toBe('EXCLUDED');
  });

  it('1년 미만 계약직은 제외된다', () => {
    expect(judgeEmployee(find('EMP-015'), 2026).category).toBe('EXCLUDED');
  });

  it('60시간 미만 단시간근로자는 제외된다', () => {
    expect(judgeEmployee(find('EMP-021'), 2026).category).toBe('EXCLUDED');
  });

  it('특수 케이스는 검토 필요로 분류된다', () => {
    expect(judgeEmployee(find('EMP-017'), 2026).category).toBe('NEEDS_REVIEW');
    expect(judgeEmployee(find('EMP-020'), 2026).category).toBe('NEEDS_REVIEW');
    expect(judgeEmployee(find('EMP-025'), 2026).category).toBe('NEEDS_REVIEW');
  });

  it('청년과 일반을 구분한다', () => {
    expect(judgeEmployee(find('EMP-002'), 2026).category).toBe('YOUTH_PREFERRED');
    expect(judgeEmployee(find('EMP-001'), 2026).category).toBe('GENERAL');
  });
});

describe('공제액 계산 (mock 27명)', () => {
  const result = calculateCredits(defaultCompanyProfile, mockEmployees27, DEFAULT_RULE);

  it('상시근로자 수를 계산한다', () => {
    expect(result.prevCount).toBe(18);
    expect(result.currCount).toBe(19);
    expect(result.netIncrease).toBe(1);
  });

  it('순증가 인원만 공제 대상으로 잡는다', () => {
    expect(result.youthCount).toBe(1);
    expect(result.regularCount).toBe(0);
  });

  it('1·2·3년차 공제액을 계산한다', () => {
    expect(result.yearlyCredits[0]).toBe(7_000_000);
    expect(result.yearlyCredits[1]).toBe(16_000_000);
    expect(result.yearlyCredits[2]).toBe(17_000_000);
    expect(result.totalCredit).toBe(40_000_000);
  });

  it('검증되지 않은 규칙임을 표시한다', () => {
    expect(result.isRuleVerified).toBe(false);
  });
});

describe('시뮬레이션', () => {
  it('청년 2명 추가 시 공제액이 증가한다', () => {
    const simulation = simulateCredits(defaultCompanyProfile, mockEmployees27, DEFAULT_RULE, {
      addYouth: 2,
      addRegular: 0,
      removeYouth: 0,
      removeRegular: 0,
    });

    expect(simulation.simulated.currCount).toBe(21);
    expect(simulation.deltaTotalCredit).toBe(80_000_000);
    expect(simulation.baseline.totalCredit).toBe(40_000_000);
  });

  it('순증가가 0이 되면 공제액도 0이 된다', () => {
    const simulation = simulateCredits(defaultCompanyProfile, mockEmployees27, DEFAULT_RULE, {
      addYouth: 0,
      addRegular: 0,
      removeYouth: 1,
      removeRegular: 0,
    });

    expect(simulation.simulated.totalCredit).toBe(0);
    expect(simulation.deltaTotalCredit).toBe(-40_000_000);
  });
});

describe('엑셀 값 정규화', () => {
  it('다양한 날짜 표기를 YYYY-MM-DD 로 바꾼다', () => {
    expect(toIsoDate('2024-01-08')).toBe('2024-01-08');
    expect(toIsoDate('2024.1.8')).toBe('2024-01-08');
    expect(toIsoDate('2024/01/08')).toBe('2024-01-08');
    expect(toIsoDate('20240108')).toBe('2024-01-08');
    expect(toIsoDate('')).toBeNull();
  });

  it('매핑된 엑셀 행을 직원 레코드로 변환한다', () => {
    const rows = [
      {
        사원번호: 'EMP-999',
        성함: '테스트',
        생년월일: '1995.01.01',
        채용일자: '2025.03.01',
        퇴사일자: '',
        고용형태: '정규직',
        임원여부: 'N',
        병역기간: '0',
      },
    ];
    const mapping = {
      사원번호: 'employeeId',
      성함: 'name',
      생년월일: 'birthDate',
      채용일자: 'hireDate',
      퇴사일자: 'resignDate',
      고용형태: 'contractType',
      임원여부: 'isExecutive',
      병역기간: 'militaryMonths',
    };

    const { employees, warnings } = buildEmployeesFromRows(rows, mapping);

    expect(warnings).toHaveLength(0);
    expect(employees).toHaveLength(1);
    expect(employees[0]).toMatchObject({
      employeeId: 'EMP-999',
      name: '테스트',
      birthDate: '1995-01-01',
      hireDate: '2025-03-01',
      resignDate: null,
      contractType: 'regular',
      isExecutive: false,
      militaryMonths: 0,
      specialFlag: 'NONE',
    });
  });

  it('입사일이 없으면 경고를 남기고 건너뛴다', () => {
    const { employees, warnings } = buildEmployeesFromRows(
      [{ 성함: '홍길동', 생년월일: '1990-01-01', 입사일: '알수없음' }],
      { 성함: 'name', 생년월일: 'birthDate', 입사일: 'hireDate' },
    );

    expect(employees).toHaveLength(0);
    expect(warnings).toHaveLength(1);
  });
});