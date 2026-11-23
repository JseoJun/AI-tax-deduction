'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Calculator,
  FileSpreadsheet,
  Gavel,
  ListChecks,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DEFAULT_RULE, findRule } from '@/data/defaultRules';
import { defaultCompanyProfile, mockEmployees27 } from '@/data/mockEmployees27';
import { calculateCredits } from '@/lib/rules/calculateCredits';
import {
  clearStorage,
  loadCompanyProfile,
  loadEmployees,
  loadPreviousRoster,
  saveCompanyProfile,
  saveEmployees,
  savePreviousRoster,
} from '@/lib/storage';
import type { CompanyProfile, EmployeeRecord } from '@/schemas';
import { CompanyProfileForm } from './company-profile-form';
import { CreditResultPanel } from './credit-result-panel';
import { EmployeeRoster } from './employee-roster';
import { ExcelUploadPanel } from './excel-upload-panel';
import { PostCarePanel } from './post-care-panel';
import { PrecedentPanel } from './precedent-panel';
import { SimulationPanel } from './simulation-panel';
import { formatCount, formatWonShort } from './ui-bits';

const TABS = [
  { value: 'company', label: '회사 정보', icon: Building2 },
  { value: 'upload', label: '엑셀 업로드', icon: FileSpreadsheet },
  { value: 'roster', label: '직원 명부', icon: ListChecks },
  { value: 'result', label: '산출 결과', icon: Calculator },
  { value: 'simulation', label: '시뮬레이션', icon: SlidersHorizontal },
  { value: 'precedents', label: '예규·법령', icon: Gavel },
  { value: 'postcare', label: '사후관리', icon: ShieldCheck },
] as const;

type TabValue = (typeof TABS)[number]['value'];

export function GongjeRadarApp() {
  const [company, setCompany] = useState<CompanyProfile>(defaultCompanyProfile);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [previousRoster, setPreviousRoster] = useState<EmployeeRecord[] | null>(null);
  const [tab, setTab] = useState<TabValue>('company');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // localStorage 는 브라우저에만 존재하므로, 마운트 이후에 읽습니다. (hydration 불일치 방지)
  useEffect(() => {
    const storedCompany = loadCompanyProfile();
    if (storedCompany) setCompany(storedCompany);

    const storedEmployees = loadEmployees();
    if (storedEmployees) setEmployees(storedEmployees);
    setPreviousRoster(loadPreviousRoster());

    // 데모용 딥링크: /?demo=1&tab=result 처럼 열면 샘플 27명으로 바로 확인할 수 있습니다.
    const params = new URLSearchParams(window.location.search);
    const isDemo = params.get('demo') === '1';

    if (isDemo) {
      if (!storedEmployees) setEmployees(mockEmployees27);
      const firstSpecial = mockEmployees27.find((employee) => employee.specialFlag !== 'NONE');
      if (firstSpecial) setSelectedEmployeeId(firstSpecial.employeeId);
    }

    const tabParam = params.get('tab');
    if (tabParam && TABS.some((item) => item.value === tabParam)) {
      setTab(tabParam as TabValue);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveCompanyProfile(company);
  }, [company, hydrated]);

  useEffect(() => {
    if (hydrated) saveEmployees(employees);
  }, [employees, hydrated]);

  const rule = useMemo(
    () => findRule(company.targetYear, company.region, company.size) ?? DEFAULT_RULE,
    [company.targetYear, company.region, company.size],
  );

  const result = useMemo(() => calculateCredits(company, employees, rule), [company, employees, rule]);

  function loadMockData() {
    applyRoster(mockEmployees27);
  }

  /** 새 명부를 적용합니다. 기존 명부는 ‘직전 명부’로 보관해 변동 내역 비교에 씁니다. */
  function applyRoster(nextEmployees: EmployeeRecord[]) {
    if (employees.length > 0) {
      savePreviousRoster(employees);
      setPreviousRoster(employees);
    }
    setEmployees(nextEmployees);
    setTab('roster');
  }

  function resetAll() {
    clearStorage();
    setCompany(defaultCompanyProfile);
    setEmployees([]);
    setPreviousRoster(null);
    setSelectedEmployeeId(null);
    setTab('company');
  }

  function searchPrecedentFor(employee: EmployeeRecord) {
    setSelectedEmployeeId(employee.employeeId);
    setTab('precedents');
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Sparkles className="size-5 text-muted-foreground" />
            Gongje Radar
            <span className="text-sm font-normal text-muted-foreground">공제레이더</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            직원 명부 기반 고용 관련 세액공제 산출 · 시뮬레이션 (세무사무소용)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{company.name || '회사명 미입력'}</Badge>
          <Badge variant="outline">{company.targetYear}년</Badge>
          <Badge variant="outline">{formatCount(employees.length)}</Badge>
          <Badge variant={result.isRuleVerified ? 'default' : 'destructive'}>
            {result.isRuleVerified ? '규칙 검증됨' : '규칙 미검증'}
          </Badge>
          <Button variant="ghost" size="sm" onClick={resetAll}>
            <Trash2 />
            초기화
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
          <p className="text-xs text-muted-foreground">순증가 인원</p>
          <p className="text-lg font-semibold tabular-nums">{formatCount(result.netIncrease)}</p>
        </div>
        <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
          <p className="text-xs text-muted-foreground">3년 합계 공제액</p>
          <p className="text-lg font-semibold tabular-nums">
            {formatWonShort(result.totalCredit)}
          </p>
        </div>
        <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
          <p className="text-xs text-muted-foreground">검토 필요</p>
          <p className="text-lg font-semibold tabular-nums">
            {formatCount(result.edgeCaseFlags.length)}
          </p>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab((value as TabValue) ?? 'company')}
        className="gap-4"
      >
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 p-1">
          {TABS.map((item) => {
            const Icon = item.icon;
            return (
              <TabsTrigger key={item.value} value={item.value} className="px-2.5 py-1.5">
                <Icon className="size-4" />
                {item.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="company">
          <CompanyProfileForm company={company} onChange={setCompany} />
        </TabsContent>

        <TabsContent value="upload">
          <ExcelUploadPanel
            onApply={(nextEmployees) => applyRoster(nextEmployees)}
            onLoadMock={loadMockData}
          />
        </TabsContent>

        <TabsContent value="roster">
          <EmployeeRoster
            employees={employees}
            judgments={result.employeeJudgments}
            onSearchPrecedent={searchPrecedentFor}
          />
        </TabsContent>

        <TabsContent value="result">
          <CreditResultPanel company={company} result={result} rule={rule} />
        </TabsContent>

        <TabsContent value="simulation">
          <SimulationPanel company={company} employees={employees} rule={rule} result={result} />
        </TabsContent>

        <TabsContent value="precedents">
          <PrecedentPanel
            employees={employees}
            company={company}
            selectedEmployeeId={selectedEmployeeId}
            onSelectEmployee={setSelectedEmployeeId}
          />
        </TabsContent>

        <TabsContent value="postcare">
          <PostCarePanel
            company={company}
            employees={employees}
            previousRoster={previousRoster}
            result={result}
            rule={rule}
          />
        </TabsContent>
      </Tabs>

      <footer className="mt-auto border-t pt-3 text-xs text-muted-foreground">
        <p>
          직원 정보는 이 브라우저(localStorage)에만 저장되며 서버로 전송되지 않습니다. 엑셀
          매핑·예규 검색 시에는 열 이름과 특이사항만 서버 API로 전달됩니다.
        </p>
        <p className="mt-1">
          산출 금액은 참고용이며, 최종 신고 전 세무사 검토가 필요합니다.
        </p>
      </footer>
    </div>
  );
}