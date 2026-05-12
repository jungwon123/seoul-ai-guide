import { create } from 'zustand';
import type { AgentType, Message, Place, Itinerary, PlaceCategory, TransportMode } from '@/types';
import type { Block, PlaceBlockData, PlacesBlock, CourseBlock, MessageItem } from '@/types/api';
import { getWelcomeMessage } from '@/mocks/agent-responses';
import { openChatStream } from '@/lib/sse';
import { chatsApi } from '@/lib/api';
import { useMapStore } from './mapStore';

// SSE 블록 → 레거시 Message 타입 어댑터.
const ALLOWED_CATS: PlaceCategory[] = ['tourism', 'shopping', 'culture', 'food'];

function singlePlaceBlockToPlace(it: PlaceBlockData): Place {
  // congestion은 BE 표준 스펙엔 없는 mock 확장 필드. 있으면 통과시킴.
  const ext = it as PlaceBlockData & {
    congestion?: { level: 'low' | 'medium' | 'high'; updatedAt: string };
  };
  return {
    id: it.place_id,
    name: it.name,
    category: (ALLOWED_CATS.includes(it.category as PlaceCategory) ? it.category : 'tourism') as PlaceCategory,
    address: it.address ?? '',
    lat: it.lat ?? 0,
    lng: it.lng ?? 0,
    hours: '',
    rating: it.rating ?? 0,
    summary: it.summary ?? '',
    image: it.image_url,
    congestion: ext.congestion,
  };
}

function placesBlockToPlaces(block: PlacesBlock): Place[] {
  return block.items.map((it) => singlePlaceBlockToPlace({ ...it, type: 'place' }));
}

function courseBlockToItinerary(block: CourseBlock): Itinerary {
  // BE의 CourseBlock은 도착 시간/이동 수단 정보가 없으므로 합리적 기본값으로 채움.
  // duration_minutes 누적으로 도착시간 계산.
  let cursor = 10 * 60; // 10:00 from minutes-of-day
  const stops = block.stops.map((s, i) => {
    const hh = String(Math.floor(cursor / 60)).padStart(2, '0');
    const mm = String(cursor % 60).padStart(2, '0');
    const arrivalTime = `${hh}:${mm}`;
    const duration = s.duration_minutes ?? 60;
    cursor += duration + 15; // 다음 정거장까지 도보 15분 가정
    // image_url, address, category는 BE 표준 CourseStop엔 없는 mock 확장 필드.
    const ext = s as typeof s & {
      image_url?: string;
      address?: string;
      category?: PlaceCategory;
    };
    return {
      order: s.order ?? i + 1,
      placeId: s.place_id,
      placeName: s.name,
      arrivalTime,
      duration,
      transportToNext: 'walk' as TransportMode,
      travelTimeToNext: i < block.stops.length - 1 ? 15 : 0,
      lat: s.lat,
      lng: s.lng,
      imageUrl: ext.image_url,
      address: ext.address,
      category: ext.category,
    };
  });
  return {
    id: `itin-${Date.now()}`,
    title: block.title ?? '추천 코스',
    date: new Date().toISOString().slice(0, 10),
    stops,
  };
}

// BE의 MessageItem(blocks[]) → 레거시 Message로 변환.
// place/places → places, course → itinerary/itineraries, text/text_stream → text,
// intent/status/done/error 같은 제어 프레임은 무시(히스토리에는 의미 없음).
function messageItemToMessage(item: MessageItem, threadId: string): Message {
  const blocks: Block[] = item.blocks ?? [];
  let text = '';
  let places: Place[] | undefined;
  let itinerary: Itinerary | undefined;
  const itineraries: Itinerary[] = [];
  const otherBlocks: Block[] = [];

  for (const b of blocks) {
    if (b.type === 'text') {
      text += b.content;
    } else if (b.type === 'text_stream') {
      text += b.delta;
    } else if (b.type === 'place') {
      places = [singlePlaceBlockToPlace(b)];
    } else if (b.type === 'places') {
      places = placesBlockToPlaces(b);
    } else if (b.type === 'course') {
      const it = courseBlockToItinerary(b);
      itineraries.push(it);
      if (!itinerary) itinerary = it;
    } else if (
      b.type === 'intent' ||
      b.type === 'status' ||
      b.type === 'done' ||
      b.type === 'done_partial' ||
      b.type === 'error'
    ) {
      // 제어 프레임은 메시지 본문에 보존하지 않음.
    } else {
      otherBlocks.push(b);
    }
  }

  return {
    id: String(item.message_id),
    role: item.role === 'assistant' ? 'agent' : 'user',
    text,
    timestamp: item.created_at,
    places,
    itinerary,
    itineraries: itineraries.length > 1 ? itineraries : undefined,
    blocks: otherBlocks.length > 0 ? otherBlocks : undefined,
    threadId,
    messageId: item.message_id,
  };
}

