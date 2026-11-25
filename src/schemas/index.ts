import { z } from 'zod';

export interface CompanyProfile {
  id: string;
  name: string;
  region: 'capital' | 'non_capital';
  size: 'sme' | 'middle';
  industry: string;
  targetYear: number;
  calculatedTax: number;
  smeReductionRate: number;
  appliedCredits: ('sme_special' | 'investment' | 'rnd')[];
  updatedAt: string;
}

export type ContractType = 'regular' | 'over_1y' | 'under_1y' | 'short_time_under_60h';
export type SpecialFlag =
  | 'NONE'
  | 'PARENTAL_LEAVE'
  | 'PART_TIME_PRO_RATA'
  | 'BUSINESS_SUCCESSION'
  | 'REHIRED_SAME_YEAR';

export interface EmployeeRecord {
  employeeId: string;
  name: string;
  birthDate: string;
  hireDate: string;
  resignDate: string | null;
  contractType: ContractType;
  isExecutive: boolean;
  militaryMonths: number;
  specialFlag: SpecialFlag;
  specialNote?: string;
}

export interface TaxRuleTable {
  year: number;
  region: 'capital' | 'non_capital';
  companySize: 'sme' | 'middle';
  youthCredit: [number, number, number];
  regularCredit: [number, number, number];
  legalBasis: string;
  requiredDocs: string[];
  isVerified: boolean;
  verificationNote?: string;
  smeReductionCapBase: number;
  smeReductionPenaltyPerWorker: number;
  smeReductionVerified: boolean;
}

export interface EmployeeJudgment {
  employeeId: string;
  name: string;
  category: 'YOUTH_PREFERRED' | 'GENERAL' | 'EXCLUDED' | 'NEEDS_REVIEW';
  isEmployedPrev: boolean;
  isEmployedCurr: boolean;
  effectiveAgeAtHire: number | null;
  reason: string;
}

export interface CalculationResult {
  prevCount: number;
  currCount: number;
  netIncrease: number;
  youthCount: number;
  regularCount: number;
  yearlyCredits: [number, number, number];
  totalCredit: number;
  employeeJudgments: EmployeeJudgment[];
  edgeCaseFlags: EmployeeJudgment[];
  isRuleVerified: boolean;
}

export interface SimulationRequest {
  addYouth: number;
  addRegular: number;
  removeYouth: number;
  removeRegular: number;
}

export interface SimulationResponse {
  baseline: {
    currCount: number;
    yearlyCredits: [number, number, number];
    totalCredit: number;
  };
  simulated: {
    currCount: number;
    yearlyCredits: [number, number, number];
    totalCredit: number;
  };
  deltaYearlyCredits: [number, number, number];
  deltaTotalCredit: number;
}

export interface DecreaseImpactRow {
  decreasedBy: 1 | 2 | 3;
  remainingCount: number;
  year2Loss: number;
  year3Loss: number;
  totalLoss: number;
}

export interface CheckTimelineItem {
  employeeId: string;
  name: string;
  hireDate: string;
  check12MonthDate: string;
  check24MonthDate: string;
}

export interface RosterDiffItem {
  employeeId: string;
  name: string;
  changeType: 'NEW_HIRE' | 'RESIGNED' | 'MODIFIED';
  detail: string;
}

export interface ComplianceAndPostCare {
  duplicateWarnings: {
    creditType: string;
    statuteRef: string;
    message: string;
  }[];
  smeSpecialComparison: {
    applicable: boolean;
    reducedWorkerCount: number;
    calculatedLimit: number;
    estimatedReduction: number;
    isVerified: boolean;
  };
  minimumTaxNotice: string;
  postCare: {
    requiredHeadcount: number;
    decreaseImpacts: DecreaseImpactRow[];
    timeline: CheckTimelineItem[];
  };
  rosterDiff: {
    hasPreviousRoster: boolean;
    changes: RosterDiffItem[];
    previousTotalCredit: number;
    currentTotalCredit: number;
    creditDifference: number;
  };
}

export interface RagPrecedentRequest {
  specialFlag: Exclude<SpecialFlag, 'NONE'>;
  specialNote?: string;
  targetYear: number;
  companySize: 'sme' | 'middle';
}

export interface PrecedentItem {
  docId: string;
  title: string;
  summary: string;
  relevanceScore: number;
  citation: string;
}

export interface RagPrecedentResponse {
  exceptionReason: string;
  precedents: PrecedentItem[];
}

export const ColumnMappingResponseSchema = z.object({
  mapping: z.record(
    z.string(),
    z.enum([
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
      'IGNORE',
    ])
  ),
  confidence: z.record(z.string(), z.number().min(0).max(1)),
});

export const RagPrecedentResponseSchema = z.object({
  exceptionReason: z.string().min(5),
  precedents: z
    .array(
      z.object({
        docId: z.string().min(3),
        title: z.string().min(2),
        summary: z.string().min(10),
        relevanceScore: z.number().min(0).max(1),
        citation: z.string().min(3),
      })
    )
    .max(3),
});

// ---------------------------------------------------------------------------
// 프론트엔드 입력 검증용 Zod 스키마 (명부 업로드·localStorage 복원 시 사용)
// 타입은 위 interface 와 동일하게 유지해야 합니다.
// ---------------------------------------------------------------------------

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const ContractTypeSchema = z.enum([
  'regular',
  'over_1y',
  'under_1y',
  'short_time_under_60h',
]);

export const SpecialFlagSchema = z.enum([
  'NONE',
  'PARENTAL_LEAVE',
  'PART_TIME_PRO_RATA',
  'BUSINESS_SUCCESSION',
  'REHIRED_SAME_YEAR',
]);

export const EmployeeRecordSchema = z.object({
  employeeId: z.string().min(1, '사번은 필수입니다.'),
  name: z.string().min(1, '이름은 필수입니다.'),
  birthDate: z.string().regex(DATE_PATTERN, '생년월일은 YYYY-MM-DD 형식이어야 합니다.'),
  hireDate: z.string().regex(DATE_PATTERN, '입사일은 YYYY-MM-DD 형식이어야 합니다.'),
  resignDate: z
    .string()
    .regex(DATE_PATTERN, '퇴사일은 YYYY-MM-DD 형식이어야 합니다.')
    .nullable(),
  contractType: ContractTypeSchema,
  isExecutive: z.boolean(),
  militaryMonths: z.number().int().min(0).max(120),
  specialFlag: SpecialFlagSchema,
  specialNote: z.string().optional(),
});

export const EmployeeListSchema = z.array(EmployeeRecordSchema);

export const CompanyProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, '회사명은 필수입니다.'),
  region: z.enum(['capital', 'non_capital']),
  size: z.enum(['sme', 'middle']),
  industry: z.string().min(1),
  targetYear: z.number().int().min(2020).max(2035),
  calculatedTax: z.number().min(0),
  smeReductionRate: z.number().min(0).max(1),
  appliedCredits: z.array(z.enum(['sme_special', 'investment', 'rnd'])),
  updatedAt: z.string(),
});

export type EmployeeRecordInput = z.infer<typeof EmployeeRecordSchema>;
export type CompanyProfileInput = z.infer<typeof CompanyProfileSchema>;