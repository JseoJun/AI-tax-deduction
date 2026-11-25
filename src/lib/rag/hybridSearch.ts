import MiniSearch from 'minisearch';
import OpenAI from 'openai';
import precedentsSeed from '@/data/precedentsSeed.json';
import { PrecedentItem, SpecialFlag } from '@/schemas';
import { EXCEPTION_REASON_MAP } from './prompts';

interface SeedPrecedent {
  docId: string;
  specialFlag: string;
  effectiveYear: number;
  title: string;
  summary: string;
  citation: string;
  embedding?: number[];
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA === 0 || normB === 0 ? 0 : dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// API 키가 없거나 시드에 임베딩이 없을 때 사용하는 로컬 문자 바이그램(2-gram) 벡터 유사도
function lexicalVectorSimilarity(query: string, docText: string): number {
  const toBigrams = (str: string) => {
    const clean = str.replace(/\s+/g, '').toLowerCase();
    const set = new Set<string>();
    for (let i = 0; i < clean.length - 1; i++) {
      set.add(clean.slice(i, i + 2));
    }
    return set;
  };
  const qSet = toBigrams(query);
  const dSet = toBigrams(docText);
  if (qSet.size === 0 || dSet.size === 0) return 0;
  let intersection = 0;
  qSet.forEach((bg) => {
    if (dSet.has(bg)) intersection++;
  });
  return intersection / Math.sqrt(qSet.size * dSet.size);
}

export async function searchHybridPrecedents(params: {
  specialFlag: Exclude<SpecialFlag, 'NONE'>;
  specialNote?: string;
  targetYear: number;
}): Promise<{ exceptionReason: string; candidates: PrecedentItem[] }> {
  const { specialFlag, specialNote, targetYear } = params;
  const exceptionReason = EXCEPTION_REASON_MAP[specialFlag];
  const queryText = `${exceptionReason} ${specialFlag} ${specialNote ?? ''}`.trim();

  // 1. 메타데이터 사전 필터링 (과세연도 기준 유효 예규만 추출)
  const validDocs = (precedentsSeed as SeedPrecedent[]).filter(
    (doc) => doc.effectiveYear <= targetYear
  );

  if (validDocs.length === 0) {
    return { exceptionReason, candidates: [] };
  }

  // 2. BM25 키워드 검색 (MiniSearch)
  const miniSearch = new MiniSearch<SeedPrecedent>({
    idField: 'docId',
    fields: ['title', 'summary', 'citation', 'specialFlag'],
    storeFields: ['docId'],
  });
  miniSearch.addAll(validDocs);

  const bm25Hits = miniSearch.search(queryText, { prefix: true, fuzzy: 0.2 });
  const bm25RankMap = new Map<string, number>();
  bm25Hits.forEach((hit, idx) => bm25RankMap.set(hit.id, idx + 1));

  // 3. Dense Vector 유사도 산출 (사전 임베딩 + API 키가 있으면 임베딩 코사인 유사도, 없으면 바이그램 벡터)
  let queryEmbedding: number[] | null = null;
  const hasEmbeddings = validDocs.every((d) => Array.isArray(d.embedding) && d.embedding.length > 0);

  if (hasEmbeddings && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const embRes = await openai.embeddings.create(
        { model: 'text-embedding-3-small', input: queryText },
        { signal: AbortSignal.timeout(4000) }
      );
      queryEmbedding = embRes.data[0]?.embedding ?? null;
    } catch {
      queryEmbedding = null;
    }
  }

  const denseScored = validDocs
    .map((doc) => {
      const flagBoost = doc.specialFlag === specialFlag ? 0.25 : 0;
      const baseSim =
        queryEmbedding && doc.embedding
          ? cosineSimilarity(queryEmbedding, doc.embedding)
          : lexicalVectorSimilarity(queryText, `${doc.title} ${doc.summary} ${doc.citation}`);
      return { docId: doc.docId, sim: Math.min(1, baseSim + flagBoost) };
    })
    .sort((a, b) => b.sim - a.sim);

  const denseRankMap = new Map<string, number>();
  denseScored.forEach((item, idx) => denseRankMap.set(item.docId, idx + 1));

  // 4. RRF (Reciprocal Rank Fusion, k = 60) 병합 및 0~1 정규화
  const K = 60;
  const maxRrf = 1 / (K + 1) + 1 / (K + 1);

  const fused: PrecedentItem[] = validDocs
    .map((doc) => {
      const rBm25 = bm25RankMap.get(doc.docId) ?? validDocs.length + 10;
      const rDense = denseRankMap.get(doc.docId) ?? validDocs.length + 10;
      const rawRrf = 1 / (K + rBm25) + 1 / (K + rDense);
      const normalizedScore = Number(Math.min(1, rawRrf / maxRrf).toFixed(2));

      return {
        docId: doc.docId,
        title: doc.title,
        summary: doc.summary,
        relevanceScore: normalizedScore,
        citation: doc.citation,
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3);

  // 5. 저신뢰도 안전 차단 (최고 점수가 0.60 미만이면 빈 배열 반환)
  if (fused.length === 0 || fused[0].relevanceScore < 0.6) {
    return { exceptionReason, candidates: [] };
  }

  return { exceptionReason, candidates: fused };
}