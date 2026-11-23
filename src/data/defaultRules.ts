import type { TaxRuleTable } from '@/schemas';

/**
 * ⚠ 임시 규칙 테이블 (PLACEHOLDER)
 *
 * 이 파일은 Track A(규칙 계산 담당)의 확정 규칙 테이블이 연결되기 전까지 쓰는 임시값입니다.
 * 금액 단위는 "원(KRW)" 입니다.
 *
 * - isVerified / smeReductionVerified 가 false 이면 화면에 "규칙 미검증" 경고가 표시됩니다.
 * - Track A 담당자가 조특법 제29조의8 및 시행령 제26조의8 기준으로 수치를 확정하면
 *   이 파일의 값만 교체하면 됩니다. (화면 코드는 수정할 필요 없음)
 */
export const DEFAULT_TAX_RULES: TaxRuleTable[] = [
  {
    year: 2026,
    region: 'non_capital',
    companySize: 'sme',
    // [1년차, 2년차, 3년차] 1인당 공제액
    youthCredit: [14_500_000, 14_500_000, 7_250_000],
    regularCredit: [7_000_000, 7_000_000, 3_500_000],
    legalBasis: '조세특례제한법 제29조의8 (통합고용세액공제)',
    requiredDocs: ['상시근로자 수 확인서', '근로계약서 사본', '4대보험 가입자 명부'],
    isVerified: false,
    verificationNote: 'Track A 규칙 테이블 미연결 상태의 임시값입니다. 세무사 검토 전 사용 금지.',
    smeReductionCapBase: 50_000_000,
    smeReductionPenaltyPerWorker: 1_000_000,
    smeReductionVerified: false,
  },
  {
    year: 2026,
    region: 'capital',
    companySize: 'sme',
    youthCredit: [12_000_000, 12_000_000, 6_000_000],
    regularCredit: [6_000_000, 6_000_000, 3_000_000],
    legalBasis: '조세특례제한법 제29조의8 (통합고용세액공제)',
    requiredDocs: ['상시근로자 수 확인서', '근로계약서 사본', '4대보험 가입자 명부'],
    isVerified: false,
    verificationNote: 'Track A 규칙 테이블 미연결 상태의 임시값입니다. 세무사 검토 전 사용 금지.',
    smeReductionCapBase: 50_000_000,
    smeReductionPenaltyPerWorker: 1_000_000,
    smeReductionVerified: false,
  },
];

export const DEFAULT_RULE: TaxRuleTable = DEFAULT_TAX_RULES[0];

export function findRule(
  year: number,
  region: TaxRuleTable['region'],
  companySize: TaxRuleTable['companySize'],
): TaxRuleTable | undefined {
  return DEFAULT_TAX_RULES.find(
    (rule) => rule.year === year && rule.region === region && rule.companySize === companySize,
  );
}

export default DEFAULT_TAX_RULES;