

import { Component, type ReactNode, type ErrorInfo } from 'react';
import Button from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      // 새 배포로 chunk 해시가 바뀐 뒤 캐시 페이지가 옛 chunk 를 못 받는 경우(dynamic import
      // 실패). 소프트 리셋으론 복구 안 되므로 전체 새로고침을 안내한다.
      const msg = this.state.error?.message ?? '';
      const isChunkError = /dynamically imported module|importing a module script failed|failed to fetch dynamically|chunkloaderror|loading chunk/i.test(msg);

      if (isChunkError) {
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="text-4xl mb-4">🔄</div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">
              새 버전이 배포되었어요
            </h3>
            <p className="text-xs text-text-muted mb-4 max-w-xs">
              페이지를 새로고침하면 최신 버전으로 이어집니다.
            </p>
            <Button variant="secondary" size="sm" onClick={this.handleReload}>
              새로고침
            </Button>
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-sm font-semibold text-text-primary mb-1">
            문제가 발생했습니다
          </h3>
          <p className="text-xs text-text-muted mb-4 max-w-xs">
            {this.state.error?.message || '알 수 없는 오류가 발생했습니다.'}
          </p>
          <Button variant="secondary" size="sm" onClick={this.handleReset}>
            다시 시도
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
