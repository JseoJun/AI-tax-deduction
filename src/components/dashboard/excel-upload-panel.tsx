'use client';

import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiRequestError, mapColumns } from '@/lib/api-client';
import {
  FIELD_LABELS,
  buildEmployeesFromRows,
  parseEmployeeExcel,
  type ParsedSheet,
  type StandardField,
} from '@/lib/excel';
import type { EmployeeRecord } from '@/schemas';
import { WarningBanner, formatCount } from './ui-bits';

const MAPPING_ITEMS: Record<string, string> = {
  employeeId: '사번 (employeeId)',
  name: '성명 (name)',
  birthDate: '생년월일 (birthDate)',
  hireDate: '입사일 (hireDate)',
  resignDate: '퇴사일 (resignDate)',
  contractType: '계약형태 (contractType)',
  isExecutive: '임원여부 (isExecutive)',
  militaryMonths: '병역개월 (militaryMonths)',
  specialFlag: '특이사항 구분 (specialFlag)',
  specialNote: '비고 (specialNote)',
  IGNORE: '사용 안 함 (IGNORE)',
};

const REQUIRED_FIELDS: StandardField[] = ['hireDate', 'birthDate'];

type MappingSource = 'AI' | 'KEYWORD_FALLBACK';

export function ExcelUploadPanel({
  onApply,
  onLoadMock,
}: {
  onApply: (employees: EmployeeRecord[], warnings: string[]) => void;
  onLoadMock: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [source, setSource] = useState<MappingSource | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [appliedCount, setAppliedCount] = useState<number | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    setWarnings([]);
    setAppliedCount(null);
    setParsed(null);
    setMapping({});
    setConfidence({});
    setSource(null);

    try {
      const sheet = await parseEmployeeExcel(file);
      setParsed(sheet);

      // ✅ API #1 호출: 열 이름 배열만 서버로 보냅니다. (직원 데이터는 전송하지 않음)
      const result = await mapColumns(sheet.headers);
      setMapping(result.mapping);
      setConfidence(result.confidence);
      setSource(result.source);
    } catch (caught) {
      const message =
        caught instanceof ApiRequestError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : '엑셀을 읽지 못했습니다.';
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  const mappedFields = useMemo(
    () => Object.values(mapping).filter((field) => field !== 'IGNORE'),
    [mapping],
  );

  /** 같은 표준 필드에 두 개 이상의 열이 연결된 경우 (마지막 열만 반영됨) */
  const duplicateTargets = useMemo(() => {
    const grouped = new Map<string, string[]>();
    for (const [header, field] of Object.entries(mapping)) {
      if (field === 'IGNORE') continue;
      grouped.set(field, [...(grouped.get(field) ?? []), header]);
    }
    return [...grouped.entries()].filter(([, headers]) => headers.length > 1);
  }, [mapping]);

  const missingRequired = REQUIRED_FIELDS.filter((field) => !mappedFields.includes(field));
  const hasIdentifier = mappedFields.includes('name') || mappedFields.includes('employeeId');
  const canApply = Boolean(parsed) && missingRequired.length === 0 && hasIdentifier;

  function applyMapping() {
    if (!parsed) return;
    if (!canApply) {
      setError('필수 항목(입사일·생년월일·성명/사번)이 매핑되지 않아 명부를 만들 수 없습니다.');
      return;
    }

    const { employees, warnings: buildWarnings } = buildEmployeesFromRows(parsed.rows, mapping);

    if (employees.length === 0) {
      setError('변환된 직원이 없습니다. 입사일·생년월일 매핑을 확인하세요.');
      setWarnings(buildWarnings);
      setAppliedCount(0);
      return;
    }

    setError(null);
    setWarnings(buildWarnings);
    setAppliedCount(employees.length);
    onApply(employees, buildWarnings);
  }

  const mappedCount = mappedFields.length;

  return (
    <div className="space-y-4">
      <WarningBanner title="엑셀 파일은 서버로 업로드되지 않습니다" tone="info">
        <p>
          파일은 브라우저 안에서만 파싱되고, 서버에는 <b>열 이름(headers) 배열만</b>{' '}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">/api/map-columns</code> 로
          전송됩니다.
        </p>
      </WarningBanner>

      <div
        className={`rounded-xl border border-dashed px-4 py-6 text-center transition-colors ${
          dragging ? 'border-foreground/40 bg-muted/60' : 'border-border'
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
      >
        <p className="text-sm font-medium">
          엑셀 파일을 여기로 끌어다 놓거나 아래 버튼으로 선택하세요
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          .xlsx · .xls · .csv 지원 · 파일은 이 브라우저를 벗어나지 않습니다
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = '';
            }}
          />
          <Button onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Upload />}
            엑셀 파일 선택
          </Button>

          <Button variant="outline" onClick={onLoadMock} disabled={busy}>
            <FileSpreadsheet />
            샘플 데이터 27명 불러오기
          </Button>
        </div>
      </div>

      {parsed ? (
        <p className="text-xs text-muted-foreground">
          {parsed.fileName} · {parsed.sheetName} · {parsed.rows.length}행 · {parsed.headers.length}
          개 열
        </p>
      ) : null}

      {error ? (
        <WarningBanner title="진행할 수 없습니다" tone="danger">
          <p>{error}</p>
        </WarningBanner>
      ) : null}

      {appliedCount !== null && appliedCount > 0 ? (
        <WarningBanner title="직원 명부가 만들어졌습니다" tone="success">
          <p>
            {formatCount(appliedCount)}을 명부에 반영했습니다. ‘직원 명부’ 탭에서 판정 결과를
            확인하세요.
          </p>
          {warnings.length > 0 ? (
            <p>확인이 필요한 행 {warnings.length}건은 아래 목록에 표시됩니다.</p>
          ) : null}
        </WarningBanner>
      ) : null}

      {parsed && Object.keys(mapping).length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={source === 'AI' ? 'default' : 'secondary'}>
              {source === 'AI' ? 'AI 매핑' : '키워드 매핑 (Fallback)'}
            </Badge>
            <span>
              {parsed.headers.length}개 열 중 {mappedCount}개 열이 표준 필드에 연결되었습니다.
            </span>
          </div>

          {missingRequired.length > 0 ? (
            <WarningBanner title="필수 항목이 연결되지 않았습니다" tone="danger">
              <p>
                {missingRequired.map((field) => FIELD_LABELS[field]).join(', ')} 을(를) 연결해야
                명부를 만들 수 있습니다.
              </p>
              {!hasIdentifier ? <p>성명 또는 사번 중 하나는 반드시 연결해야 합니다.</p> : null}
            </WarningBanner>
          ) : null}

          {duplicateTargets.length > 0 ? (
            <WarningBanner title="같은 표준 항목에 여러 열이 연결되어 있습니다" tone="warning">
              <ul className="list-inside list-disc space-y-0.5">
                {duplicateTargets.map(([field, headers]) => (
                  <li key={field}>
                    {FIELD_LABELS[field as StandardField]} ← {headers.join(', ')}
                  </li>
                ))}
              </ul>
              <p>이 경우 각 항목은 마지막 열의 값만 반영됩니다. 하나만 남기고 나머지는 ‘사용 안 함’으로 바꾸세요.</p>
            </WarningBanner>
          ) : null}

          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>엑셀 열 이름</TableHead>
                  <TableHead>표준 필드</TableHead>
                  <TableHead className="w-24 text-right">신뢰도</TableHead>
                  <TableHead className="w-40">샘플 값</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsed.headers.map((header) => {
                  const score = confidence[header] ?? 0;
                  const sample = parsed.rows[0]?.[header];
                  return (
                    <TableRow key={header}>
                      <TableCell className="font-medium">{header}</TableCell>
                      <TableCell>
                        <Select
                          items={MAPPING_ITEMS}
                          value={mapping[header] ?? 'IGNORE'}
                          onValueChange={(value) =>
                            setMapping((prev) => ({ ...prev, [header]: String(value) }))
                          }
                        >
                          <SelectTrigger className="w-full" size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(MAPPING_ITEMS) as (StandardField | 'IGNORE')[]).map(
                              (field) => (
                                <SelectItem key={field} value={field}>
                                  {MAPPING_ITEMS[field]}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={score >= 0.8 ? 'default' : score >= 0.5 ? 'secondary' : 'outline'}
                        >
                          {Math.round(score * 100)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-40 truncate text-xs text-muted-foreground">
                        {String(sample ?? '')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              매핑이 틀렸다면 위 표에서 직접 바꿀 수 있습니다. 특히{' '}
              <b>{FIELD_LABELS.hireDate}</b>와 <b>{FIELD_LABELS.birthDate}</b>는 필수입니다.
            </p>
            <Button onClick={applyMapping} disabled={!canApply}>
              {appliedCount != null && appliedCount > 0 ? (
                <CheckCircle2 />
              ) : null}
              이 매핑으로 직원 명부 만들기
            </Button>
          </div>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <WarningBanner title={`확인이 필요한 행 ${warnings.length}건`}>
          <ul className="list-inside list-disc space-y-0.5">
            {warnings.slice(0, 8).map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
            {warnings.length > 8 ? <li>… 외 {warnings.length - 8}건</li> : null}
          </ul>
        </WarningBanner>
      ) : null}

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">엑셀 형식 예시</Label>
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-relaxed">
{`사원번호 | 성함   | 생년월일   | 채용일자   | 퇴사일자 | 고용형태 | 임원여부 | 병역기간 | 특이사항
EMP-001  | 김민준 | 1988-04-18 | 2018-01-02 |          | 정규직   | N        | 0        |`}
        </pre>
      </div>
    </div>
  );
}