import type { TaxRuleTable } from '@/schemas';

/**
 * 법령 규칙표 기본값 (개발 명세서 6.3절 기준)
 *
 * 금액 단위는 "원(KRW)" 입니다.
 * - 2026 세법개정안 2차 자료 기준 수치이므로 isVerified / smeReductionVerified 는 false 입니다.
 *   (화면에 "▲ 법령 원문 검수 필요" 경고가 표시됩니다.)
 * - 명세서에 수치가 정의된 조건(수도권·중소기업)만 등록합니다.
 *   비수도권·중견기업 단가는 법령 원문 확인 후 팀원 1(도메인·데이터)이 추가해야 합니다.
 */
export const DEFAULT_TAX_RULES: TaxRuleTable[] = [
  {
    year: 2026,
    region: 'capital',
    companySize: 'sme',
    // [1년차, 2년차, 3년차] 1인당 공제액
    youthCredit: [7_000_000, 16_000_000, 17_000_000],
    regularCredit: [4_000_000, 9_000_000, 10_000_000],
    legalBasis: '조특법 §29의8',
    requiredDocs: [
      '근로계약서 사본',
      '원천징수이행상황신고서',
      '4대보험 사업장 가입자 명부',
      '주민등록등본(청년 연령 확인용)',
      '병적증명서(병역기간 차감 대상자)',
    ],
    isVerified: false,
    verificationNote: '▲ 2차 자료 근거 2026 개정안 수치로 법령 원문 최종 검수 필요',
    smeReductionCapBase: 100_000_000,
    smeReductionPenaltyPerWorker: 5_000_000,
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
