'use client';

import { useRef, useState } from 'react';
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';
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
import { WarningBanner } from './ui-bits';

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
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    setWarnings([]);
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

  function applyMapping() {
    if (!parsed) return;
    const { employees, warnings: buildWarnings } = buildEmployeesFromRows(parsed.rows, mapping);

    if (employees.length === 0) {
      setError('변환된 직원이 없습니다. 사번·성명·입사일·생년월일 매핑을 확인하세요.');
      setWarnings(buildWarnings);
      return;
    }

    setError(null);
    setWarnings(buildWarnings);
    onApply(employees, buildWarnings);
  }

  const mappedCount = Object.values(mapping).filter((field) => field !== 'IGNORE').length;

  return (
    <div className="space-y-4">
      <WarningBanner title="엑셀 파일은 서버로 업로드되지 않습니다" tone="info">
        <p>
          파일은 브라우저 안에서만 파싱되고, 서버에는 <b>열 이름(headers) 배열만</b>{' '}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">/api/map-columns</code> 로
          전송됩니다.
        </p>
      </WarningBanner>

      <div className="flex flex-wrap items-center gap-2">
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

        {parsed ? (
          <span className="text-xs text-muted-foreground">
            {parsed.fileName} · {parsed.sheetName} · {parsed.rows.length}행
          </span>
        ) : null}
      </div>

      {error ? (
        <WarningBanner title="오류" tone="danger">
          <p>{error}</p>
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
            <Button onClick={applyMapping}>이 매핑으로 직원 명부 만들기</Button>
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