'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { ExternalLink, Loader2, RotateCcw, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CompanyProfile, EmployeeRecord } from '@/schemas';
import { PrecedentResult } from './precedent-result';
import { InfoRow, LEGAL_REVIEW_LABEL } from './ui-bits';
import { usePrecedents } from './use-precedents';

const SPECIAL_LABEL: Record<EmployeeRecord['specialFlag'], string> = {
  NONE: '일반',
  PARENTAL_LEAVE: '육아휴직',
  PART_TIME_PRO_RATA: '단시간 비례',
  BUSINESS_SUCCESSION: '고용승계',
  REHIRED_SAME_YEAR: '연내 재입사',
};

const CONTRACT_LABEL: Record<EmployeeRecord['contractType'], string> = {
  regular: '정규직',
  over_1y: '1년 이상 계약',
  under_1y: '1년 미만 계약',
  short_time_under_60h: '단시간(60h 미만)',
};

/**
 * NEEDS_REVIEW 직원의 관련 예규를 오른쪽 Drawer 로 보여줍니다.
 *
 * - 직원 명부에서 '예규 검색' 을 누르면 열립니다.
 * - 서버로는 특이사항 구분/비고만 전달되며, 이름·생년월일 등 개인정보는 전송하지 않습니다.
 * - 결과는 참고용이며 판정 문구는 포함하지 않습니다.
 */
export function PrecedentDrawer({
  employee,
  judgmentReason,
  company,
  open,
  onOpenChange,
}: {
  employee: EmployeeRecord | null;
  judgmentReason?: string;
  company: CompanyProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, loading, error, reload } = usePrecedents({ employee, company, enabled: open });

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/20 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          className="fixed inset-y-0 right-0 z-50 flex h-dvh w-full max-w-[27rem] flex-col overflow-y-auto bg-card p-4 text-sm text-card-foreground shadow-xl ring-1 ring-foreground/10 outline-none duration-150 data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right"
          aria-labelledby="precedent-drawer-title"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <DialogPrimitive.Title
                id="precedent-drawer-title"
                className="text-base font-semibold"
              >
                특수 케이스 예규 검토
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-0.5 text-xs text-muted-foreground">
                검색 결과는 참고 자료입니다. 산입 여부 판단은 세무사가 직접 합니다.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              render={<Button variant="ghost" size="icon-sm" aria-label="닫기" />}
            >
              <X />
            </DialogPrimitive.Close>
          </div>

          {employee ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="destructive">검토 필요</Badge>
                <Badge variant="outline">
                  {SPECIAL_LABEL[employee.specialFlag]}
                </Badge>
                <Badge variant="outline">{CONTRACT_LABEL[employee.contractType]}</Badge>
                {employee.isExecutive ? <Badge variant="outline">임원</Badge> : null}
              </div>

              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-sm font-medium">{employee.name}</p>
                <p className="font-mono text-[0.7rem] text-muted-foreground">
                  {employee.employeeId}
                </p>
                <div className="mt-2">
                  <InfoRow label="입사일">{employee.hireDate}</InfoRow>
                  <InfoRow label="퇴사일">{employee.resignDate ?? '-'}</InfoRow>
                  <InfoRow label="병역 개월">{employee.militaryMonths}개월</InfoRow>
                </div>
              </div>

              {employee.specialNote ? (
                <div className="rounded-lg border border-border px-3 py-2">
                  <p className="text-[0.7rem] font-semibold text-muted-foreground">비고</p>
                  <p className="mt-0.5 text-xs leading-relaxed">{employee.specialNote}</p>
                </div>
              ) : null}

              {judgmentReason ? (
                <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                  <p className="font-semibold">규칙 엔진 1차 판정</p>
                  <p className="mt-0.5">{judgmentReason}</p>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={reload} disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : <RotateCcw />}
                  다시 검색
                </Button>
                <span className="text-[0.7rem] text-muted-foreground">
                  대상 과세연도 {company.targetYear}년 · {LEGAL_REVIEW_LABEL}
                </span>
              </div>

              <PrecedentResult
                loading={loading}
                error={error}
                data={data}
                onRetry={reload}
              />

              <div className="mt-auto border-t pt-2">
                <a
                  className="inline-flex items-center gap-1 text-[0.7rem] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  href="https://taxlaw.nts.go.kr"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  국세법령정보시스템에서 원문 확인
                  <ExternalLink className="size-3" />
                </a>
                <p className="mt-1 text-[0.7rem] leading-relaxed text-muted-foreground">
                  이 화면은 직원의 이름·생년월일을 서버로 보내지 않습니다.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">표시할 직원이 없습니다.</p>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}