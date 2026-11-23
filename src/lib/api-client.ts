import { z } from 'zod';
import { ColumnMappingResponseSchema, RagPrecedentResponseSchema } from '@/schemas';
import type { RagPrecedentRequest, RagPrecedentResponse } from '@/schemas';

/**
 * 프론트엔드 → Next.js API 호출 모듈.
 *
 * 두 API 모두 "POST + JSON" 형태라서 아래 postJson() 하나로 처리합니다.
 *  - POST /api/map-columns       : 엑셀 열 이름 → 표준 필드 매핑
 *  - POST /api/rag/precedents    : 특수 직원 케이스 → 관련 예규 검색
 *
 * 서버가 4xx/5xx 를 주면 { error, message } JSON 이 오므로 status 를 먼저 확인합니다.
 */

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

const DEFAULT_TIMEOUT_MS = 20_000;

async function postJson<T extends z.ZodTypeAny>(
  url: string,
  body: unknown,
  schema: T,
  options: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<z.infer<T>> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // 호출자가 넘긴 signal 이 있으면 abort 를 그대로 전파합니다.
  options.signal?.addEventListener('abort', () => controller.abort(), { once: true });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      throw new ApiRequestError('서버 응답을 해석할 수 없습니다. (JSON 아님)', response.status);
    }

    if (!response.ok) {
      const detail = payload as { error?: string; message?: string } | null;
      throw new ApiRequestError(
        detail?.message ?? `요청이 실패했습니다. (HTTP ${response.status})`,
        response.status,
        detail?.error,
      );
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiRequestError(
        `응답 형식이 예상과 다릅니다: ${parsed.error.issues[0]?.message ?? '알 수 없는 오류'}`,
        response.status,
        'CLIENT_SCHEMA_MISMATCH',
      );
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof ApiRequestError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiRequestError('요청 시간이 초과되었습니다. 잠시 후 다시 시도하세요.', 408, 'TIMEOUT');
    }
    throw new ApiRequestError(
      error instanceof Error ? error.message : '알 수 없는 네트워크 오류입니다.',
      0,
      'NETWORK_ERROR',
    );
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────
// 1. 열 매핑 API
// ─────────────────────────────────────────────────────────────

export interface ColumnMappingResult {
  source: 'AI' | 'KEYWORD_FALLBACK';
  mapping: Record<string, string>;
  confidence: Record<string, number>;
}

/** 서버는 매핑 결과에 source 필드까지 함께 내려줍니다. */
const MapColumnsResponseSchema = ColumnMappingResponseSchema.extend({
  source: z.enum(['AI', 'KEYWORD_FALLBACK']).optional(),
});

export async function mapColumns(
  headers: string[],
  options: { signal?: AbortSignal } = {},
): Promise<ColumnMappingResult> {
  const data = await postJson('/api/map-columns', { headers }, MapColumnsResponseSchema, options);
  return {
    source: data.source === 'AI' ? 'AI' : 'KEYWORD_FALLBACK',
    mapping: data.mapping,
    confidence: data.confidence,
  };
}

// ─────────────────────────────────────────────────────────────
// 2. 예규 검색 API
// ─────────────────────────────────────────────────────────────

export async function searchPrecedents(
  request: RagPrecedentRequest,
  options: { signal?: AbortSignal } = {},
): Promise<RagPrecedentResponse> {
  return postJson('/api/rag/precedents', request, RagPrecedentResponseSchema, options);
}