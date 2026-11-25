'use client';

import { useState } from 'react';
import { FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CalculationResult, CompanyProfile, TaxRuleTable } from '@/schemas';
import { RuleTableDialog } from './rule-table-dialog';
import {
  EmptyState,
  StatCard,
  VerificationNotice,
  WarningBanner,
  formatCount,
  formatWon,
  formatWonShort,
} from './ui-bits';

export function CreditResultPanel({
  company,
  result,
  rule,
  onOpenPrecedent,
}: {
  company: CompanyProfile;
  result: CalculationResult;
  rule: TaxRuleTable;
  onOpenPrecedent?: (employeeId: string) => void;
}) {
  const [ruleOpen, setRuleOpen] = useState(false);

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
      <VerificationNotice isVerified={result.isRuleVerified} note={rule.verificationNote} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="직전 연도 상시근로자"
          value={formatCount(result.prevCount)}
          hint={`${company.targetYear - 1}년 기준`}
        />
        <StatCard
          label="당해 연도 상시근로자"
          value={formatCount(result.currCount)}
          hint={`${company.targetYear}년 기준`}
        />
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
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>공제 계산 근거</span>
            <Button size="sm" variant="outline" onClick={() => setRuleOpen(true)}>
              <FileText />
              규칙 테이블 보기
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">청년 증가 {result.youthCount}명</Badge>
            <Badge variant="secondary">일반 증가 {result.regularCount}명</Badge>
            <Badge variant="outline">청년 단가 {formatWonShort(rule.youthCredit[0])}/명</Badge>
            <Badge variant="outline">일반 단가 {formatWonShort(rule.regularCredit[0])}/명</Badge>
          </div>
          <p className="text-xs text-muted-foreground">근거 법령: {rule.legalBasis}</p>
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
        <div className="space-y-2">
          <WarningBanner
            title={`검토 필요 직원 ${result.edgeCaseFlags.length}명`}
            tone="warning"
          >
            <ul className="list-inside list-disc space-y-0.5">
              {result.edgeCaseFlags.map((flag) => (
                <li key={flag.employeeId}>
                  {flag.name} ({flag.employeeId}) — {flag.reason}
                </li>
              ))}
            </ul>
            <p>예규를 확인한 뒤 세무사가 최종 판단합니다. 아래 버튼으로 원문을 조회할 수 있습니다.</p>
          </WarningBanner>
          {onOpenPrecedent ? (
            <div className="flex flex-wrap gap-1.5">
              {result.edgeCaseFlags.map((flag) => (
                <Button
                  key={flag.employeeId}
                  size="xs"
                  variant="outline"
                  onClick={() => onOpenPrecedent(flag.employeeId)}
                >
                  <Search />
                  {flag.name} 예규 검토
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <RuleTableDialog open={ruleOpen} onOpenChange={setRuleOpen} rule={rule} />
    </div>
  );
}