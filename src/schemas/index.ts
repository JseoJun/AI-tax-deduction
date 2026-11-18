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