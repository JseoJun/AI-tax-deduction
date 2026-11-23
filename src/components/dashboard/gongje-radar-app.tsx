'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calculator,
  CheckCircle2,
  Diff,
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
import { CompliancePanel } from './compliance-panel';
import { CreditResultPanel } from './credit-result-panel';
import { EmployeeRoster } from './employee-roster';
import { ExcelUploadPanel } from './excel-upload-panel';
import { PostCarePanel } from './post-care-panel';
import { PrecedentDrawer } from './precedent-drawer';
import { RosterDiffPanel } from './roster-diff-panel';
import { SimulationPanel } from './simulation-panel';
import { LEGAL_REVIEW_LABEL, formatCount, formatWonShort } from './ui-bits';

const TABS = [
  { value: 'company', label: '회사 정보', icon: Building2 },
  { value: 'upload', label: '엑셀 업로드', icon: FileSpreadsheet },
  { value: 'roster', label: '직원 명부', icon: ListChecks },
  { value: 'result', label: '산출 결과', icon: Calculator },
  { value: 'simulation', label: '시뮬레이션', icon: SlidersHorizontal },
  { value: 'compliance', label: '법령·중복 점검', icon: Gavel },
  { value: 'diff', label: '명부 변화', icon: Diff },
  { value: 'postcare', label: '사후관리', icon: ShieldCheck },
] as const;

type TabValue = (typeof TABS)[number]['value'];

/** 예전 딥링크(?tab=precedents) 호환 */
const TAB_ALIASES: Record<string, TabValue> = {
  precedents: 'compliance',
  'roster-diff': 'diff',
};

export function GongjeRadarApp() {
  const [company, setCompany] = useState<CompanyProfile>(defaultCompanyProfile);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [previousRoster, setPreviousRoster] = useState<EmployeeRecord[] | null>(null);
  const [tab, setTab] = useState<TabValue>('company');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [drawerEmployeeId, setDrawerEmployeeId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // localStorage 는 브라우저에만 존재하므로, 마운트 이후에 한 번만 읽습니다.
  // (서버 렌더 결과와 첫 화면을 일치시킨 뒤 저장값을 반영하는 의도된 하이드레이션 패턴입니다.)
  /* eslint-disable react-hooks/set-state-in-effect */
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
      if (firstSpecial) {
        setSelectedEmployeeId(firstSpecial.employeeId);
        setDrawerEmployeeId(firstSpecial.employeeId);
      }
    }

    const tabParam = params.get('tab');
    if (tabParam) {
      const resolved = TAB_ALIASES[tabParam] ?? tabParam;
      if (TABS.some((item) => item.value === resolved)) {
        setTab(resolved as TabValue);
      }
    }

    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (hydrated) saveCompanyProfile(company);
  }, [company, hydrated]);

  useEffect(() => {
    if (hydrated) saveEmployees(employees);
  }, [employees, hydrated]);

  // 성공 안내는 4초 뒤 자동으로 사라집니다.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const rule = useMemo(
    () => findRule(company.targetYear, company.region, company.size) ?? DEFAULT_RULE,
    [company.targetYear, company.region, company.size],
  );

  const result = useMemo(() => calculateCredits(company, employees, rule), [company, employees, rule]);

  // 직전 명부 기준 금액도 같은 규칙 엔진으로 다시 산출합니다. (화면에서 직접 계산하지 않음)
  const previousResult = useMemo(
    () => (previousRoster && previousRoster.length > 0 ? calculateCredits(company, previousRoster, rule) : null),
    [company, previousRoster, rule],
  );

  const drawerEmployee = useMemo(
    () => employees.find((employee) => employee.employeeId === drawerEmployeeId) ?? null,
    [employees, drawerEmployeeId],
  );

  const drawerJudgmentReason = useMemo(
    () =>
      result.employeeJudgments.find((judgment) => judgment.employeeId === drawerEmployeeId)
        ?.reason,
    [result.employeeJudgments, drawerEmployeeId],
  );

  function openPrecedentDrawer(employeeId: string) {
    setSelectedEmployeeId(employeeId);
    setDrawerEmployeeId(employeeId);
  }

  function loadMockData() {
    applyRoster(mockEmployees27);
    setToast(`샘플 직원 ${mockEmployees27.length}명을 불러왔습니다.`);
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
    setDrawerEmployeeId(null);
    setImportWarnings([]);
    setTab('company');
    setToast('저장된 데이터를 삭제했습니다.');
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
          {result.isRuleVerified ? (
            <Badge variant="outline">규칙 검수 완료</Badge>
          ) : (
            <span className="inline-flex items-center rounded-md border border-amber-300/70 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertTriangle className="mr-1 size-3" />
              {LEGAL_REVIEW_LABEL}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={resetAll}>
            <Trash2 />
            초기화
          </Button>
        </div>
      </header>

      {toast ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-emerald-300/70 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
        >
          <CheckCircle2 className="size-4" />
          {toast}
        </div>
      ) : null}

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
                {item.value === 'compliance' && result.edgeCaseFlags.length > 0 ? (
                  <span className="ml-1 rounded-full bg-destructive/10 px-1.5 text-[0.65rem] font-semibold text-destructive">
                    {result.edgeCaseFlags.length}
                  </span>
                ) : null}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="company">
          <CompanyProfileForm
            company={company}
            onChange={setCompany}
            isRuleVerified={result.isRuleVerified}
          />
        </TabsContent>

        <TabsContent value="upload">
          <ExcelUploadPanel
            onApply={(nextEmployees, warnings) => {
              applyRoster(nextEmployees);
              setImportWarnings(warnings);
              setToast(
                warnings.length > 0
                  ? `직원 ${nextEmployees.length}명을 명부에 반영했습니다. 확인이 필요한 행 ${warnings.length}건이 있습니다.`
                  : `직원 ${nextEmployees.length}명을 명부에 반영했습니다.`,
              );
            }}
            onLoadMock={loadMockData}
          />
        </TabsContent>

        <TabsContent value="roster">
          <EmployeeRoster
            employees={employees}
            judgments={result.employeeJudgments}
            importWarnings={importWarnings}
            onSearchPrecedent={(employee) => openPrecedentDrawer(employee.employeeId)}
          />
        </TabsContent>

        <TabsContent value="result">
          <CreditResultPanel
            company={company}
            result={result}
            rule={rule}
            onOpenPrecedent={openPrecedentDrawer}
          />
        </TabsContent>

        <TabsContent value="simulation">
          <SimulationPanel company={company} employees={employees} rule={rule} result={result} />
        </TabsContent>

        <TabsContent value="compliance">
          <CompliancePanel
            company={company}
            employees={employees}
            rule={rule}
            selectedEmployeeId={selectedEmployeeId}
            onSelectEmployee={setSelectedEmployeeId}
            onOpenDrawer={openPrecedentDrawer}
          />
        </TabsContent>

        <TabsContent value="diff">
          <RosterDiffPanel
            employees={employees}
            previousRoster={previousRoster}
            result={result}
            previousResult={previousResult}
          />
        </TabsContent>

        <TabsContent value="postcare">
          <PostCarePanel company={company} employees={employees} result={result} rule={rule} />
        </TabsContent>
      </Tabs>

      <PrecedentDrawer
        employee={drawerEmployee}
        judgmentReason={drawerJudgmentReason}
        company={company}
        open={drawerEmployee !== null}
        onOpenChange={(open) => {
          if (!open) setDrawerEmployeeId(null);
        }}
      />

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