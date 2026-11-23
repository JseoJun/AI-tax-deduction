import type { StandardField } from '@/lib/excel';

/**
 * 엑셀 열 매핑 검증 로직 (UI 와 분리한 순수 함수).
 *
 * 화면 컴포넌트에서 직접 계산하던 검증 규칙을 여기로 모았습니다.
 * - 필수 항목(입사일·생년월일)이 매핑되지 않으면 명부를 만들 수 없습니다.
 * - 성명 또는 사번 중 하나는 반드시 매핑되어야 합니다.
 * - 같은 표준 항목에 여러 열이 연결되면 경고를 띄웁니다. (실제 변환은 마지막 열만 사용)
 */

export const REQUIRED_FIELDS: StandardField[] = ['hireDate', 'birthDate'];
export const IDENTIFIER_FIELDS: StandardField[] = ['name', 'employeeId'];

export interface MappingValidation {
  /** IGNORE 를 제외한, 실제로 연결된 표준 필드 목록 */
  mappedFields: string[];
  /** 같은 표준 필드에 2개 이상의 열이 연결된 경우: [표준필드, 엑셀 열 이름들] */
  duplicateTargets: [string, string[]][];
  /** 매핑이 빠진 필수 항목 */
  missingRequired: StandardField[];
  /** 성명 또는 사번이 연결되어 있는지 */
  hasIdentifier: boolean;
  /** 명부 생성 버튼을 눌러도 되는지 */
  canApply: boolean;
}

export function validateMapping(
  mapping: Record<string, string>,
  hasParsedSheet: boolean,
): MappingValidation {
  const mappedFields = Object.values(mapping).filter((field) => field !== 'IGNORE');

  const grouped = new Map<string, string[]>();
  for (const [header, field] of Object.entries(mapping)) {
    if (field === 'IGNORE') continue;
    grouped.set(field, [...(grouped.get(field) ?? []), header]);
  }

  const duplicateTargets: [string, string[]][] = [...grouped.entries()].filter(
    ([, headers]) => headers.length > 1,
  );

  const missingRequired = REQUIRED_FIELDS.filter((field) => !mappedFields.includes(field));
  const hasIdentifier = IDENTIFIER_FIELDS.some((field) => mappedFields.includes(field));

  return {
    mappedFields,
    duplicateTargets,
    missingRequired,
    hasIdentifier,
    canApply: hasParsedSheet && missingRequired.length === 0 && hasIdentifier,
  };
}