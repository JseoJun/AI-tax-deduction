'use client';

import { Maximize2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CompanyProfile, EmployeeRecord } from '@/schemas';
import { PrecedentResult } from './precedent-result';
import { EmptyState } from './ui-bits';
import { usePrecedents } from './use-precedents';

const SPECIAL_LABEL: Record<EmployeeRecord['specialFlag'], string> = {
  NONE: '일반',
  PARENTAL_LEAVE: '육아휴직',
  PART_TIME_PRO_RATA: '단시간 비례',
  BUSINESS_SUCCESSION: '고용승계',
  REHIRED_SAME_YEAR: '연내 재입사',
};

/**
 * 예규 검색 탭 본문.
 * Drawer 와 동일한 훅/결과 컴포넌트를 사용하므로 표시 내용이 어긋나지 않습니다.
 */
export function PrecedentPanel({
  employees,
  company,
  selectedEmployeeId,
  onSelectEmployee,
  onOpenDrawer,
}: {
  employees: EmployeeRecord[];
  company: CompanyProfile;
  selectedEmployeeId: string | null;
  onSelectEmployee: (employeeId: string | null) => void;
  onOpenDrawer?: (employeeId: string) => void;
}) {
  const candidates = employees.filter((employee) => employee.specialFlag !== 'NONE');
  const selected =
    candidates.find((employee) => employee.employeeId === selectedEmployeeId) ?? null;

  const { data, loading, error, reload } = usePrecedents({
    employee: selected,
    company,
    enabled: true,
  });

  if (candidates.length === 0) {
    return (
      <EmptyState
        title="검색할 특수 케이스가 없습니다"
        description="육아휴직·단시간·고용승계·연내 재입사 직원이 있어야 예규 검색을 사용할 수 있습니다."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 space-y-1.5">
          <Label className="text-xs">검토할 직원</Label>
          <Select
            items={Object.fromEntries(
              candidates.map((employee) => [
                employee.employeeId,
                `${employee.name} · ${SPECIAL_LABEL[employee.specialFlag]}`,
              ]),
            )}
            value={selectedEmployeeId ?? ''}
            onValueChange={(value) => onSelectEmployee(String(value) || null)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="직원을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((employee) => (
                <SelectItem key={employee.employeeId} value={employee.employeeId}>
                  {employee.name} · {SPECIAL_LABEL[employee.specialFlag]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={reload}
          disabled={!selected || loading}
        >
          <RotateCcw />
          다시 검색
        </Button>

        {selected && onOpenDrawer ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenDrawer(selected.employeeId)}
          >
            <Maximize2 />
            크게 보기
          </Button>
        ) : null}
      </div>

      {selected?.specialNote ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-xs">
          <b>비고</b> · {selected.specialNote}
        </p>
      ) : null}

      <PrecedentResult loading={loading} error={error} data={data} onRetry={reload} />
    </div>
  );
}