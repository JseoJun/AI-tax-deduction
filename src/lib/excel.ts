import * as XLSX from 'xlsx';
import type { ContractType, EmployeeRecord, SpecialFlag } from '@/schemas';

/**
 * 엑셀 파싱 유틸 (브라우저에서만 동작)
 *
 * 개인정보 보호를 위해 파일은 서버로 업로드하지 않고 브라우저 안에서만 읽습니다.
 * 서버로는 "열 이름(headers) 배열"만 /api/map-columns 로 보내 매핑을 요청합니다.
 */

export interface ParsedSheet {
  fileName: string;
  sheetName: string;
  headers: string[];
  rows: Record<string, unknown>[];
}

export interface BuildEmployeesResult {
  employees: EmployeeRecord[];
  warnings: string[];
}

/** 표준 필드 키 (매핑 결과로 내려오는 값들) */
export const STANDARD_FIELDS = [
  'employeeId',
  'name',
  'birthDate',
  'hireDate',
  'resignDate',
  'contractType',
  'isExecutive',
  'militaryMonths',
  'specialFlag',
  'specialNote',
] as const;

export type StandardField = (typeof STANDARD_FIELDS)[number];

export const FIELD_LABELS: Record<StandardField | 'IGNORE', string> = {
  employeeId: '사번',
  name: '성명',
  birthDate: '생년월일',
  hireDate: '입사일',
  resignDate: '퇴사일',
  contractType: '계약형태',
  isExecutive: '임원여부',
  militaryMonths: '병역개월',
  specialFlag: '특이사항 구분',
  specialNote: '비고',
  IGNORE: '사용 안 함',
};

// ─────────────────────────────────────────────────────────────
// 1. 파일 → 시트 읽기
// ─────────────────────────────────────────────────────────────

export async function parseEmployeeExcel(file: File): Promise<ParsedSheet> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(buffer), {
    type: 'array',
    cellDates: true,
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('엑셀 파일에 시트가 없습니다.');
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    blankrows: false,
    defval: '',
  });

  if (matrix.length === 0) {
    throw new Error('엑셀 시트가 비어 있습니다.');
  }

  const headerRow = dedupeHeaders(
    (matrix[0] ?? []).map((cell, index) => normalizeHeaderName(cell, index)),
  );

  const rows: Record<string, unknown>[] = [];
  for (const raw of matrix.slice(1)) {
    if (!Array.isArray(raw) || raw.every((cell) => cell === '' || cell == null)) continue;
    const row: Record<string, unknown> = {};
    headerRow.forEach((header, index) => {
      row[header] = raw[index] ?? '';
    });
    rows.push(row);
  }

  return { fileName: file.name, sheetName, headers: headerRow, rows };
}

function normalizeHeaderName(cell: unknown, index: number): string {
  const text = cell instanceof Date ? cell.toISOString().slice(0, 10) : String(cell ?? '').trim();
  return text === '' ? `열${index + 1}` : text;
}

function dedupeHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((header) => {
    const count = seen.get(header) ?? 0;
    seen.set(header, count + 1);
    return count === 0 ? header : `${header} (${count + 1})`;
  });
}

// ─────────────────────────────────────────────────────────────
// 2. 값 정규화
// ─────────────────────────────────────────────────────────────

/** 엑셀 셀 값을 'YYYY-MM-DD' 문자열로 변환합니다. */
export function toIsoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatUtcDate(value);
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    // 엑셀 시리얼 날짜 (1900-01-01 기준)
    if (value > 20_000 && value < 80_000) {
      const ms = Math.round((value - 25_569) * 86_400_000);
      const date = new Date(ms);
      if (!Number.isNaN(date.getTime())) return formatUtcDate(date);
    }
    // 19880418 같은 8자리 표기
    if (value >= 10_000_101 && value <= 99_991_231) {
      return toIsoDate(String(Math.trunc(value)));
    }
    return null;
  }

  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (text === '') return null;

  // 2024-01-08 / 2024.01.08 / 2024/01/08
  const dashed = text.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  if (dashed) {
    return `${dashed[1]}-${dashed[2].padStart(2, '0')}-${dashed[3].padStart(2, '0')}`;
  }

  // 20240108
  if (/^\d{8}$/.test(text)) {
    return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  }

  // 1988.04.18. 처럼 뒤에 점이 남은 경우
  const trailing = text.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})\.?$/);
  if (trailing) {
    return `${trailing[1]}-${trailing[2].padStart(2, '0')}-${trailing[3].padStart(2, '0')}`;
  }

  // 그 외에는 Date 파싱 시도
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return formatUtcDate(parsed);
  return null;
}

