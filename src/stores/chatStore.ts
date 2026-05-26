import { create } from 'zustand';
import type { AgentType, Message, Place, Itinerary, PlaceCategory, TransportMode } from '@/types';
import type { Block, PlaceBlockData, PlacesBlock, CourseBlock, EventsBlock, EventItem, MessageItem } from '@/types/api';
import { getWelcomeMessage } from '@/mocks/agent-responses';
import { openChatStream } from '@/lib/sse';
import { chatsApi } from '@/lib/api';
import { prefetchCourse3D } from '@/lib/prefetch-3d';
import { friendlyApiError } from '@/lib/auth-errors';
import { normalizeCategory } from '@/lib/utils';
import { useMapStore } from './mapStore';

// SSE 블록 → 레거시 Message 타입 어댑터.

export function singlePlaceBlockToPlace(it: PlaceBlockData): Place {
  // BE PlaceBlock.congestion (PR #70 머지 시 자동 활성화). snake_case → camelCase 변환.
  // mock 시절 camelCase updatedAt 폴백 흡수 — 양쪽 데이터 지원.
  const c = it.congestion as
    | { level: 'low' | 'medium' | 'high'; updated_at?: string; updatedAt?: string; source?: string }
    | undefined;
  const congestion = c
    ? { level: c.level, updatedAt: c.updated_at ?? c.updatedAt ?? '', source: c.source }
    : undefined;
  return {
    id: it.place_id,
    name: it.name,
    category: normalizeCategory(it.category) ?? 'tourism',
    address: it.address ?? '',
    lat: it.lat ?? 0,
    lng: it.lng ?? 0,
    hours: '',
    rating: it.rating ?? 0,
    summary: it.summary ?? '',
    image: it.image_url,
    congestion,
    naverMapUrl: it.naver_map_url,
    kakaoMapUrl: it.kakao_map_url,
  };
}

export function placesBlockToPlaces(block: PlacesBlock): Place[] {
  return block.items.map((it) => singlePlaceBlockToPlace({ ...it, type: 'place' }));
}

// EVENT_RECOMMEND 인텐트 응답의 events 블록 → 마커용 Place[].
// lat/lng가 없는 항목은 마커로 띄울 수 없어 제외.
function eventsBlockToPlaces(block: EventsBlock): Place[] {
  return block.items
    .filter((it): it is EventItem & { lat: number; lng: number } =>
      typeof it.lat === 'number' && typeof it.lng === 'number',
    )
    .map((it) => ({
      id: it.event_id,
      name: it.title,
      category: 'culture' as PlaceCategory,
      address: it.address ?? it.place_name ?? '',
      lat: it.lat,
      lng: it.lng,
      hours: '',
      rating: 0,
      summary: '',
      image: it.image_url,
    }));
}

