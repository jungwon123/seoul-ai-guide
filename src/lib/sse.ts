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

// 알려진 SSE 이벤트 타입 — event: 필드가 없을 때 data.type 으로 폴백 판별.
const KNOWN_EVENTS = new Set<string>([
  'intent', 'status', 'text_stream', 'place', 'places', 'events', 'course',
  'map_markers', 'map_route', 'chart', 'calendar', 'references',
  'analysis_sources', 'disambiguation', 'done', 'done_partial', 'error',
]);

/**
 * SSE 스트림 시작. 반환된 close()로 중단.
 * `done` 이벤트 도달 → 자동 close + onClose() 호출.
 *
 * fetch + AbortController 기반 (네이티브 EventSource 미사용).
 *  - EventSource 는 스트림 종료/단절 시 같은 GET query 로 '자동 재연결' → 비멱등 쿼리가
 *    매번 처음부터 재실행되어 루프가 발생했음(특히 intent 파싱 등 데이터 공백 구간).
 *  - fetch 는 재연결이 없고 abort() 로 진행 중 요청을 즉시·확정적으로 취소 → 취소 버튼이
 *    준비중 단계에서도 정확히 동작.
 */
export function openChatStream(
  threadId: string,
  query: string,
  handlers: SseHandlers,
): SseConnection {
  const url = buildStreamUrl(threadId, query);
  const controller = new AbortController();
  let closed = false;

  const close = (): void => {
    if (closed) return;
    closed = true;
    controller.abort();
    handlers.onClose?.();
  };

  // SSE 프레임 1개(빈 줄 구분) 파싱 → 핸들러 디스패치.
  const dispatch = (raw: string): void => {
    if (closed) return;
    let eventType = '';
    const dataLines: string[] = [];
    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.startsWith(':')) continue; // 빈 줄/주석(heartbeat) 무시
      if (line.startsWith('event:')) eventType = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
    }
    if (dataLines.length === 0) return;
    let data: Block | undefined;
    try {
      data = JSON.parse(dataLines.join('\n')) as Block;
    } catch {
      return;
    }
    const type = (eventType || data.type) as SseEventType | '';
    if (!type || !KNOWN_EVENTS.has(type)) return;
    const handler = handlers[type as SseEventType];
    if (handler) handler(data);
    if (type === 'done' || (data.type === 'done' && (data as { reason?: string }).reason !== 'partial')) {
      close();
    }
  };

  (async () => {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'text/event-stream' },
        credentials: 'same-origin',
        signal: controller.signal,
      });
    } catch {
      if (!closed) {
        handlers.onError?.({ message: '연결 오류', recoverable: false });
        close();
      }
      return;
    }

    if (!res.ok || !res.body) {
      if (!closed) {
        handlers.onError?.({ message: `연결 실패 (${res.status})`, recoverable: false });
        close();
      }
      return;
    }

    handlers.onOpen?.();

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // 빈 줄(\n\n 또는 \r\n\r\n)로 구분된 완성 프레임만 처리, 나머지는 버퍼 유지.
        for (;;) {
          const m = buffer.match(/\r?\n\r?\n/);
          if (!m || m.index === undefined) break;
          const raw = buffer.slice(0, m.index);
          buffer = buffer.slice(m.index + m[0].length);
          dispatch(raw);
          if (closed) return;
        }
      }
      if (buffer.trim()) dispatch(buffer); // 종료 직전 잔여 프레임
    } catch {
      // abort(취소) 는 정상 흐름 — closed 면 조용히 종료.
      if (!closed) handlers.onError?.({ message: '스트림 오류', recoverable: false });
    }
    if (!closed) close();
  })();

  return { close };
}
