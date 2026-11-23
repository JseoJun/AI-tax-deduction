'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clearStorage } from '@/lib/storage';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * 화면 전체를 감싸는 오류 경계.
 *
 * 규칙 엔진/엑셀 파서가 예외를 던져도 흰 화면이 되지 않도록 안내 화면을 보여줍니다.
 * - 오류 메시지 원문은 화면에 노출하지 않습니다. (직원 정보가 섞여 나올 수 있음)
 * - 상세 내용은 콘솔에만 남깁니다.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 개인정보 보호를 위해 화면에는 표시하지 않고 콘솔에만 기록합니다.
    console.error('[GongjeRadar] 렌더링 오류', error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  private clearAndReload = () => {
    clearStorage();
    this.setState({ error: null });
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-10">
        <div
          role="alert"
          className="rounded-xl border border-rose-300/70 bg-rose-50 p-4 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200"
        >
          <p className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="size-4" />
            화면을 표시하는 중 오류가 발생했습니다
          </p>
          <p className="mt-1.5 text-xs leading-relaxed">
            입력한 직원 명부는 이 브라우저(localStorage)에 그대로 남아 있습니다. 다시 시도해도
            같은 문제가 반복되면 저장된 데이터를 초기화한 뒤 엑셀을 다시 업로드하세요.
          </p>
          <p className="mt-1.5 text-xs leading-relaxed">
            오류 원문에는 직원 정보가 포함될 수 있어 화면에 표시하지 않습니다. 개발자 도구
            콘솔에서 확인할 수 있습니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={this.reset}>
            <RotateCcw />
            다시 시도
          </Button>
          <Button variant="outline" onClick={this.clearAndReload}>
            <Trash2 />
            저장된 데이터 초기화
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          산출 금액은 참고용이며, 최종 판단과 책임은 세무사에게 있습니다.
        </p>
      </div>
    );
  }
}