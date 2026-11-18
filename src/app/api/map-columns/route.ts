import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ColumnMappingResponseSchema } from '@/schemas';
import { COLUMN_MAPPING_SYSTEM_PROMPT } from '@/lib/rag/prompts';

const KEYWORD_DICTIONARY: Record<string, string[]> = {
  employeeId: ['사번', '사원번호', '직원번호', 'id', 'empno'],
  name: ['성명', '이름', '직원명', '성함'],
  birthDate: ['생년월일', '생일', '주민번호', '주민등록번호'],
  hireDate: ['입사일', '입사일자', '채용일', '채용일자', '근무시작일'],
  resignDate: ['퇴사일', '퇴사일자', '퇴직일', '퇴직일자'],
  contractType: ['계약형태', '고용형태', '근로형태', '직종구분', '고용구분'],
  isExecutive: ['임원', '임원여부', '직책', '대주주'],
  militaryMonths: ['병역', '병역기간', '군복무', '복무개월'],
  specialFlag: ['특이사항', '휴직', '예외구분'],
};

function runKeywordFallback(headers: string[]) {
  const mapping: Record<string, string> = {};
  const confidence: Record<string, number> = {};

  for (const header of headers) {
    const normalized = header.replace(/\s+/g, '').toLowerCase();
    let matchedKey = 'IGNORE';
    for (const [stdKey, keywords] of Object.entries(KEYWORD_DICTIONARY)) {
      if (keywords.some((kw) => normalized.includes(kw))) {
        matchedKey = stdKey;
        break;
      }
    }
    mapping[header] = matchedKey;
    confidence[header] = matchedKey === 'IGNORE' ? 0.0 : 0.85;
  }

  return { mapping, confidence };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || !Array.isArray(body.headers) || body.headers.length === 0) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'headers 배열은 최소 1개 이상의 문자열을 포함해야 합니다.' },
        { status: 400 }
      );
    }

    if (!body.headers.every((h: unknown) => typeof h === 'string')) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'headers 항목은 모두 string 타입이어야 합니다.' },
        { status: 422 }
      );
    }

    const headers: string[] = body.headers;
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey && apiKey !== 'your_openai_api_key_here') {
      try {
        const openai = new OpenAI({ apiKey });
        const completion = await openai.chat.completions.create(
          {
            model: 'gpt-4o-mini',
            temperature: 0,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: COLUMN_MAPPING_SYSTEM_PROMPT },
              { role: 'user', content: JSON.stringify({ headers }) },
            ],
          },
          { signal: AbortSignal.timeout(5000) }
        );

        const rawText = completion.choices[0]?.message?.content ?? '{}';
        const parsed = ColumnMappingResponseSchema.safeParse(JSON.parse(rawText));

        if (parsed.success) {
          return NextResponse.json({
            source: 'AI',
            mapping: parsed.data.mapping,
            confidence: parsed.data.confidence,
          });
        }
      } catch {
        // AI 타임아웃 또는 응답 검증 실패 시 키워드 Fallback으로 즉시 전환
      }
    }

    const fallback = runKeywordFallback(headers);
    return NextResponse.json({
      source: 'KEYWORD_FALLBACK',
      mapping: fallback.mapping,
      confidence: fallback.confidence,
    });
  } catch {
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: '열 매핑 처리 중 서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}