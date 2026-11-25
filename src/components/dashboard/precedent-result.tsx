'use client';

import { Loader2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RagPrecedentResponse } from '@/schemas';
import { EmptyState, WarningBanner } from './ui-bits';

/**
 * 예규 검색 결과 표시 전용 컴포넌트.
 *
 * Drawer(직원 명부에서 열기)와 탭(법령·중복 점검) 양쪽에서 같은 UI 를 씁니다.
 * 여기서는 어떤 판정도 내리지 않고, 검색된 예규 원문 요약만 보여줍니다.
 */
export function PrecedentResult({
  loading,
  error,
  data,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  data: RagPrecedentResponse | null;
  onRetry?: () => void;
}) {
  return (
    <div className="space-y-3">
      {loading ? (
        <p className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          예규 지식베이스를 검색하는 중…
        </p>
      ) : null}

      {error ? (
        <div className="space-y-2">
          <WarningBanner title="예규 검색 실패" tone="danger">
            <p>{error}</p>
          </WarningBanner>
          {onRetry ? (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <Search />
              다시 시도
            </Button>
          ) : null}
        </div>
      ) : null}

      {!loading && !error && data ? (
        <div className="space-y-3">
          {data.precedents.length === 0 ? (
            <EmptyState
              title="신뢰도 기준을 넘는 예규가 없습니다"
              description="국세법령정보시스템에서 직접 확인하세요. 확인되지 않은 사례를 임의로 추정하지 않습니다."
            />
          ) : (
            data.precedents.map((precedent) => (
              <Card key={precedent.docId}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                    {precedent.title}
                    <Badge variant="secondary">
                      관련도 {Math.round(precedent.relevanceScore * 100)}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-xs">
                  <p className="leading-relaxed">{precedent.summary}</p>
                  <p className="font-mono text-[0.7rem] text-muted-foreground">
                    {precedent.docId}
                  </p>
                  <p className="text-muted-foreground">{precedent.citation}</p>
                </CardContent>
              </Card>
            ))
          )}

          <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
            ※ 검색 결과는 참고 자료입니다. 산입 여부·공제 가능 여부에 대한 최종 판단과 책임은
            세무사에게 있습니다.
          </p>
        </div>
      ) : null}

      {!loading && !error && !data ? (
        <EmptyState
          title="아직 검색 전입니다"
          description="검토할 직원을 선택하면 관련 예규를 조회합니다."
        />
      ) : null}
    </div>
  );
}