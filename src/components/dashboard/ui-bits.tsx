import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** 금액(원)을 "1,234,567원" 형태로 표시합니다. */
export function formatWon(amount: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(Math.round(amount))}원`;
}

/** 금액을 "1,234만원" 처럼 축약해 표시합니다. (카드용) */
export function formatWonShort(amount: number): string {
  if (Math.abs(amount) >= 100_000_000) {
    return `${(amount / 100_000_000).toFixed(2)}억원`;
  }
  if (Math.abs(amount) >= 10_000) {
    return `${Math.round(amount / 10_000).toLocaleString('ko-KR')}만원`;
  }
  return `${amount.toLocaleString('ko-KR')}원`;
}

export function formatCount(value: number): string {
  return `${value.toLocaleString('ko-KR')}명`;
}

const TONE_CLASS: Record<'neutral' | 'positive' | 'negative' | 'warning', string> = {
  neutral: 'text-foreground',
  positive: 'text-emerald-600 dark:text-emerald-400',
  negative: 'text-rose-600 dark:text-rose-400',
  warning: 'text-amber-600 dark:text-amber-400',
};

export function StatCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: keyof typeof TONE_CLASS;
}) {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-xl font-semibold tabular-nums', TONE_CLASS[tone])}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function WarningBanner({
  title,
  children,
  tone = 'warning',
}: {
  title: string;
  children?: ReactNode;
  tone?: 'warning' | 'info' | 'danger' | 'success';
}) {
  const toneClass = {
    warning:
      'border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200',
    info: 'border-sky-300/70 bg-sky-50 text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200',
    danger:
      'border-rose-300/70 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200',
    success:
      'border-emerald-300/70 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200',
  }[tone];

  return (
    <div className={cn('rounded-lg border px-3 py-2 text-xs leading-relaxed', toneClass)}>
      <p className="font-semibold">{title}</p>
      {children ? <div className="mt-1 space-y-1">{children}</div> : null}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 법령 검수 상태 표시
// ─────────────────────────────────────────────────────────────

/**
 * 규칙 데이터가 검수되지 않았을 때 반드시 노출해야 하는 문구입니다.
 * (`isVerified === false` 인 모든 화면에서 이 문자열을 그대로 보여줍니다.)
 */
export const LEGAL_REVIEW_LABEL = '▲ 법령 원문 검수 필요';

/**
 * 규칙 테이블의 검수 여부를 표시합니다.
 * isVerified 가 true 이면 아무것도 그리지 않습니다.
 */
export function VerificationNotice({
  isVerified,
  note,
  compact = false,
}: {
  isVerified: boolean;
  note?: string;
  compact?: boolean;
}) {
  if (isVerified) return null;

  if (compact) {
    return (
      <span className="inline-flex items-center rounded-md border border-amber-300/70 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
        {LEGAL_REVIEW_LABEL}
      </span>
    );
  }

  return (
    <WarningBanner title={LEGAL_REVIEW_LABEL}>
      <p>{note ?? '규칙 테이블이 아직 검수되지 않았습니다. 금액은 참고용이며 법령 원문 대조가 필요합니다.'}</p>
      <p>세무사가 조특법 원문과 대조한 뒤에 신고 자료로 사용하세요.</p>
    </WarningBanner>
  );
}

/** 라벨/값 한 줄 (Modal·Drawer 안에서 사용) */
export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-1.5 last:border-b-0">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-xs font-medium">{children}</span>
    </div>
  );
}