'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { EmployeeJudgment, EmployeeRecord } from '@/schemas';
import { formatCount, SectionHeading } from './ui-bits';

const CATEGORY_LABEL: Record<EmployeeJudgment['category'], string> = {
  YOUTH_PREFERRED: '청년',
  GENERAL: '일반',
  EXCLUDED: '제외',
  NEEDS_REVIEW: '검토 필요',
};

const CATEGORY_VARIANT: Record<
  EmployeeJudgment['category'],
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  YOUTH_PREFERRED: 'default',
  GENERAL: 'secondary',
  EXCLUDED: 'outline',
  NEEDS_REVIEW: 'destructive',
};

const CONTRACT_LABEL: Record<EmployeeRecord['contractType'], string> = {
  regular: '정규직',
  over_1y: '1년 이상 계약',
  under_1y: '1년 미만 계약',
  short_time_under_60h: '단시간(60h 미만)',
};

const SPECIAL_LABEL: Record<EmployeeRecord['specialFlag'], string> = {
  NONE: '-',
  PARENTAL_LEAVE: '육아휴직',
  PART_TIME_PRO_RATA: '단시간 비례',
  BUSINESS_SUCCESSION: '고용승계',
  REHIRED_SAME_YEAR: '연내 재입사',
};

type FilterKey = 'ALL' | EmployeeJudgment['category'];

export function EmployeeRoster({
  employees,
  judgments,
  onSearchPrecedent,
}: {
  employees: EmployeeRecord[];
  judgments: EmployeeJudgment[];
  onSearchPrecedent: (employee: EmployeeRecord) => void;
}) {
  const [filter, setFilter] = useState<FilterKey>('ALL');

  const judgmentById = useMemo(() => {
    const map = new Map<string, EmployeeJudgment>();
    judgments.forEach((judgment) => map.set(judgment.employeeId, judgment));
    return map;
  }, [judgments]);

  const counts = useMemo(() => {
    const base: Record<FilterKey, number> = {
      ALL: employees.length,
      YOUTH_PREFERRED: 0,
      GENERAL: 0,
      EXCLUDED: 0,
      NEEDS_REVIEW: 0,
    };
    judgments.forEach((judgment) => {
      base[judgment.category] += 1;
    });
    return base;
  }, [employees.length, judgments]);

  const visible = employees.filter((employee) => {
    if (filter === 'ALL') return true;
    return judgmentById.get(employee.employeeId)?.category === filter;
  });

  return (
    <div className="space-y-3">
      <SectionHeading
        title="직원 명부"
        description={`총 ${formatCount(employees.length)} · 청년 ${counts.YOUTH_PREFERRED}명 · 일반 ${counts.GENERAL}명 · 제외 ${counts.EXCLUDED}명 · 검토 필요 ${counts.NEEDS_REVIEW}명`}
      />

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ['ALL', '전체'],
            ['YOUTH_PREFERRED', '청년'],
            ['GENERAL', '일반'],
            ['EXCLUDED', '제외'],
            ['NEEDS_REVIEW', '검토 필요'],
          ] as [FilterKey, string][]
        ).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? 'default' : 'outline'}
            onClick={() => setFilter(key)}
          >
            {label}
            <span className="ml-1 text-xs opacity-70">{counts[key]}</span>
          </Button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>사번</TableHead>
              <TableHead>성명</TableHead>
              <TableHead>입사일</TableHead>
              <TableHead>퇴사일</TableHead>
              <TableHead>계약형태</TableHead>
              <TableHead>특이사항</TableHead>
              <TableHead>판정</TableHead>
              <TableHead className="min-w-56">판정 사유</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((employee) => {
              const judgment = judgmentById.get(employee.employeeId);
              const needsReview = judgment?.category === 'NEEDS_REVIEW';
              return (
                <TableRow key={employee.employeeId}>
                  <TableCell className="font-mono text-xs">{employee.employeeId}</TableCell>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell className="tabular-nums">{employee.hireDate}</TableCell>
                  <TableCell className="tabular-nums">{employee.resignDate ?? '-'}</TableCell>
                  <TableCell className="text-xs">
                    {CONTRACT_LABEL[employee.contractType]}
                    {employee.isExecutive ? (
                      <Badge variant="outline" className="ml-1">
                        임원
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-xs">
                    {SPECIAL_LABEL[employee.specialFlag]}
                  </TableCell>
                  <TableCell>
                    {judgment ? (
                      <Badge variant={CATEGORY_VARIANT[judgment.category]}>
                        {CATEGORY_LABEL[judgment.category]}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="whitespace-normal text-xs text-muted-foreground">
                    {judgment?.reason ?? '-'}
                  </TableCell>
                  <TableCell>
                    {needsReview ? (
                      <Button size="xs" variant="outline" onClick={() => onSearchPrecedent(employee)}>
                        <Search />
                        예규 검색
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {visible.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          이 조건에 해당하는 직원이 없습니다.
        </p>
      ) : null}
    </div>
  );
}