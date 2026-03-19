import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from './chatStore';

describe('chatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      messages: [],
      isLoading: false,
      streamingText: '',
      selectedAgent: 'claude',
      sessions: [],
      sessionId: 'test-session',
    });
  });

  it('should initialize with empty messages', () => {
    const { messages } = useChatStore.getState();
    expect(messages).toEqual([]);
  });

  it('should set agent', () => {
    useChatStore.getState().setAgent('gpt');
    const { selectedAgent } = useChatStore.getState();
    expect(selectedAgent).toBe('gpt');
  });

  it('should init welcome message', () => {
    useChatStore.getState().initWelcome();
    const { messages } = useChatStore.getState();
    expect(messages.length).toBe(1);
    expect(messages[0].role).toBe('agent');
    expect(messages[0].agent).toBe('claude');
  });

  it('should not duplicate welcome message', () => {
    useChatStore.getState().initWelcome();
    useChatStore.getState().initWelcome();
    const { messages } = useChatStore.getState();
    expect(messages.length).toBe(1);
  });

  it('should create new chat and save current session', async () => {
    // Add a user message first
    useChatStore.setState({
      messages: [
        { id: '1', role: 'user', text: '테스트', timestamp: new Date().toISOString() },
      ],
    });

    useChatStore.getState().newChat();

    // newChat uses setTimeout for welcome message
    await new Promise((r) => setTimeout(r, 10));

    const { sessions, messages } = useChatStore.getState();

    expect(sessions.length).toBe(1);
    expect(sessions[0].title).toBe('테스트');
    // New chat starts with welcome message (may include prior welcome)
    const lastMsg = messages[messages.length - 1];
    expect(lastMsg.role).toBe('agent');
    expect(lastMsg.agent).toBe('claude');
  });

  it('should delete session', () => {
    useChatStore.setState({
      sessions: [
        { id: 's1', title: 'test', agent: 'claude', messages: [], createdAt: '', updatedAt: '' },
        { id: 's2', title: 'test2', agent: 'gpt', messages: [], createdAt: '', updatedAt: '' },
      ],
    });

    useChatStore.getState().deleteSession('s1');
    const { sessions } = useChatStore.getState();
    expect(sessions.length).toBe(1);
    expect(sessions[0].id).toBe('s2');
  });
});
