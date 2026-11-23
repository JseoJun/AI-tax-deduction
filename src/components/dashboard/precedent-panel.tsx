'use client';

import { useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiRequestError, searchPrecedents } from '@/lib/api-client';
import type { CompanyProfile, EmployeeRecord, RagPrecedentResponse } from '@/schemas';
import { EmptyState, WarningBanner, formatWon, SectionHeading } from './ui-bits';

const SPECIAL_LABEL: Record<EmployeeRecord['specialFlag'], string> = {
  NONE: '일반',
  PARENTAL_LEAVE: '육아휴직',
  PART_TIME_PRO_RATA: '단시간 비례',
  BUSINESS_SUCCESSION: '고용승계',
  REHIRED_SAME_YEAR: '연내 재입사',
};

export function PrecedentPanel({
  employees,
  company,
  selectedEmployeeId,
  onSelectEmployee,
}: {
  employees: EmployeeRecord[];
  company: CompanyProfile;
  selectedEmployeeId: string | null;
  onSelectEmployee: (employeeId: string | null) => void;
}) {
  const candidates = employees.filter((employee) => employee.specialFlag !== 'NONE');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RagPrecedentResponse | null>(null);

  const selected = candidates.find((employee) => employee.employeeId === selectedEmployeeId) ?? null;

  useEffect(() => {
    if (!selected) {
      setData(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError(null);

    searchPrecedents(
      {
        specialFlag: selected.specialFlag as Exclude<EmployeeRecord['specialFlag'], 'NONE'>,
        specialNote: selected.specialNote,
        targetYear: company.targetYear,
        companySize: company.size,
      },
      { signal: controller.signal },
    )
      .then((response) => {
        if (!active) return;
        setData(response);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(
          caught instanceof ApiRequestError
            ? caught.message
            : '예규 검색 중 오류가 발생했습니다.',
        );
        setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [selected, company.targetYear, company.size]);

  if (candidates.length === 0) {
    return (
      <EmptyState
        title="검색할 특수 케이스가 없습니다"
        description="육아휴직·단시간·고용승계·연내 재입사 직원이 있어야 예규 검색을 사용할 수 있습니다."
      />
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeading
        title="관련 예규·법령 검색 (Track B)"
        description="AI가 최종 판정을 내리지 않습니다. 검색된 예규를 근거로 세무사가 직접 판단합니다."
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 space-y-1.5">
          <Label className="text-xs">검토할 직원</Label>
          <Select
            items={Object.fromEntries(
              candidates.map((employee) => [
                employee.employeeId,
                `${employee.name} · ${SPECIAL_LABEL[employee.specialFlag]}`,
              ]),
            )}
            value={selectedEmployeeId ?? ''}
            onValueChange={(value) => onSelectEmployee(String(value) || null)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="직원을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((employee) => (
                <SelectItem key={employee.employeeId} value={employee.employeeId}>
                  {employee.name} · {SPECIAL_LABEL[employee.specialFlag]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selected ? (
          <Button
            variant="outline"
            onClick={() => onSelectEmployee(selected.employeeId)}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" /> : <Search />}
            다시 검색
          </Button>
        ) : null}
      </div>

      {selected?.specialNote ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-xs">
          <b>비고</b> · {selected.specialNote}
        </p>
      ) : null}

      {error ? (
        <WarningBanner title="예규 검색 실패" tone="danger">
          <p>{error}</p>
        </WarningBanner>
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="animate-spin" />
          예규 지식베이스를 검색하는 중…
        </p>
      ) : null}

      {!loading && data ? (
        <div className="space-y-3">
          <WarningBanner title="검색된 쟁점" tone="info">
            <p>{data.exceptionReason}</p>
          </WarningBanner>

          {data.precedents.length === 0 ? (
            <WarningBanner title="관련 예규를 찾지 못했습니다">
              <p>
                신뢰도 기준(0.60)을 넘는 예규가 없습니다. 국세법령정보시스템에서 직접 확인하세요.
              </p>
            </WarningBanner>
          ) : (
            data.precedents.map((precedent) => (
              <Card key={precedent.docId}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    {precedent.title}
                    <Badge variant="secondary">
                      관련도 {Math.round(precedent.relevanceScore * 100)}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="leading-relaxed">{precedent.summary}</p>
                  <p className="font-mono text-xs text-muted-foreground">{precedent.docId}</p>
                  <p className="text-xs text-muted-foreground">{precedent.citation}</p>
                </CardContent>
              </Card>
            ))
          )}

          <p className="text-xs text-muted-foreground">
            ※ 예규는 참고 자료입니다. 최종 판단과 책임은 세무사에게 있습니다.
          </p>
        </div>
      ) : null}
    </div>
  );
}