export function courseBlockToItinerary(block: CourseBlock): Itinerary {
  // BE CourseBlock 실제 스키마: stop이 nested(place/transit_to_next). arrival_time/transit는 BE 값을 우선,
  // 누락 시 누적 커서로 보정.
  let cursor = 10 * 60; // 10:00 fallback start
  const stops = block.stops.map((s, i) => {
    const p = s.place;
    const transit = s.transit_to_next ?? null;
    const arrivalTime = s.arrival_time ?? (() => {
      const hh = String(Math.floor(cursor / 60)).padStart(2, '0');
      const mm = String(cursor % 60).padStart(2, '0');
      return `${hh}:${mm}`;
    })();
    const duration = s.duration_min ?? 60;
    const isLast = i >= block.stops.length - 1;
    const travelTimeToNext = isLast ? 0 : (transit?.duration_min ?? 15);
    const transportToNext: TransportMode = (transit?.mode ?? 'walk') as TransportMode;
    cursor += duration + travelTimeToNext;
    const category = normalizeCategory(p.category);
    return {
      order: s.order ?? i + 1,
      placeId: p.place_id,
      placeName: p.name,
      arrivalTime,
      duration,
      transportToNext,
      travelTimeToNext,
      lat: p.location?.lat,
      lng: p.location?.lng,
      imageUrl: p.photo_url,
      address: p.address,
      category,
      rating: p.rating,
      reason: s.recommendation_reason,
    };
  });
  return {
    id: block.course_id ?? `itin-${Date.now()}`,
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
      // BE는 라이브에선 delta, 저장본에선 content 필드를 씀.
      text += b.delta ?? b.content ?? '';
    } else if (b.type === 'place') {
      places = [singlePlaceBlockToPlace(b)];
    } else if (b.type === 'places') {
      places = placesBlockToPlaces(b);
    } else if (b.type === 'course') {
      const it = courseBlockToItinerary(b);
      itineraries.push(it);
      if (!itinerary) itinerary = it;
    } else if (b.type === 'events') {
      // events 블록은 채팅 카드용으로 otherBlocks에 보존하면서, 좌표 있는 항목은 마커용 Place로도 추출.
      const eventPlaces = eventsBlockToPlaces(b);
      if (eventPlaces.length > 0) places = places ? [...places, ...eventPlaces] : eventPlaces;
      otherBlocks.push(b);
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

  // user 메시지의 텍스트에 첨부 이미지 URL 이 inline 으로 끼어 있을 수 있음 (전송 흐름).
  // UI 에선 thumb 으로 분리 표시 — text 에서 추출 + 제거.
  let attachedImageUrl: string | undefined;
  if (item.role !== 'assistant') {
    const imgMatch = text.match(/(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s]*)?)/i);
    if (imgMatch) {
      attachedImageUrl = imgMatch[0];
      text = text.replace(imgMatch[0], '').replace(/이 사진과 비슷한 곳 추천해줘\s*$/, '').trim();
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
    attachedImageUrl,
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
  // BE 가 SSE status 이벤트로 보내는 진행 상황 메시지 ("코스를 계획하고 있어요..." 등).
  // text_stream 첫 delta 도착 시 비움 (실 답변이 흐르기 시작하면 상태 텍스트 무의미).
  currentStatus: string;
  selectedAgent: AgentType;
  sessionId: string;

  // History
  sessions: ChatSession[];
  // loadFromServer의 4상태 UI용 — sessions가 비어있을 때만 의미.
  chatsLoading: boolean;
  chatsError: string | null;

  sendMessage: (text: string, imageUrl?: string) => Promise<void>;
  setAgent: (agent: AgentType) => void;
  clearChat: () => void;
  initWelcome: () => void;
  newChat: () => void;
  loadSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, title: string) => Promise<void>;
  // BE에서 thread 목록 동기화. 비로그인/실패 시 silent하지만 chatsError를 채움.
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
  currentStatus: '',
  selectedAgent: 'claude',
  sessionId: `session-${Date.now()}`,
  sessions: [],
  chatsLoading: false,
  chatsError: null,

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

  sendMessage: async (text: string, imageUrl?: string) => {
    const { selectedAgent, messages, sessionId, sessions } = get();

    // BE 는 query 텍스트에서 regex 로 image URL 파싱 → 우리는 본문에 URL 을 끼워서 전송.
    // 단 UI 에 보여주는 user message 는 텍스트 + 첨부 thumb 으로 분리.
    const queryForBE = imageUrl
      ? (text ? `${text}\n${imageUrl}` : `이 사진과 비슷한 곳 추천해줘\n${imageUrl}`)
      : text;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
      attachedImageUrl: imageUrl,
    };

    const updatedMessages = [...messages, userMsg];
    set({ messages: updatedMessages, isLoading: true, streamingText: '', currentStatus: '' });

    // SSE 누적 버퍼 — done 시 한 번에 Message 빌드.
    let acc = '';
    let places: Place[] | undefined;
    let itinerary: Itinerary | undefined;
    const itineraries: Itinerary[] = [];
    const otherBlocks: Block[] = [];
    // BE PR #81 — done 이벤트에서 송신되는 assistant message_id 캡처.
    // 새로고침 없이 북마크/피드백/공유 버튼 동작에 필요.
    let beMessageId: number | undefined;

    await new Promise<void>((resolve) => {
      const conn = openChatStream(sessionId, queryForBE, {
        text_stream: (data) => {
          if (data.type === 'text_stream') {
            acc += data.delta ?? data.content ?? '';
            // 실제 답변이 흐르기 시작하면 진행 상태 텍스트는 더 이상 의미 없음.
            set({ streamingText: acc, currentStatus: '' });
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
            // 백그라운드 prefetch — 사용자가 3D 보기 토글하기 전 미리 데이터/모듈 준비.
            prefetchCourse3D(it.stops);
          }
        },
        // 그 외 블록은 그대로 message.blocks에 보존 → BlockRenderer가 렌더.
        chart: (data) => otherBlocks.push(data),
        events: (data) => {
          if (data.type === 'events') {
            const eventPlaces = eventsBlockToPlaces(data);
            if (eventPlaces.length > 0) places = places ? [...places, ...eventPlaces] : eventPlaces;
          }
          otherBlocks.push(data);
        },
        calendar: (data) => otherBlocks.push(data),
        references: (data) => otherBlocks.push(data),
        analysis_sources: (data) => otherBlocks.push(data),
        disambiguation: (data) => otherBlocks.push(data),
        map_markers: (data) => otherBlocks.push(data),
        map_route: (data) => otherBlocks.push(data),
        intent: () => {},
        status: (data) => {
          // BE 가 보내는 진행 상황 메시지를 TypingIndicator 에 노출.
          if (data.type === 'status' && data.message) {
            set({ currentStatus: data.message });
          }
        },
        done: (data) => {
          if (data.type === 'done' && typeof data.message_id === 'number') {
            beMessageId = data.message_id;
          }
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
      // BE 송신 message_id 우선, 없으면 FE 로컬 ID(fallback — 북마크/피드백 비활성).
      messageId: beMessageId ?? agentId,
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
      currentStatus: '',
      sessions: updatedSessions,
    });

    // BE가 thread 자동 제목 생성을 안 해주는 우회 — 첫 메시지 응답 후 로컬 title을 서버에 push.
    // 실패해도 로컬 title은 유지되므로 fire-and-forget. BE 자동 제목 기능 들어오면 제거.
    if (existingIdx < 0 && acc.length > 0) {
      chatsApi.rename(sessionId, session.title).catch(() => {});
    }
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
    set({ chatsLoading: true, chatsError: null });
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
      set({ sessions: [...serverSessions, ...localOnly], chatsLoading: false });
    } catch (e) {
      set({
        chatsLoading: false,
        chatsError: friendlyApiError(e, '대화 목록을 불러올 수 없습니다'),
      });
    }
  },

  clearChat: () => set({ messages: [], isLoading: false, streamingText: '' }),
}));
