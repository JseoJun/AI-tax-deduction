'use client';

import { AlertTriangle, CheckCircle2, CircleHelp, Scale } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  CompanyProfile,
  ComplianceAndPostCare,
  EmployeeRecord,
  TaxRuleTable,
} from '@/schemas';
import { PrecedentPanel } from './precedent-panel';
import { SectionHeading, VerificationNotice, formatWon, WarningBanner } from './ui-bits';

const APPLIED_CREDIT_LABEL: Record<CompanyProfile['appliedCredits'][number], string> = {
  sme_special: '중소기업특별세액감면',
  investment: '투자세액공제',
  rnd: '연구·인력개발비세액공제',
};

type CheckTone = 'review' | 'clear';

interface CheckItem {
  key: string;
  title: string;
  tone: CheckTone;
  detail: string;
  statute: string;
}

/**
 * 법령·중복 혜택 점검 탭.
 *
 * ⚠ 이 화면은 "중복 적용 가능/불가"를 단정하지 않습니다.
 *    규칙 데이터(rule)와 회사 정보(company)에 입력된 값만 근거로
 *    "확인 필요 / 입력값상 해당 없음" 두 상태로 표시하고, 최종 판단은 세무사에게 남깁니다.
 */
export function CompliancePanel({
  company,
  employees,
  rule,
  selectedEmployeeId,
  onSelectEmployee,
  onOpenDrawer,
  compliance,
}: {
  company: CompanyProfile;
  employees: EmployeeRecord[];
  rule: TaxRuleTable;
  selectedEmployeeId: string | null;
  onSelectEmployee: (employeeId: string | null) => void;
  onOpenDrawer?: (employeeId: string) => void;
  /** Team 1/3 이 제공하면 그대로 표시합니다. 없으면 아래 체크리스트로 대체합니다. */
  compliance?: ComplianceAndPostCare | null;
}) {
  const otherCredits = company.appliedCredits.filter((credit) => credit !== 'sme_special');
  const usesSmeReduction = company.appliedCredits.includes('sme_special');

  const checks: CheckItem[] = [
    {
      key: 'sme-special',
      title: '중소기업특별세액감면과의 중복 적용 여부',
      tone: usesSmeReduction ? 'review' : 'clear',
      detail: usesSmeReduction
        ? '회사 정보에 중소기업특별세액감면을 함께 적용한다고 입력되어 있습니다. 동일 과세연도에 통합고용세액공제와 함께 적용할 수 있는지 확인이 필요합니다.'
        : '회사 정보에 중소기업특별세액감면이 입력되어 있지 않습니다. 실제 신고 내역과 다르면 회사 정보를 수정하세요.',
      statute: '조세특례제한법 제7조 · 제29조의8 (중복 적용 배제 여부 확인)',
    },
    {
      key: 'other-credits',
      title: '다른 세액공제와의 관계',
      tone: otherCredits.length > 0 ? 'review' : 'clear',
      detail:
        otherCredits.length > 0
          ? `선택된 공제: ${otherCredits.map((credit) => APPLIED_CREDIT_LABEL[credit]).join(', ')}. 공제 항목 간 적용 순서·한도 상호작용을 확인해야 합니다.`
          : '투자세액공제·연구인력개발비세액공제는 선택되어 있지 않습니다.',
      statute: '조세특례제한법 제24조 · 제10조 (공제 적용 순서 및 한도)',
    },
    {
      key: 'minimum-tax',
      title: '최저한세 적용 가능성',
      tone: 'review',
      detail:
        compliance?.minimumTaxNotice ??
        '최저한세가 적용되는 경우 산출된 공제액이 전액 반영되지 않을 수 있습니다. 계산세액과 감면 후 세액을 함께 확인하세요.',
      statute: '조세특례제한법 제132조 (최저한세)',
    },
    {
      key: 'sme-verified',
      title: '감면 연계 규칙 검수 상태',
      tone: rule.smeReductionVerified ? 'clear' : 'review',
      detail: rule.smeReductionVerified
        ? `감면 한도 기준액 ${formatWon(rule.smeReductionCapBase)} · 1인당 조정액 ${formatWon(rule.smeReductionPenaltyPerWorker)} (검수 완료)`
        : `감면 한도 기준액 ${formatWon(rule.smeReductionCapBase)} · 1인당 조정액 ${formatWon(rule.smeReductionPenaltyPerWorker)} 값이 아직 검수되지 않았습니다.`,
      statute: '조세특례제한법 제7조의4 (중소기업특별세액감면 한도)',
    },
  ];

  return (
    <div className="space-y-5">
      <SectionHeading
        title="법령 · 중복 혜택 점검"
        description="규칙 데이터와 회사 정보에 입력된 값만으로 점검 항목을 표시합니다. 판정은 세무사가 합니다."
      />

      <VerificationNotice isVerified={rule.isVerified} note={rule.verificationNote} />

      <div className="space-y-3">
        <SectionHeading
          title="중복 혜택 체크리스트"
          description="표시된 상태는 입력값 기준이며, 실제 적용 가능 여부를 의미하지 않습니다."
        />

        {compliance?.duplicateWarnings?.length ? (
          <div className="space-y-2">
            {compliance.duplicateWarnings.map((warning) => (
              <WarningBanner
                key={`${warning.creditType}-${warning.statuteRef}`}
                title={`검토 의견 · ${warning.creditType}`}
                tone="warning"
              >
                <p>{warning.message}</p>
                <p className="font-mono text-[0.7rem]">{warning.statuteRef}</p>
              </WarningBanner>
            ))}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {checks.map((check) => (
            <Card key={check.key}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                  {check.tone === 'review' ? (
                    <CircleHelp className="size-4 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <CheckCircle2 className="size-4 text-muted-foreground" />
                  )}
                  {check.title}
                  <Badge variant={check.tone === 'review' ? 'secondary' : 'outline'}>
                    {check.tone === 'review' ? '확인 필요' : '입력값상 해당 없음'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-xs">
                <p className="leading-relaxed">{check.detail}</p>
                <p className="font-mono text-[0.7rem] text-muted-foreground">{check.statute}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Scale className="size-4 text-muted-foreground" />
            중소기업특별세액감면 비교 (입력값 기준)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-xs sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">감면 적용 여부</p>
            <p className="font-medium">{usesSmeReduction ? '적용 선택됨' : '선택 없음'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">감면률</p>
            <p className="font-medium tabular-nums">
              {(company.smeReductionRate * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">한도 기준액</p>
            <p className="font-medium tabular-nums">{formatWon(rule.smeReductionCapBase)}</p>
          </div>
          {!rule.smeReductionVerified ? (
            <p className="text-[0.7rem] text-amber-600 sm:col-span-3 dark:text-amber-400">
              ▲ 법령 원문 검수 필요 — 감면 한도·조정액이 확정되지 않았으므로 위 값으로 실제 감면
              세액을 계산하지 않습니다.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <SectionHeading
          title="특수 케이스 예규 검색"
          description="육아휴직·단시간·고용승계·연내 재입사 직원의 관련 예규를 조회합니다."
        />
        <PrecedentPanel
          employees={employees}
          company={company}
          selectedEmployeeId={selectedEmployeeId}
          onSelectEmployee={onSelectEmployee}
          onOpenDrawer={onOpenDrawer}
        />
      </div>

      <p className="flex items-start gap-1.5 text-[0.7rem] leading-relaxed text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-3 shrink-0" />
        이 탭의 문구는 참고용 체크리스트이며, 세액공제의 적용 가능 여부를 확정하지 않습니다.
      </p>
    </div>
  );
}