export interface ChatSession {
  id: string;
  title: string;
  agent: AgentType;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface ChatStore {
  // Current session
  messages: Message[];
  isLoading: boolean;
  streamingText: string;
  selectedAgent: AgentType;
  sessionId: string;

  // History
  sessions: ChatSession[];

  sendMessage: (text: string) => Promise<void>;
  setAgent: (agent: AgentType) => void;
  clearChat: () => void;
  initWelcome: () => void;
  newChat: () => void;
  loadSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, title: string) => Promise<void>;
  // BE에서 thread 목록 동기화. 비로그인/실패 시 silent.
  loadFromServer: () => Promise<void>;
}

function generateSessionTitle(messages: Message[]): string {
  const firstUserMsg = messages.find((m) => m.role === 'user');
  if (!firstUserMsg) return '새 대화';
  const text = firstUserMsg.text;
  return text.length > 30 ? text.substring(0, 30) + '...' : text;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  streamingText: '',
  selectedAgent: 'claude',
  sessionId: `session-${Date.now()}`,
  sessions: [],

  initWelcome: () => {
    const { selectedAgent, messages } = get();
    if (messages.length > 0) return;
    const welcomeMsg: Message = {
      id: 'msg-welcome',
      role: 'agent',
      agent: selectedAgent,
      text: getWelcomeMessage(selectedAgent),
      timestamp: new Date().toISOString(),
    };
    set({ messages: [welcomeMsg] });
  },

  sendMessage: async (text: string) => {
    const { selectedAgent, messages, sessionId, sessions } = get();

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    set({ messages: updatedMessages, isLoading: true, streamingText: '' });

    // SSE 누적 버퍼 — done 시 한 번에 Message 빌드.
    let acc = '';
    let places: Place[] | undefined;
    let itinerary: Itinerary | undefined;
    const itineraries: Itinerary[] = [];
    const otherBlocks: Block[] = [];

    await new Promise<void>((resolve) => {
      const conn = openChatStream(sessionId, text, {
        text_stream: (data) => {
          if (data.type === 'text_stream') {
            acc += data.delta;
            set({ streamingText: acc });
          }
        },
        places: (data) => {
          if (data.type === 'places') {
            places = placesBlockToPlaces(data);
          }
        },
        place: (data) => {
          // DETAIL_INQUIRY 단건 응답 — places 배열에 1건만 채움.
          if (data.type === 'place') {
            places = [singlePlaceBlockToPlace(data)];
          }
        },
        course: (data) => {
          if (data.type === 'course') {
            const it = courseBlockToItinerary(data);
            itineraries.push(it);
            // 단수 필드는 첫 번째 코스로 유지 (기존 코드 호환).
            if (!itinerary) itinerary = it;
          }
        },
        // 그 외 블록은 그대로 message.blocks에 보존 → BlockRenderer가 렌더.
        chart: (data) => otherBlocks.push(data),
        events: (data) => otherBlocks.push(data),
        calendar: (data) => otherBlocks.push(data),
        references: (data) => otherBlocks.push(data),
        analysis_sources: (data) => otherBlocks.push(data),
        disambiguation: (data) => otherBlocks.push(data),
        map_markers: (data) => otherBlocks.push(data),
        map_route: (data) => otherBlocks.push(data),
        intent: () => {},
        status: () => {},
        done: () => {
          conn.close();
          resolve();
        },
        error: () => {
          conn.close();
          resolve();
        },
        onError: (err) => {
          if (!err.recoverable) {
            conn.close();
            resolve();
          }
        },
      });
    });

    const agentId = `msg-${Date.now()}-agent`;
    const agentMsg: Message = {
      id: agentId,
      role: 'agent',
      agent: selectedAgent,
      text: acc,
      timestamp: new Date().toISOString(),
      places,
      itinerary,
      itineraries: itineraries.length > 1 ? itineraries : undefined,
      blocks: otherBlocks.length > 0 ? otherBlocks : undefined,
      threadId: sessionId,
      messageId: agentId,
    };

    if (places && places.length > 0) {
      useMapStore.getState().setMarkers(places);
    }

    const allMessages = [...get().messages, agentMsg];
    const now = new Date().toISOString();

    const existingIdx = sessions.findIndex((s) => s.id === sessionId);
    const session: ChatSession = {
      id: sessionId,
      title: generateSessionTitle(allMessages),
      agent: selectedAgent,
      messages: allMessages,
      createdAt: existingIdx >= 0 ? sessions[existingIdx].createdAt : now,
      updatedAt: now,
    };

    const updatedSessions = existingIdx >= 0
      ? sessions.map((s) => (s.id === sessionId ? session : s))
      : [session, ...sessions];

    set({
      messages: allMessages,
      isLoading: false,
      streamingText: '',
      sessions: updatedSessions,
    });
  },

  setAgent: (agent: AgentType) => {
    const { messages, sessionId, sessions } = get();
    // Save current if it has user messages
    if (messages.some((m) => m.role === 'user')) {
      const now = new Date().toISOString();
      const existingIdx = sessions.findIndex((s) => s.id === sessionId);
      const session: ChatSession = {
        id: sessionId,
        title: generateSessionTitle(messages),
        agent: get().selectedAgent,
        messages,
        createdAt: existingIdx >= 0 ? sessions[existingIdx].createdAt : now,
        updatedAt: now,
      };
      const updatedSessions = existingIdx >= 0
        ? sessions.map((s) => (s.id === sessionId ? session : s))
        : [session, ...sessions];
      set({ sessions: updatedSessions });
    }

    const newId = `session-${Date.now()}`;
    set({ selectedAgent: agent, messages: [], streamingText: '', sessionId: newId });
    setTimeout(() => {
      const welcomeMsg: Message = {
        id: `msg-welcome-${agent}`,
        role: 'agent',
        agent,
        text: getWelcomeMessage(agent),
        timestamp: new Date().toISOString(),
      };
      set((state) => ({ messages: [...state.messages, welcomeMsg] }));
    }, 0);
  },

  newChat: () => {
    const { messages, sessionId, sessions, selectedAgent } = get();
    // Save current session if it has user messages
    if (messages.some((m) => m.role === 'user')) {
      const now = new Date().toISOString();
      const existingIdx = sessions.findIndex((s) => s.id === sessionId);
      const session: ChatSession = {
        id: sessionId,
        title: generateSessionTitle(messages),
        agent: selectedAgent,
        messages,
        createdAt: existingIdx >= 0 ? sessions[existingIdx].createdAt : now,
        updatedAt: now,
      };
      const updatedSessions = existingIdx >= 0
        ? sessions.map((s) => (s.id === sessionId ? session : s))
        : [session, ...sessions];
      set({ sessions: updatedSessions });
    }

    const newId = `session-${Date.now()}`;
    set({ messages: [], streamingText: '', isLoading: false, sessionId: newId });
    setTimeout(() => {
      const welcomeMsg: Message = {
        id: 'msg-welcome',
        role: 'agent',
        agent: selectedAgent,
        text: getWelcomeMessage(selectedAgent),
        timestamp: new Date().toISOString(),
      };
      set((state) => ({ messages: [...state.messages, welcomeMsg] }));
    }, 0);
  },

  loadSession: async (id: string) => {
    const { sessions, selectedAgent } = get();
    const existing = sessions.find((s) => s.id === id);
    try {
      const res = await chatsApi.messages(id, { limit: 100 });
      const messages = res.items.map((it) => messageItemToMessage(it, id));
      const now = new Date().toISOString();
      const session: ChatSession = existing
        ? { ...existing, messages, updatedAt: now }
        : { id, title: '새 대화', agent: selectedAgent, messages, createdAt: now, updatedAt: now };
      set({
        sessionId: id,
        messages,
        selectedAgent: session.agent,
        streamingText: '',
        isLoading: false,
        sessions: existing
          ? sessions.map((s) => (s.id === id ? session : s))
          : [session, ...sessions],
      });
    } catch {
      // BE 실패 시 로컬 캐시로 폴백.
      if (existing) {
        set({
          sessionId: existing.id,
          messages: existing.messages,
          selectedAgent: existing.agent,
          streamingText: '',
          isLoading: false,
        });
      }
    }
  },

  deleteSession: async (id: string) => {
    // Optimistic — 로컬에서 즉시 제거. BE 실패해도 다음 loadFromServer에서 복원됨.
    const state = get();
    if (state.sessionId === id) {
      set({
        sessions: state.sessions.filter((s) => s.id !== id),
        sessionId: `session-${Date.now()}`,
        messages: [],
        streamingText: '',
        isLoading: false,
      });
    } else {
      set({ sessions: state.sessions.filter((s) => s.id !== id) });
    }
    try {
      await chatsApi.delete(id);
    } catch {
      // silent — 다음 새로고침에 BE 진실로 복구
    }
  },

  renameSession: async (id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    // Optimistic 적용 + 실패 시 되돌림.
    const prev = get().sessions.find((s) => s.id === id)?.title ?? null;
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, title: trimmed, updatedAt: new Date().toISOString() } : s,
      ),
    }));
    try {
      await chatsApi.rename(id, trimmed);
    } catch {
      // 롤백 (BE에서 거절). prev가 null이면 그냥 두기.
      if (prev !== null) {
        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === id ? { ...s, title: prev } : s)),
        }));
      }
    }
  },

  loadFromServer: async () => {
    try {
      const res = await chatsApi.list({ limit: 50 });
      const selectedAgent = get().selectedAgent;
      const serverSessions: ChatSession[] = res.items.map((t) => ({
        id: t.thread_id,
        title: t.title ?? '새 대화',
        agent: selectedAgent,
        messages: [],
        createdAt: t.updated_at,
        updatedAt: t.updated_at,
      }));
      // 로컬-only 세션(아직 BE에 메시지 전송 안 한 새 대화)은 보존.
      const serverIds = new Set(serverSessions.map((s) => s.id));
      const localOnly = get().sessions.filter((s) => !serverIds.has(s.id));
      set({ sessions: [...serverSessions, ...localOnly] });
    } catch {
      // 비로그인 또는 네트워크 실패 — silent.
    }
  },

  clearChat: () => set({ messages: [], isLoading: false, streamingText: '' }),
}));
