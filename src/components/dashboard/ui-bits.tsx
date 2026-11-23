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
  tone?: 'warning' | 'info' | 'danger';
}) {
  const toneClass = {
    warning:
      'border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200',
    info: 'border-sky-300/70 bg-sky-50 text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200',
    danger:
      'border-rose-300/70 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200',
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