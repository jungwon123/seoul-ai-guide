// SSE 클라이언트 — /api/v1/chat/stream 연결.
// EventSource는 Authorization 헤더를 못 보내므로 token query param 사용.
// ⚠️ 보안 주의: 쿼리스트링 토큰은 서버 access log / 브라우저 히스토리 / Referer 헤더로
//   누출 위험이 있다. 운영에서는 BE가 SSE용 단명(short-lived) 토큰을 별도 발급하거나
//   쿠키 기반 인증으로 전환해야 한다. (BE 협의 필요)

import type { Block, SseEventType } from '@/types/api';
import { getToken } from '@/lib/api';

export type SseHandlers = Partial<Record<SseEventType, (data: Block) => void>> & {
  onOpen?: () => void;
  onError?: (err: { message: string; recoverable: boolean }) => void;
  onClose?: () => void;
};

export type SseConnection = {
  close: () => void;
};

function buildStreamUrl(threadId: string, query: string): string {
  const base = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';
  const params = new URLSearchParams({
    thread_id: threadId,
    query,
  });
  const token = getToken();
  if (token) params.set('token', token);
  return `${base.replace(/\/$/, '')}/api/v1/chat/stream?${params.toString()}`;
}

/**
 * SSE 스트림 시작. 반환된 close()로 중단.
 * `done` 이벤트 도달 → 자동 close + onClose() 호출.
 */
export function openChatStream(
  threadId: string,
  query: string,
  handlers: SseHandlers,
): SseConnection {
  const url = buildStreamUrl(threadId, query);
  const es = new EventSource(url, { withCredentials: false });
  let closed = false;

  const close = (): void => {
    if (closed) return;
    closed = true;
    es.close();
    handlers.onClose?.();
  };

  es.onopen = () => handlers.onOpen?.();

  // 모든 SSE 이벤트 타입에 동일 디스패처 부착
  const eventTypes: SseEventType[] = [
    'intent',
    'status',
    'text_stream',
    'place',
    'places',
    'events',
    'course',
    'map_markers',
    'map_route',
    'chart',
    'calendar',
    'references',
    'analysis_sources',
    'disambiguation',
    'done',
    'done_partial',
    'error',
  ];
  for (const t of eventTypes) {
    es.addEventListener(t, (ev: MessageEvent) => {
      let data: Block | undefined;
      try {
        data = JSON.parse(ev.data) as Block;
      } catch {
        return;
      }
      const handler = handlers[t];
      if (handler && data) handler(data);
      if (t === 'done' || (data && data.type === 'done' && (data as { reason?: string }).reason !== 'partial')) {
        close();
      }
    });
  }

  // EventSource onerror — 네트워크 단절. 브라우저가 자동 재연결 시도.
  // ⚠️ EventSource는 HTTP 상태(401 등)를 노출하지 않아 토큰 만료 시 무한 재연결로
  //   서버 로그/CPU가 폭주할 수 있다. 짧은 윈도우 내 N회 이상 onerror가 누적되면
  //   강제 close + 사용자에게 unrecoverable 통지.
  const ERROR_WINDOW_MS = 10_000;
  const ERROR_THRESHOLD = 5;
  const errorTimestamps: number[] = [];

  es.onerror = () => {
    const now = Date.now();
    while (errorTimestamps.length > 0 && now - errorTimestamps[0] > ERROR_WINDOW_MS) {
      errorTimestamps.shift();
    }
    errorTimestamps.push(now);
    const exceeded = errorTimestamps.length >= ERROR_THRESHOLD;
    const browserClosed = es.readyState === EventSource.CLOSED;

    handlers.onError?.({
      message: exceeded ? '연결이 반복적으로 실패했습니다' : '연결 오류',
      recoverable: !exceeded && !browserClosed,
    });

    if (browserClosed || exceeded) {
      close();
    }
  };

  return { close };
}
