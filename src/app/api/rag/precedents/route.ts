import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';
import { RagPrecedentResponseSchema } from '@/schemas';
import { searchHybridPrecedents } from '@/lib/rag/hybridSearch';
import { RAG_SUMMARY_SYSTEM_PROMPT } from '@/lib/rag/prompts';

const RequestSchema = z.object({
  specialFlag: z.enum([
    'PARENTAL_LEAVE',
    'PART_TIME_PRO_RATA',
    'BUSINESS_SUCCESSION',
    'REHIRED_SAME_YEAR',
  ]),
  specialNote: z.string().optional(),
  targetYear: z.number().int().min(2020).max(2035),
  companySize: z.enum(['sme', 'middle']),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const reqParsed = RequestSchema.safeParse(body);

    if (!reqParsed.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: '유효하지 않은 specialFlag 또는 요청 파라미터입니다.' },
        { status: 400 }
      );
    }

    const { specialFlag, specialNote, targetYear } = reqParsed.data;

    // 1. 하이브리드 검색(메타데이터 필터 + BM25 + 벡터 RRF) 수행
    const { exceptionReason, candidates } = await searchHybridPrecedents({
      specialFlag,
      specialNote,
      targetYear,
    });

    if (candidates.length === 0) {
      return NextResponse.json({ exceptionReason, precedents: [] });
    }

    let finalPrecedents = candidates;
    const apiKey = process.env.OPENAI_API_KEY;

    // 2. API 키가 있으면 Closed-Book QA 방식으로 요약 정제 (원본 docId/citation 강제 유지)
    if (apiKey && apiKey !== 'your_openai_api_key_here') {
      try {
        const openai = new OpenAI({ apiKey });
        const completion = await openai.chat.completions.create(
          {
            model: 'gpt-4o-mini',
            temperature: 0,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: RAG_SUMMARY_SYSTEM_PROMPT },
              {
                role: 'user',
                content: JSON.stringify({
                  situation: specialNote ?? exceptionReason,
                  retrievedPrecedents: candidates,
                  outputFormat: {
                    exceptionReason: 'string',
                    precedents: [
                      {
                        docId: '원본 그대로 유지',
                        title: '원본 그대로 유지',
                        summary: '컨텍스트 근거 요약 (~하는 것이 타당함 형태)',
                        relevanceScore: '원본 숫자 유지',
                        citation: '원본 그대로 유지',
                      },
                    ],
                  },
                }),
              },
            ],
          },
          { signal: AbortSignal.timeout(5000) }
        );

        const rawJson = JSON.parse(completion.choices[0]?.message?.content ?? '{}');
        const llmValidated = RagPrecedentResponseSchema.safeParse(rawJson);

        const allowedDocIds = new Set(candidates.map((c) => c.docId));
        if (
          llmValidated.success &&
          llmValidated.data.precedents.every((p) => allowedDocIds.has(p.docId))
        ) {
          finalPrecedents = llmValidated.data.precedents;
        }
      } catch {
        // LLM 지연/오류 시 검증된 시드 예규 요약 그대로 반환
      }
    }

    // 3. 최종 응답 스키마 무결성 검증
    const finalValidated = RagPrecedentResponseSchema.safeParse({
      exceptionReason,
      precedents: finalPrecedents,
    });

    if (!finalValidated.success) {
      return NextResponse.json(
        {
          error: 'RAG_SCHEMA_VIOLATION',
          message: '검색된 예규의 인용 무결성 검증에 실패하여 결과를 차단했습니다.',
        },
        { status: 422 }
      );
    }

    return NextResponse.json(finalValidated.data);
  } catch {
    return NextResponse.json(
      { error: 'RAG_RETRIEVAL_FAILED', message: '예규 지식베이스 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}