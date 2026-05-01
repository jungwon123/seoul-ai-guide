import { create } from 'zustand';
import type { AgentType, Message } from '@/types';
import { streamResponse, getWelcomeMessage } from '@/mocks/agent-responses';
import { useMapStore } from './mapStore';

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

    try {
      const stream = streamResponse(text, text);
      let finalData: {
        places?: Message['places'];
        itinerary?: Message['itinerary'];
        booking?: Message['booking'];
        blocks?: Message['blocks'];
      } = {};

      for await (const chunk of stream) {
        if (chunk.done) {
          finalData = {
            places: chunk.places,
            itinerary: chunk.itinerary,
            booking: chunk.booking,
            blocks: chunk.blocks,
          };
        }
        set({ streamingText: chunk.text });
      }

      const agentMsg: Message = {
        id: `msg-${Date.now()}-agent`,
        role: 'agent',
        agent: selectedAgent,
        text: get().streamingText,
        timestamp: new Date().toISOString(),
        ...finalData,
      };

      // Push recommendation places to the map (replaces previous recommendations)
      if (finalData.places && finalData.places.length > 0) {
        useMapStore.getState().setMarkers(finalData.places);
      }

      const allMessages = [...get().messages, agentMsg];
      const now = new Date().toISOString();

      // Save/update session in history
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
    } catch {
      const errorMsg: Message = {
        id: `msg-${Date.now()}-error`,
        role: 'agent',
        agent: selectedAgent,
        text: '죄송합니다. 응답을 생성하는 중에 문제가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date().toISOString(),
      };
      set((state) => ({
        messages: [...state.messages, errorMsg],
        isLoading: false,
        streamingText: '',
      }));
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
