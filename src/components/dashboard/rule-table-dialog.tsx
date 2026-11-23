'use client';

import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TaxRuleTable } from '@/schemas';
import { InfoRow, VerificationNotice, formatWon } from './ui-bits';

const REGION_LABEL: Record<TaxRuleTable['region'], string> = {
  capital: '수도권',
  non_capital: '비수도권',
};

const SIZE_LABEL: Record<TaxRuleTable['companySize'], string> = {
  sme: '중소기업',
  middle: '중견기업',
};

/**
 * 규칙 테이블(Rule Table) 조회 Modal.
 *
 * 화면에서 쓰인 1인당 공제 단가·법적 근거·필요서류를 그대로 보여주기만 합니다.
 * (프론트에서 값을 계산하거나 보정하지 않습니다.)
 */
export function RuleTableDialog({
  open,
  onOpenChange,
  rule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: TaxRuleTable;
}) {
  const rows = [
    { year: 1, youth: rule.youthCredit[0], regular: rule.regularCredit[0] },
    { year: 2, youth: rule.youthCredit[1], regular: rule.regularCredit[1] },
    { year: 3, youth: rule.youthCredit[2], regular: rule.regularCredit[2] },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            규칙 테이블 (Rule Table)
          </DialogTitle>
          <DialogDescription>
            산출에 사용된 1인당 공제 단가표입니다. 값은 규칙 데이터에서 그대로 가져왔으며
            프론트에서 수정하지 않습니다.
          </DialogDescription>
        </DialogHeader>

        <VerificationNotice isVerified={rule.isVerified} note={rule.verificationNote} />

        <div className="rounded-lg bg-muted/40 px-3 py-1.5">
          <InfoRow label="과세연도">{rule.year}년</InfoRow>
          <InfoRow label="지역">{REGION_LABEL[rule.region]}</InfoRow>
          <InfoRow label="기업 규모">{SIZE_LABEL[rule.companySize]}</InfoRow>
          <InfoRow label="규칙 검수 상태">
            <Badge variant={rule.isVerified ? 'default' : 'destructive'}>
              {rule.isVerified ? '검수 완료' : '검수 필요'}
            </Badge>
          </InfoRow>
        </div>

        <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>구분</TableHead>
                <TableHead className="text-right">1년차</TableHead>
                <TableHead className="text-right">2년차</TableHead>
                <TableHead className="text-right">3년차</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">청년 등 1인당</TableCell>
                {rows.map((row) => (
                  <TableCell key={`youth-${row.year}`} className="text-right tabular-nums">
                    {formatWon(row.youth)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">그 외 1인당</TableCell>
                {rows.map((row) => (
                  <TableCell key={`regular-${row.year}`} className="text-right tabular-nums">
                    {formatWon(row.regular)}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="space-y-1 text-xs">
          <p>
            <span className="text-muted-foreground">근거 법령 · </span>
            {rule.legalBasis}
          </p>
          <p>
            <span className="text-muted-foreground">필요 서류 · </span>
            {rule.requiredDocs.join(', ')}
          </p>
        </div>

        <div className="rounded-lg border border-border px-3 py-1.5">
          <p className="py-1 text-xs font-semibold">
            중소기업특별세액감면 연계 값
            {!rule.smeReductionVerified ? (
              <span className="ml-1 font-normal text-amber-600 dark:text-amber-400">
                (검수 필요)
              </span>
            ) : null}
          </p>
          <InfoRow label="감면 한도 기준액">{formatWon(rule.smeReductionCapBase)}</InfoRow>
          <InfoRow label="1인당 감면 조정액">
            {formatWon(rule.smeReductionPenaltyPerWorker)}
          </InfoRow>
          <InfoRow label="감면 규칙 검수 상태">
            <Badge variant={rule.smeReductionVerified ? 'default' : 'destructive'}>
              {rule.smeReductionVerified ? '검수 완료' : '검수 필요'}
            </Badge>
          </InfoRow>
        </div>

        <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
          ※ 위 값은 Track A 규칙 테이블에서 전달된 원본입니다. 실제 적용 단가·한도는 조특법
          제29조의8 및 시행령 제26조의8 원문과 대조해 확정해야 합니다.
        </p>
      </DialogContent>
    </Dialog>
  );
}