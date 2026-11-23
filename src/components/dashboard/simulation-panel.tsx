'use client';

import { useMemo, useState } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { simulateCredits } from '@/lib/rules/calculateCredits';
import type {
  CalculationResult,
  CompanyProfile,
  EmployeeRecord,
  SimulationRequest,
  TaxRuleTable,
} from '@/schemas';
import {
  EmptyState,
  StatCard,
  VerificationNotice,
  WarningBanner,
  formatCount,
  formatWon,
  formatWonShort,
} from './ui-bits';

const INITIAL_SIMULATION: SimulationRequest = {
  addYouth: 0,
  addRegular: 0,
  removeYouth: 0,
  removeRegular: 0,
};

function NumberField({
  id,
  label,
  value,
  onChange,
  max,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (next: number) => void;
  max?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onChange(Math.max(0, value - 1))}
          aria-label={`${label} 줄이기`}
        >
          <Minus />
        </Button>
        <Input
          id={id}
          className="w-16 text-center"
          inputMode="numeric"
          value={value}
          onChange={(event) => {
            const parsed = Number(event.target.value.replace(/[^\d]/g, '')) || 0;
            onChange(max != null ? Math.min(max, parsed) : parsed);
          }}
        />
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onChange(max != null ? Math.min(max, value + 1) : value + 1)}
          aria-label={`${label} 늘리기`}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}

export function SimulationPanel({
  company,
  employees,
  rule,
  result,
}: {
  company: CompanyProfile;
  employees: EmployeeRecord[];
  rule: TaxRuleTable;
  result: CalculationResult;
}) {
  const [simulation, setSimulation] = useState<SimulationRequest>(INITIAL_SIMULATION);

  const simulated = useMemo(
    () => simulateCredits(company, employees, rule, simulation),
    [company, employees, rule, simulation],
  );

  if (result.currCount === 0) {
    return (
      <EmptyState
        title="시뮬레이션할 직원 명부가 없습니다"
        description="‘엑셀 업로드’ 탭에서 명부를 먼저 불러오세요."
      />
    );
  }

  const deltaTotal = simulated.deltaTotalCredit;
  const changed =
    simulation.addYouth !== 0 ||
    simulation.addRegular !== 0 ||
    simulation.removeYouth !== 0 ||
    simulation.removeRegular !== 0;

  return (
    <div className="space-y-4">
      <WarningBanner title="시뮬레이션은 현재 명부를 기준으로 즉시 재계산됩니다" tone="info">
        <p>
          명부 자체는 바뀌지 않습니다. ‘채용/퇴사 계획’을 넣어 금액 변화만 미리 확인하는
          화면입니다.
        </p>
      </WarningBanner>

      <VerificationNotice isVerified={result.isRuleVerified} note={rule.verificationNote} />

      <div className="grid gap-4 rounded-xl bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField
          id="add-youth"
          label="청년 채용 (+)"
          value={simulation.addYouth}
          onChange={(next) => setSimulation((prev) => ({ ...prev, addYouth: next }))}
        />
        <NumberField
          id="add-regular"
          label="일반 채용 (+)"
          value={simulation.addRegular}
          onChange={(next) => setSimulation((prev) => ({ ...prev, addRegular: next }))}
        />
        <NumberField
          id="remove-youth"
          label="청년 퇴사 (−)"
          value={simulation.removeYouth}
          max={result.youthCount === 0 ? result.currCount : undefined}
          onChange={(next) => setSimulation((prev) => ({ ...prev, removeYouth: next }))}
        />
        <NumberField
          id="remove-regular"
          label="일반 퇴사 (−)"
          value={simulation.removeRegular}
          onChange={(next) => setSimulation((prev) => ({ ...prev, removeRegular: next }))}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setSimulation(INITIAL_SIMULATION)}>
          <RotateCcw />
          초기화
        </Button>
        <span className="text-xs text-muted-foreground">
          청년 1명당 1년차 {formatWonShort(rule.youthCredit[0])} · 일반 1명당{' '}
          {formatWonShort(rule.regularCredit[0])} 기준으로 계산됩니다.
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="현재 상시근로자" value={formatCount(simulated.baseline.currCount)} />
        <StatCard
          label="시뮬레이션 후"
          value={formatCount(simulated.simulated.currCount)}
          tone={
            simulated.simulated.currCount > simulated.baseline.currCount
              ? 'positive'
              : simulated.simulated.currCount < simulated.baseline.currCount
                ? 'negative'
                : 'neutral'
          }
        />
        <StatCard label="현재 3년 합계" value={formatWonShort(simulated.baseline.totalCredit)} />
        <StatCard
          label="변화 후 3년 합계"
          value={formatWonShort(simulated.simulated.totalCredit)}
          tone={changed ? (deltaTotal >= 0 ? 'positive' : 'negative') : 'neutral'}
          hint={
            changed
              ? `변화 ${deltaTotal >= 0 ? '+' : ''}${formatWon(deltaTotal)}`
              : '조건을 입력하면 변화가 표시됩니다'
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((index) => {
          const delta = simulated.deltaYearlyCredits[index];
          return (
            <StatCard
              key={index}
              label={`${index + 1}년차 공제액`}
              value={formatWonShort(simulated.simulated.yearlyCredits[index])}
              tone={delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral'}
              hint={`현재 ${formatWon(simulated.baseline.yearlyCredits[index])} → ${
                delta === 0 ? '변화 없음' : `${delta > 0 ? '+' : ''}${formatWon(delta)}`
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}