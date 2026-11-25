import { describe, expect, it } from 'vitest';
import { validateMapping } from './mapping-validation';

/**
 * 엑셀 열 매핑 검증 규칙 회귀 테스트.
 * (UI 에서 분리한 순수 함수라 브라우저 없이 검증할 수 있습니다.)
 */

const FULL_MAPPING: Record<string, string> = {
  사원번호: 'employeeId',
  성함: 'name',
  생년월일: 'birthDate',
  채용일자: 'hireDate',
  퇴사일자: 'resignDate',
  고용형태: 'contractType',
  비고: 'specialNote',
  부서: 'IGNORE',
};

describe('validateMapping', () => {
  it('필수 항목이 모두 연결되면 명부를 만들 수 있다', () => {
    const result = validateMapping(FULL_MAPPING, true);

    expect(result.missingRequired).toEqual([]);
    expect(result.hasIdentifier).toBe(true);
    expect(result.duplicateTargets).toEqual([]);
    expect(result.canApply).toBe(true);
    expect(result.mappedFields).toHaveLength(7); // IGNORE 제외
  });

  it('입사일이 연결되지 않으면 생성할 수 없다', () => {
    const mapping = { ...FULL_MAPPING };
    delete mapping['채용일자'];

    const result = validateMapping(mapping, true);

    expect(result.missingRequired).toEqual(['hireDate']);
    expect(result.canApply).toBe(false);
  });

  it('생년월일이 연결되지 않으면 생성할 수 없다', () => {
    const mapping = { ...FULL_MAPPING };
    delete mapping['생년월일'];

    const result = validateMapping(mapping, true);

    expect(result.missingRequired).toEqual(['birthDate']);
    expect(result.canApply).toBe(false);
  });

  it('성명·사번이 모두 없으면 생성할 수 없다', () => {
    const mapping = { ...FULL_MAPPING, 사원번호: 'IGNORE', 성함: 'IGNORE' };

    const result = validateMapping(mapping, true);

    expect(result.hasIdentifier).toBe(false);
    expect(result.canApply).toBe(false);
  });

  it('사번만 있어도 생성할 수 있다', () => {
    const mapping = { ...FULL_MAPPING, 성함: 'IGNORE' };

    const result = validateMapping(mapping, true);

    expect(result.hasIdentifier).toBe(true);
    expect(result.canApply).toBe(true);
  });

  it('같은 표준 항목에 여러 열이 연결되면 중복으로 보고한다', () => {
    const mapping = { ...FULL_MAPPING, 성명: 'name' };

    const result = validateMapping(mapping, true);

    expect(result.duplicateTargets).toEqual([['name', ['성함', '성명']]]);
    // 중복은 경고일 뿐 생성 자체는 막지 않는다 (마지막 열만 반영됨)
    expect(result.canApply).toBe(true);
  });

  it('시트가 파싱되지 않았으면 생성할 수 없다', () => {
    expect(validateMapping(FULL_MAPPING, false).canApply).toBe(false);
    expect(validateMapping({}, true).canApply).toBe(false);
  });

  it('매핑이 비어 있으면 필수 항목이 모두 빠진 것으로 본다', () => {
    const result = validateMapping({}, true);

    expect(result.missingRequired).toEqual(['hireDate', 'birthDate']);
    expect(result.mappedFields).toEqual([]);
    expect(result.canApply).toBe(false);
  });
});