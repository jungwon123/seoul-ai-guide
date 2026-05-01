import { create } from 'zustand';
import type { AgentType, Message, Place, Itinerary, PlaceCategory, TransportMode } from '@/types';
import type { Block, PlaceBlockData, PlacesBlock, CourseBlock } from '@/types/api';
import { getWelcomeMessage } from '@/mocks/agent-responses';
import { openChatStream } from '@/lib/sse';
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
    // image_url은 BE 표준 CourseStop엔 없는 mock 확장 필드. 있으면 통과.
    const ext = s as typeof s & { image_url?: string };
    return {
      order: s.order ?? i + 1,
      placeId: s.place_id,
      placeName: s.name,
      arrivalTime,
      duration,
      transportToNext: 'walk' as TransportMode,
      travelTimeToNext: i < block.stops.length - 1 ? 15 : 0,
      imageUrl: ext.image_url,
    };
  });
  return {
    id: `itin-${Date.now()}`,
    title: block.title ?? '추천 코스',
    date: new Date().toISOString().slice(0, 10),
    stops,
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
  loadSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
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
            itinerary = courseBlockToItinerary(data);
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

  loadSession: (id: string) => {
    const { sessions } = get();
    const session = sessions.find((s) => s.id === id);
    if (!session) return;
    set({
      sessionId: session.id,
      messages: session.messages,
      selectedAgent: session.agent,
      streamingText: '',
      isLoading: false,
    });
  },

  deleteSession: (id: string) => {
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
    }));
  },

  clearChat: () => set({ messages: [], isLoading: false, streamingText: '' }),
}));
