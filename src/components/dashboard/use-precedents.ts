'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiRequestError, searchPrecedents } from '@/lib/api-client';
import type { CompanyProfile, EmployeeRecord, RagPrecedentResponse } from '@/schemas';

interface PrecedentState {
  key: string | null;
  data: RagPrecedentResponse | null;
  error: string | null;
}

/**
 * 특수 케이스 직원 1명에 대한 예규 검색 상태 훅.
 *
 * - API 호출은 `/api/rag/precedents` 만 사용합니다. (최종 판정은 하지 않음)
 * - 직원 정보 중 서버로 보내는 값은 specialFlag / specialNote / targetYear / companySize 뿐입니다.
 * - reload() 로 같은 직원을 다시 검색할 수 있습니다. (이전 구현의 '다시 검색' 무동작 버그 수정)
 * - 결과는 요청 키(employee+flag+year+nonce)와 함께 보관해, 조건이 바뀌는 즉시 화면에서
 *   이전 결과가 사라지도록 합니다. (effect 안에서 동기 setState 를 하지 않기 위함)
 */
export function usePrecedents({
  employee,
  company,
  enabled = true,
}: {
  employee: EmployeeRecord | null;
  company: CompanyProfile;
  enabled?: boolean;
}) {
  const [state, setState] = useState<PrecedentState>({ key: null, data: null, error: null });
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  const request = useMemo(() => {
    if (!enabled || !employee || employee.specialFlag === 'NONE') return null;
    return {
      key: [employee.employeeId, employee.specialFlag, employee.specialNote ?? '', company.targetYear, company.size, nonce].join(
        '|',
      ),
      body: {
        specialFlag: employee.specialFlag,
        ...(employee.specialNote ? { specialNote: employee.specialNote } : {}),
        targetYear: company.targetYear,
        companySize: company.size,
      },
    };
  }, [enabled, employee, company.targetYear, company.size, nonce]);

  useEffect(() => {
    if (!request) return;

    const controller = new AbortController();
    let active = true;
    const { key, body } = request;

    searchPrecedents(body, { signal: controller.signal })
      .then((response) => {
        if (!active) return;
        setState({ key, data: response, error: null });
      })
      .catch((caught: unknown) => {
        if (!active) return;
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setState({
          key,
          data: null,
          error:
            caught instanceof ApiRequestError
              ? caught.message
              : '예규 검색 중 알 수 없는 오류가 발생했습니다.',
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [request]);

  const isCurrent = request != null && state.key === request.key;

  return {
    data: isCurrent ? state.data : null,
    error: isCurrent ? state.error : null,
    loading: request != null && !isCurrent,
    reload,
  };
}