function formatUtcDate(date: Date): string {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  )
    .toISOString()
    .slice(0, 10);
}

const CONTRACT_TYPE_MAP: Array<[RegExp, ContractType]> = [
  [/단시간|파트|초단시간/, 'short_time_under_60h'],
  [/1년\s*미만|단기|기간제/, 'under_1y'],
  [/1년\s*이상|계약직|기간의\s*정함/, 'over_1y'],
  [/정규|무기|상용|regular/i, 'regular'],
];

export function toContractType(value: unknown): ContractType {
  const text = String(value ?? '').trim();
  if (text === '') return 'regular';
  for (const [pattern, contractType] of CONTRACT_TYPE_MAP) {
    if (pattern.test(text)) return contractType;
  }
  return 'regular';
}

const SPECIAL_FLAG_MAP: Array<[RegExp, SpecialFlag]> = [
  [/육아|출산|휴직/, 'PARENTAL_LEAVE'],
  [/단시간|시간제/, 'PART_TIME_PRO_RATA'],
  [/승계|양수도|법인전환/, 'BUSINESS_SUCCESSION'],
  [/재입사|재고용|복직/, 'REHIRED_SAME_YEAR'],
];

export function toSpecialFlag(value: unknown): SpecialFlag {
  const text = String(value ?? '').trim();
  if (text === '') return 'NONE';
  for (const [pattern, flag] of SPECIAL_FLAG_MAP) {
    if (pattern.test(text)) return flag;
  }
  return 'NONE';
}

export function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  const text = String(value ?? '').trim().toLowerCase();
  return ['y', 'yes', 'true', '1', '임원', '대표', '이사', '네', '예'].includes(text);
}

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

// ─────────────────────────────────────────────────────────────
// 3. 행 → EmployeeRecord
// ─────────────────────────────────────────────────────────────

/** 매핑(mapping: 엑셀열 → 표준필드)을 표준필드 → 엑셀열 로 뒤집습니다. */
export function invertMapping(mapping: Record<string, string>): Partial<Record<StandardField, string>> {
  const inverted: Partial<Record<StandardField, string>> = {};
  for (const [header, field] of Object.entries(mapping)) {
    if (field === 'IGNORE') continue;
    if (!STANDARD_FIELDS.includes(field as StandardField)) continue;
    inverted[field as StandardField] = header;
  }
  return inverted;
}

export function buildEmployeesFromRows(
  rows: Record<string, unknown>[],
  mapping: Record<string, string>,
): BuildEmployeesResult {
  const column = invertMapping(mapping);
  const employees: EmployeeRecord[] = [];
  const warnings: string[] = [];

  rows.forEach((row, index) => {
    const rowLabel = `${index + 2}행`; // 헤더가 1행이므로 실제 엑셀 행 번호
    const get = (field: StandardField): unknown => (column[field] ? row[column[field]!] : '');

    const rawName = String(get('name') ?? '').trim();
    const rawId = String(get('employeeId') ?? '').trim();

    if (rawName === '' && rawId === '') {
      warnings.push(`${rowLabel}: 사번과 성명이 모두 비어 있어 건너뛰었습니다.`);
      return;
    }

    const birthDate = toIsoDate(get('birthDate'));
    const hireDate = toIsoDate(get('hireDate'));

    if (!hireDate) {
      warnings.push(`${rowLabel}(${rawName || rawId}): 입사일을 해석할 수 없어 건너뛰었습니다.`);
      return;
    }
    if (!birthDate) {
      warnings.push(`${rowLabel}(${rawName || rawId}): 생년월일을 해석할 수 없어 건너뛰었습니다.`);
      return;
    }

    const specialNoteValue = column.specialNote ? String(get('specialNote') ?? '').trim() : '';

    employees.push({
      employeeId: rawId || `ROW-${index + 2}`,
      name: rawName || rawId,
      birthDate,
      hireDate,
      resignDate: toIsoDate(get('resignDate')),
      contractType: toContractType(get('contractType')),
      isExecutive: toBoolean(get('isExecutive')),
      militaryMonths: Math.max(0, Math.round(toNumber(get('militaryMonths')))),
      specialFlag: toSpecialFlag(get('specialFlag')),
      ...(specialNoteValue ? { specialNote: specialNoteValue } : {}),
    });
  });

  return { employees, warnings };
}