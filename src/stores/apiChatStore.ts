// 백엔드 SSE 연동 채팅 스토어 (chatStore와 분리해서 점진 전환).
// SSE → 메시지 블록 누적 → UI 렌더.

import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import { chatsApi } from '@/lib/api';
import { openChatStream, type SseConnection } from '@/lib/sse';
import type { Block, ChatListItem, MessageItem } from '@/types/api';

export type StreamMessage = {
  id: string;
  role: 'user' | 'assistant';
  blocks: Block[];        // 누적된 블록들
  streamingText: string;  // text_stream delta 합산
  status?: string;        // 진행 표시 (LangGraph node)
  intent?: string;
  done?: boolean;
  error?: string;
  createdAt: string;
};

interface ApiChatStore {
  threadId: string | null;
  threads: ChatListItem[];
  messages: StreamMessage[];
  isStreaming: boolean;
  currentStatus: string;
  error: string | null;

  // actions
  loadThreads: () => Promise<void>;
  newThread: () => void;
  loadThread: (threadId: string) => Promise<void>;
  renameThread: (threadId: string, title: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;

  send: (query: string) => Promise<void>;
  abort: () => void;

  _connection: SseConnection | null;
}

const blocksToText = (blocks: Block[]): string =>
  blocks
    .map((b) => {
      if (b.type === 'text') return b.content;
      if (b.type === 'text_stream') return b.delta;
      return '';
    })
    .join('');

const mapMessageItem = (item: MessageItem): StreamMessage => ({
  id: String(item.message_id),
  role: item.role,
  blocks: item.blocks,
  streamingText: blocksToText(item.blocks),
  done: true,
  createdAt: item.created_at,
});

export const useApiChatStore = create<ApiChatStore>((set, get) => ({
  threadId: null,
  threads: [],
  messages: [],
  isStreaming: false,
  currentStatus: '',
  error: null,
  _connection: null,

  loadThreads: async () => {
    try {
      const res = await chatsApi.list({ limit: 50 });
      set({ threads: res.items });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  newThread: () => {
    get()._connection?.close();
    set({
      threadId: `thread-${uuid()}`,
      messages: [],
      isStreaming: false,
      currentStatus: '',
      error: null,
      _connection: null,
    });
  },

  loadThread: async (threadId) => {
    get()._connection?.close();
    set({ threadId, messages: [], error: null, _connection: null });
    try {
      const res = await chatsApi.messages(threadId, { limit: 100 });
      set({ messages: res.items.map(mapMessageItem) });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  renameThread: async (threadId, title) => {
    await chatsApi.rename(threadId, title);
    set((s) => ({
      threads: s.threads.map((t) => (t.thread_id === threadId ? { ...t, title } : t)),
    }));
  },

  deleteThread: async (threadId) => {
    await chatsApi.delete(threadId);
    set((s) => ({
      threads: s.threads.filter((t) => t.thread_id !== threadId),
      threadId: s.threadId === threadId ? null : s.threadId,
      messages: s.threadId === threadId ? [] : s.messages,
    }));
  },

  send: async (query) => {
    let { threadId } = get();
    if (!threadId) {
      threadId = `thread-${uuid()}`;
      set({ threadId });
    }

    // 1) 사용자 메시지 즉시 추가
    const userMsg: StreamMessage = {
      id: `local-${uuid()}`,
      role: 'user',
      blocks: [{ type: 'text', content: query }],
      streamingText: query,
      done: true,
      createdAt: new Date().toISOString(),
    };
    // 2) 빈 assistant 자리 추가 — 블록을 누적할 컨테이너
    const assistantMsg: StreamMessage = {
      id: `streaming-${uuid()}`,
      role: 'assistant',
      blocks: [],
      streamingText: '',
      createdAt: new Date().toISOString(),
    };
    set((s) => ({
      messages: [...s.messages, userMsg, assistantMsg],
      isStreaming: true,
      currentStatus: '',
      error: null,
    }));

    // 3) SSE 연결
    const conn = openChatStream(threadId, query, {
      intent: (data) => {
        if (data.type === 'intent') {
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantMsg.id ? { ...m, intent: data.intent, blocks: [...m.blocks, data] } : m,
            ),
          }));
        }
      },
      status: (data) => {
        if (data.type === 'status') {
          set({ currentStatus: data.message });
        }
      },
      text_stream: (data) => {
        if (data.type === 'text_stream') {
          // rAF 배칭: 1토큰 = 1 setState면 긴 응답에서 수천번 리렌더가 일어난다.
          // 같은 프레임 내 도착한 delta들을 모아 1번만 set으로 flush.
          scheduleStreamFlush(set, assistantMsg.id, data.delta);
        }
      },
      place: (data) => appendBlock(set, assistantMsg.id, data),
      places: (data) => appendBlock(set, assistantMsg.id, data),
      events: (data) => appendBlock(set, assistantMsg.id, data),
      course: (data) => appendBlock(set, assistantMsg.id, data),
      map_markers: (data) => appendBlock(set, assistantMsg.id, data),
      map_route: (data) => appendBlock(set, assistantMsg.id, data),
      chart: (data) => appendBlock(set, assistantMsg.id, data),
      calendar: (data) => appendBlock(set, assistantMsg.id, data),
      references: (data) => appendBlock(set, assistantMsg.id, data),
      analysis_sources: (data) => appendBlock(set, assistantMsg.id, data),
      disambiguation: (data) => appendBlock(set, assistantMsg.id, data),
      done: (data) => {
        // rAF 큐에 남은 delta가 있으면 done 처리 전 동기 flush.
        flushStreamSync(set);
        set((s) => ({
          isStreaming: false,
          currentStatus: '',
          messages: s.messages.map((m) => {
            if (m.id !== assistantMsg.id) return m;
            const finalBlocks: Block[] = [...m.blocks];
            if (m.streamingText) {
              finalBlocks.push({ type: 'text', content: m.streamingText });
            }
            finalBlocks.push(data);
            return { ...m, done: true, blocks: finalBlocks };
          }),
          _connection: null,
        }));
      },
      done_partial: () => {
        // multi-intent 다음 블록을 기다림 — 별도 처리 없음
      },
      error: (data) => {
        if (data.type === 'error') {
          // SSE error 이벤트 = 응답 종료 의도. EventSource를 명시적으로 닫지 않으면
          // 브라우저가 자동 재연결을 시도해 401/오류 폭주가 발생할 수 있음.
          flushStreamSync(set);
          get()._connection?.close();
          set((s) => ({
            isStreaming: false,
            error: data.message,
            currentStatus: '',
            _connection: null,
            messages: s.messages.map((m) =>
              m.id === assistantMsg.id ? { ...m, error: data.message, done: true } : m,
            ),
          }));
        }
      },
      onError: (err) => {
        if (!err.recoverable) {
          set({ isStreaming: false, error: err.message });
        }
      },
      onClose: () => {
        set({ _connection: null });
      },
    });
    set({ _connection: conn });
  },

  abort: () => {
    const conn = get()._connection;
    if (!conn) return;
    conn.close();
    set({ isStreaming: false, currentStatus: '', _connection: null });
  },
}));

// --- helpers ---
type SetState = (
  fn: (state: ApiChatStore) => Partial<ApiChatStore>,
) => void;

function appendBlock(set: SetState, msgId: string, block: Block): void {
  set((s) => ({
    messages: s.messages.map((m) =>
      m.id === msgId ? { ...m, blocks: [...m.blocks, block] } : m,
    ),
  }));
}

// --- text_stream rAF 배칭 ---
// 같은 프레임 내에 도착한 delta를 모아 한 번만 setState. 긴 응답에서 리렌더 폭주를 막음.
const pendingStreamDeltas = new Map<string, string>();
let streamRafId: number | null = null;

function scheduleStreamFlush(set: SetState, msgId: string, delta: string): void {
  pendingStreamDeltas.set(msgId, (pendingStreamDeltas.get(msgId) ?? '') + delta);
  if (streamRafId !== null) return;
  streamRafId = requestAnimationFrame(() => flushStreamSync(set));
}

function flushStreamSync(set: SetState): void {
  if (streamRafId !== null) {
    cancelAnimationFrame(streamRafId);
    streamRafId = null;
  }
  if (pendingStreamDeltas.size === 0) return;
  const updates = new Map(pendingStreamDeltas);
  pendingStreamDeltas.clear();
  set((s) => ({
    currentStatus: '',
    messages: s.messages.map((m) => {
      const d = updates.get(m.id);
      return d ? { ...m, streamingText: m.streamingText + d } : m;
    }),
  }));
}
