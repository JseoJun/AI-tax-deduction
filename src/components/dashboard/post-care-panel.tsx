'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buildCheckTimeline, buildDecreaseImpacts } from '@/lib/rules/calculateCredits';
import type { CalculationResult, CompanyProfile, EmployeeRecord, TaxRuleTable } from '@/schemas';
import {
  EmptyState,
  SectionHeading,
  StatCard,
  VerificationNotice,
  WarningBanner,
  formatCount,
  formatWon,
  formatWonShort,
} from './ui-bits';

/**
 * 사후관리 탭.
 *
 * 명부 변동 비교는 ‘직원 명부 변화’ 탭으로 분리했습니다. (roster-diff-panel.tsx)
 * 여기서는 공제를 받은 뒤의 유지 요건 확인만 다룹니다.
 */
export function PostCarePanel({
  company,
  employees,
  result,
  rule,
}: {
  company: CompanyProfile;
  employees: EmployeeRecord[];
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

  return (
    <div className="space-y-5">
      <WarningBanner title="사후관리는 ‘공제 받은 뒤’를 관리하는 화면입니다" tone="info">
        <p>
          공제를 받은 뒤 인원이 줄면 2·3년차 공제가 배제될 수 있습니다. 아래 수치는 확인용
          추정치입니다.
        </p>
        <p>명부가 바뀐 경우의 변동 내역은 ‘직원 명부 변화’ 탭에서 확인하세요.</p>
      </WarningBanner>

      <VerificationNotice isVerified={rule.isVerified} note={rule.verificationNote} />

      <div className="space-y-3">
        <SectionHeading
          title="감원 시 공제 손실 (추정)"
          description="현재 인원에서 몇 명이 줄면 2·3년차 공제가 얼마나 줄어드는지 보여줍니다."
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

      <div className="space-y-3">
        <SectionHeading
          title="고용유지 요건 확인 타임라인"
          description={`${company.targetYear}년 신규 입사자 기준 12개월·24개월 확인 시점입니다.`}
        />
        {timeline.length === 0 ? (
          <EmptyState title="당해 연도 신규 입사자가 없습니다" />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                확인 대상 {formatCount(timeline.length)}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden p-0">
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
            </CardContent>
          </Card>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        ※ 감원 손실액은 1인당 평균 공제액으로 단순 환산한 값입니다. 실제 배제·추징 여부는 확정
        규칙과 세무사 검토가 필요합니다. (현재 총 공제액 {formatWon(result.totalCredit)})
      </p>
    </div>
  );
}