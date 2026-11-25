import type { EmployeeRecord, RosterDiffItem } from '@/schemas';

/**
 * 사후관리 보조 모듈 (임시)
 *
 * - 명부 변동 내역(Roster Diff): 직전 명부와 현재 명부를 비교합니다.
 * - 감원 손실·체크 타임라인은 calculateCredits.ts 의 buildDecreaseImpacts /
 *   buildCheckTimeline 을 사용합니다.
 *
 * ⚠ 여기서 계산하는 손실액은 참고용 추정치이며, 실제 공제 배제·추징 여부는
 *   Track A 확정 규칙과 세무사 검토가 필요합니다.
 */

const COMPARED_FIELDS: Array<keyof EmployeeRecord> = [
  'name',
  'birthDate',
  'hireDate',
  'resignDate',
  'contractType',
  'isExecutive',
  'militaryMonths',
  'specialFlag',
];

export function buildRosterDiff(
  previous: EmployeeRecord[] | null,
  current: EmployeeRecord[],
): RosterDiffItem[] {
  if (!previous) return [];

  const previousById = new Map(previous.map((employee) => [employee.employeeId, employee]));
  const currentById = new Map(current.map((employee) => [employee.employeeId, employee]));
  const changes: RosterDiffItem[] = [];

  for (const employee of current) {
    const before = previousById.get(employee.employeeId);
    if (!before) {
      changes.push({
        employeeId: employee.employeeId,
        name: employee.name,
        changeType: 'NEW_HIRE',
        detail: `${employee.hireDate} 입사 (신규)`,
      });
      continue;
    }

    const changedFields = COMPARED_FIELDS.filter(
      (field) => String(before[field] ?? '') !== String(employee[field] ?? ''),
    );

    if (changedFields.length > 0) {
      changes.push({
        employeeId: employee.employeeId,
        name: employee.name,
        changeType: 'MODIFIED',
        detail: changedFields
          .map((field) => `${field}: ${String(before[field] ?? '-')} → ${String(employee[field] ?? '-')}`)
          .join(', '),
      });
    }
  }

  for (const employee of previous) {
    if (!currentById.has(employee.employeeId)) {
      changes.push({
        employeeId: employee.employeeId,
        name: employee.name,
        changeType: 'RESIGNED',
        detail: `${employee.resignDate ?? '명부에서 제외'} (명부에서 사라짐)`,
      });
    }
  }

  return changes;
}