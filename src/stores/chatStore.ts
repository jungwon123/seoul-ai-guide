import { create } from 'zustand';
import type { AgentType, Message } from '@/types';
import { streamResponse, getWelcomeMessage } from '@/mocks/agent-responses';

interface ChatStore {
  messages: Message[];
  isLoading: boolean;
  streamingText: string;
  selectedAgent: AgentType;
  sessionId: string;

  sendMessage: (text: string) => Promise<void>;
  setAgent: (agent: AgentType) => void;
  clearChat: () => void;
  initWelcome: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  streamingText: '',
  selectedAgent: 'claude',
  sessionId: `session-${Date.now()}`,

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
    const { selectedAgent, messages } = get();

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    set({ messages: [...messages, userMsg], isLoading: true, streamingText: '' });

    try {
      const stream = streamResponse(text, text);
      let finalData: { places?: Message['places']; itinerary?: Message['itinerary']; booking?: Message['booking'] } = {};

      for await (const chunk of stream) {
        if (chunk.done) {
          finalData = { places: chunk.places, itinerary: chunk.itinerary, booking: chunk.booking };
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

      set((state) => ({
        messages: [...state.messages, agentMsg],
        isLoading: false,
        streamingText: '',
      }));
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
    set({ selectedAgent: agent, messages: [], streamingText: '' });
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

  clearChat: () => set({ messages: [], isLoading: false, streamingText: '' }),
}));
