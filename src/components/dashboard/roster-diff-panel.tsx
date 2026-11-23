'use client';

import { ArrowRight, Diff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { buildRosterDiff } from '@/lib/rules/postCare';
import type { CalculationResult, EmployeeRecord } from '@/schemas';
import {
  EmptyState,
  SectionHeading,
  StatCard,
  WarningBanner,
  formatCount,
  formatWon,
  formatWonShort,
} from './ui-bits';

const CHANGE_LABEL: Record<'NEW_HIRE' | 'RESIGNED' | 'MODIFIED', string> = {
  NEW_HIRE: '신규 입사',
  RESIGNED: '명부 제외',
  MODIFIED: '정보 변경',
};

const CHANGE_VARIANT: Record<
  'NEW_HIRE' | 'RESIGNED' | 'MODIFIED',
  'default' | 'destructive' | 'secondary'
> = {
  NEW_HIRE: 'default',
  RESIGNED: 'destructive',
  MODIFIED: 'secondary',
};

/**
 * 직원 명부 변화 확인 탭.
 *
 * 직전에 불러온 명부와 현재 명부를 비교합니다.
 * 공제액 비교는 규칙 엔진(calculateCredits)을 두 번 호출해 얻은 값이며,
 * 이 화면에서 금액을 직접 계산하지 않습니다.
 */
export function RosterDiffPanel({
  employees,
  previousRoster,
  result,
  previousResult,
}: {
  employees: EmployeeRecord[];
  previousRoster: EmployeeRecord[] | null;
  result: CalculationResult;
  previousResult: CalculationResult | null;
}) {
  if (result.currCount === 0 && !previousRoster) {
    return (
      <EmptyState
        title="비교할 명부가 없습니다"
        description="‘엑셀 업로드’ 탭에서 명부를 불러오면, 다음 업로드부터 이전 명부와 자동 비교됩니다."
      />
    );
  }

  const changes = buildRosterDiff(previousRoster, employees);
  const newHires = changes.filter((item) => item.changeType === 'NEW_HIRE');
  const resigned = changes.filter((item) => item.changeType === 'RESIGNED');
  const modified = changes.filter((item) => item.changeType === 'MODIFIED');

  const creditDelta =
    previousResult != null ? result.totalCredit - previousResult.totalCredit : null;

  return (
    <div className="space-y-5">
      <SectionHeading
        title="직원 명부 변화 확인"
        description="직전 명부와 현재 명부를 비교합니다. 새 엑셀을 올릴 때마다 직전 명부가 자동 보관됩니다."
      />

      {!previousRoster ? (
        <WarningBanner title="비교할 직전 명부가 저장되어 있지 않습니다" tone="info">
          <p>
            엑셀을 다시 업로드하거나 샘플 데이터를 다시 불러오면, 그 시점의 명부가 ‘직전
            명부’로 저장되어 여기에서 비교할 수 있습니다.
          </p>
        </WarningBanner>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="직전 명부 인원"
              value={formatCount(previousResult?.currCount ?? previousRoster.length)}
              hint="비교 기준"
            />
            <StatCard
              label="현재 명부 인원"
              value={formatCount(result.currCount)}
              tone={
                previousResult && result.currCount !== previousResult.currCount
                  ? result.currCount > previousResult.currCount
                    ? 'positive'
                    : 'negative'
                  : 'neutral'
              }
            />
            <StatCard
              label="직전 명부 3년 합계"
              value={
                previousResult ? formatWonShort(previousResult.totalCredit) : '-'
              }
              hint={previousResult ? formatWon(previousResult.totalCredit) : '산출 불가'}
            />
            <StatCard
              label="현재 3년 합계"
              value={formatWonShort(result.totalCredit)}
              hint={
                creditDelta == null
                  ? formatWon(result.totalCredit)
                  : `직전 대비 ${creditDelta >= 0 ? '+' : ''}${formatWon(creditDelta)}`
              }
              tone={
                creditDelta == null
                  ? 'neutral'
                  : creditDelta > 0
                    ? 'positive'
                    : creditDelta < 0
                      ? 'negative'
                      : 'neutral'
              }
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs">
            <Diff className="size-4 text-muted-foreground" />
            <span>
              변동 <b>{changes.length}건</b>
            </span>
            <Badge variant="default">신규 {newHires.length}</Badge>
            <Badge variant="destructive">제외 {resigned.length}</Badge>
            <Badge variant="secondary">변경 {modified.length}</Badge>
            <span className="ml-auto text-muted-foreground">
              직전 명부 {previousRoster.length}명
              <ArrowRight className="mx-1 inline size-3" />
              현재 {employees.length}명
            </span>
          </div>

          {changes.length === 0 ? (
            <EmptyState
              title="변동 사항이 없습니다"
              description="직전 명부와 내용이 완전히 동일합니다."
            />
          ) : (
            <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">구분</TableHead>
                    <TableHead>성명</TableHead>
                    <TableHead>사번</TableHead>
                    <TableHead className="min-w-64">내용</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changes.map((change) => (
                    <TableRow key={`${change.changeType}-${change.employeeId}`}>
                      <TableCell>
                        <Badge variant={CHANGE_VARIANT[change.changeType]}>
                          {CHANGE_LABEL[change.changeType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{change.name}</TableCell>
                      <TableCell className="font-mono text-xs">{change.employeeId}</TableCell>
                      <TableCell className="whitespace-normal text-xs text-muted-foreground">
                        {change.detail}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      <WarningBanner title="변동 금액은 참고용입니다" tone="info">
        <p>
          직전 명부 기준 금액은 같은 규칙 테이블로 다시 산출한 비교값입니다. 실제 신고서 수정·경정
          필요 여부는 세무사가 판단합니다.
        </p>
      </WarningBanner>
    </div>
  );
}