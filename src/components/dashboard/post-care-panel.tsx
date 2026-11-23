'use client';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  buildCheckTimeline,
  buildDecreaseImpacts,
} from '@/lib/rules/calculateCredits';
import { buildRosterDiff } from '@/lib/rules/postCare';
import type { CalculationResult, CompanyProfile, EmployeeRecord, TaxRuleTable } from '@/schemas';
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

const CHANGE_VARIANT: Record<'NEW_HIRE' | 'RESIGNED' | 'MODIFIED', 'default' | 'destructive' | 'secondary'> = {
  NEW_HIRE: 'default',
  RESIGNED: 'destructive',
  MODIFIED: 'secondary',
};

export function PostCarePanel({
  company,
  employees,
  previousRoster,
  result,
  rule,
}: {
  company: CompanyProfile;
  employees: EmployeeRecord[];
  previousRoster: EmployeeRecord[] | null;
  result: CalculationResult;
  rule: TaxRuleTable;
}) {
  if (result.currCount === 0) {
    return (
      <EmptyState
        title="사후관리 대상이 없습니다"
        description="‘엑셀 업로드’ 탭에서 직원 명부를 먼저 불러오세요."
      />
    );
  }

  const decreaseRows = buildDecreaseImpacts(result, rule);
  const timeline = buildCheckTimeline(employees, company.targetYear);
  const rosterDiff = buildRosterDiff(previousRoster, employees);

  return (
    <div className="space-y-5">
      <WarningBanner title="사후관리는 ‘공제 받은 뒤’를 관리하는 화면입니다" tone="info">
        <p>
          공제를 받은 뒤 인원이 줄면 2·3년차 공제가 배제될 수 있습니다. 아래 수치는 확인용
          추정치입니다.
        </p>
      </WarningBanner>

      {/* 1. 감원 시 손실 */}
      <div className="space-y-3">
        <SectionHeading
          title="감원 시 공제 손실 (추정)"
          description="현재 인원에서 몇 명이 줄면 2·3년차 공제가 얼마나 사라지는지 보여줍니다."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {decreaseRows.map((row) => (
            <StatCard
              key={row.decreasedBy}
              label={`${row.decreasedBy}명 감원 시`}
              value={formatWonShort(row.totalLoss)}
              tone={row.totalLoss > 0 ? 'negative' : 'neutral'}
              hint={`잔여 ${formatCount(row.remainingCount)} · 2년차 ${formatWonShort(
                row.year2Loss,
              )} / 3년차 ${formatWonShort(row.year3Loss)}`}
            />
          ))}
        </div>
      </div>

      {/* 2. 요건 확인 타임라인 */}
      <div className="space-y-3">
        <SectionHeading
          title="고용유지 요건 확인 타임라인"
          description={`${company.targetYear}년 신규 입사자 기준 12개월·24개월 확인 시점입니다.`}
        />
        {timeline.length === 0 ? (
          <EmptyState title="당해 연도 신규 입사자가 없습니다" />
        ) : (
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>사번</TableHead>
                  <TableHead>성명</TableHead>
                  <TableHead>입사일</TableHead>
                  <TableHead>1차 확인 (12개월)</TableHead>
                  <TableHead>2차 확인 (24개월)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeline.map((item) => (
                  <TableRow key={item.employeeId}>
                    <TableCell className="font-mono text-xs">{item.employeeId}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="tabular-nums">{item.hireDate}</TableCell>
                    <TableCell className="tabular-nums">{item.check12MonthDate}</TableCell>
                    <TableCell className="tabular-nums">{item.check24MonthDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* 3. 명부 변동 내역 */}
      <div className="space-y-3">
        <SectionHeading
          title="직원 명부 변동 내역"
          description="이전에 불러온 명부와 현재 명부를 비교합니다."
        />
        {!previousRoster ? (
          <WarningBanner title="비교할 이전 명부가 없습니다" tone="info">
            <p>새 엑셀을 다시 업로드하면, 그 시점의 명부가 ‘직전 명부’로 저장되어 비교됩니다.</p>
          </WarningBanner>
        ) : rosterDiff.length === 0 ? (
          <EmptyState title="변동 사항이 없습니다" description="직전 명부와 내용이 동일합니다." />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                변동 {rosterDiff.length}건
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  신규 {rosterDiff.filter((item) => item.changeType === 'NEW_HIRE').length} ·
                  제외 {rosterDiff.filter((item) => item.changeType === 'RESIGNED').length} ·
                  변경 {rosterDiff.filter((item) => item.changeType === 'MODIFIED').length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {rosterDiff.slice(0, 20).map((item) => (
                  <li key={`${item.changeType}-${item.employeeId}`} className="flex flex-wrap items-center gap-2">
                    <Badge variant={CHANGE_VARIANT[item.changeType]}>
                      {CHANGE_LABEL[item.changeType]}
                    </Badge>
                    <span className="font-medium">{item.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{item.employeeId}</span>
                    <span className="text-xs text-muted-foreground">{item.detail}</span>
                  </li>
                ))}
              </ul>
              {rosterDiff.length > 20 ? (
                <p className="mt-2 text-xs text-muted-foreground">… 외 {rosterDiff.length - 20}건</p>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        ※ 감원 손실액은 1인당 평균 공제액으로 단순 환산한 값입니다. 실제 배제·추징 여부는
        Track A 확정 규칙과 세무사 검토가 필요합니다. (현재 총 공제액 {formatWon(result.totalCredit)})
      </p>
    </div>
  );
}