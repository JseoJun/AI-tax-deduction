'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CalculationResult, CompanyProfile, TaxRuleTable } from '@/schemas';
import {
  EmptyState,
  StatCard,
  WarningBanner,
  formatCount,
  formatWon,
  formatWonShort,
} from './ui-bits';

export function CreditResultPanel({
  company,
  result,
  rule,
}: {
  company: CompanyProfile;
  result: CalculationResult;
  rule: TaxRuleTable;
}) {
  if (result.currCount === 0) {
    return (
      <EmptyState
        title="아직 직원 명부가 없습니다"
        description="‘엑셀 업로드’ 탭에서 파일을 올리거나 샘플 데이터를 불러오세요."
      />
    );
  }

  const yearly = result.yearlyCredits;

  return (
    <div className="space-y-4">
      {!result.isRuleVerified ? (
        <WarningBanner title="⚠ 규칙 테이블이 검증되지 않았습니다">
          <p>{rule.verificationNote}</p>
          <p>
            화면의 금액은 Track A 확정 규칙이 연결되기 전까지의 <b>임시 계산값</b>입니다. 세무사
            검토 자료로 사용하지 마세요.
          </p>
        </WarningBanner>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="직전 연도 상시근로자" value={formatCount(result.prevCount)} hint={`${company.targetYear - 1}년 기준`} />
        <StatCard label="당해 연도 상시근로자" value={formatCount(result.currCount)} hint={`${company.targetYear}년 기준`} />
        <StatCard
          label="순증가 인원"
          value={formatCount(result.netIncrease)}
          tone={result.netIncrease > 0 ? 'positive' : 'neutral'}
          hint="공제 계산의 기준 인원"
        />
        <StatCard
          label="3년 합계 공제액"
          value={formatWonShort(result.totalCredit)}
          tone={result.totalCredit > 0 ? 'positive' : 'neutral'}
          hint={formatWon(result.totalCredit)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <StatCard
            key={index}
            label={`${index + 1}년차 공제액`}
            value={formatWonShort(yearly[index])}
            hint={formatWon(yearly[index])}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>공제 계산 근거</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">청년 증가 {result.youthCount}명</Badge>
            <Badge variant="secondary">일반 증가 {result.regularCount}명</Badge>
            <Badge variant="outline">청년 단가 {formatWonShort(rule.youthCredit[0])}/명</Badge>
            <Badge variant="outline">일반 단가 {formatWonShort(rule.regularCredit[0])}/명</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            근거 법령: {rule.legalBasis}
          </p>
          <p className="text-xs text-muted-foreground">
            필요 서류: {rule.requiredDocs.join(', ')}
          </p>
          {result.netIncrease === 0 ? (
            <WarningBanner title="순증가 인원이 0명입니다" tone="info">
              <p>
                직전 연도 대비 상시근로자가 늘지 않으면 공제 대상 인원이 발생하지 않습니다.
              </p>
            </WarningBanner>
          ) : null}
        </CardContent>
      </Card>

      {result.edgeCaseFlags.length > 0 ? (
        <WarningBanner title={`검토 필요 직원 ${result.edgeCaseFlags.length}명`}>
          <ul className="list-inside list-disc space-y-0.5">
            {result.edgeCaseFlags.map((flag) => (
              <li key={flag.employeeId}>
                {flag.name} ({flag.employeeId}) — {flag.reason}
              </li>
            ))}
          </ul>
          <p>‘예규·법령’ 탭에서 관련 예규를 검색해 세무사가 최종 판단하세요.</p>
        </WarningBanner>
      ) : null}
    </div>
  );
}