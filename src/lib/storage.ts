import type { CompanyProfile, EmployeeRecord } from '@/schemas';
import { CompanyProfileSchema, EmployeeListSchema } from '@/schemas/employee';

/**
 * 브라우저 localStorage 저장소.
 *
 * 직원 명부에는 개인정보가 들어가므로 서버에 저장하지 않고
 * 사용자 브라우저에만 보관합니다. (localStorage 는 브라우저를 벗어나지 않음)
 */

const COMPANY_KEY = 'gongje-radar:company-profile:v1';
const EMPLOYEES_KEY = 'gongje-radar:employees:v1';
const PREVIOUS_ROSTER_KEY = 'gongje-radar:previous-roster:v1';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readJson(key: string): unknown {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 용량 초과/사생활 보호 모드 등에서는 조용히 무시합니다.
  }
}

export function loadCompanyProfile(): CompanyProfile | null {
  const parsed = CompanyProfileSchema.safeParse(readJson(COMPANY_KEY));
  return parsed.success ? (parsed.data as CompanyProfile) : null;
}

export function saveCompanyProfile(profile: CompanyProfile): void {
  writeJson(COMPANY_KEY, profile);
}

export function loadEmployees(): EmployeeRecord[] | null {
  const parsed = EmployeeListSchema.safeParse(readJson(EMPLOYEES_KEY));
  return parsed.success ? (parsed.data as EmployeeRecord[]) : null;
}

export function saveEmployees(employees: EmployeeRecord[]): void {
  writeJson(EMPLOYEES_KEY, employees);
}

/** 직전 기간 명부를 따로 보관합니다. (명부 비교 / 변동 내역 표시용) */
export function savePreviousRoster(employees: EmployeeRecord[]): void {
  writeJson(PREVIOUS_ROSTER_KEY, employees);
}

export function loadPreviousRoster(): EmployeeRecord[] | null {
  const parsed = EmployeeListSchema.safeParse(readJson(PREVIOUS_ROSTER_KEY));
  return parsed.success ? (parsed.data as EmployeeRecord[]) : null;
}

export function clearStorage(): void {
  if (!isBrowser()) return;
  [COMPANY_KEY, EMPLOYEES_KEY, PREVIOUS_ROSTER_KEY].forEach((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  });
}

export const STORAGE_KEYS = {
  company: COMPANY_KEY,
  employees: EMPLOYEES_KEY,
  previousRoster: PREVIOUS_ROSTER_KEY,
} as const;