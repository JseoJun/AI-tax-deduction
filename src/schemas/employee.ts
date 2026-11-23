import { z } from 'zod';

/**
 * 프론트엔드에서 쓰는 공용 Zod 스키마.
 * `src/schemas/index.ts`(Track B 소유)와 충돌하지 않도록 별도 파일로 분리했습니다.
 * 타입은 index.ts 의 interface 와 동일하게 맞춰 두었습니다.
 */

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