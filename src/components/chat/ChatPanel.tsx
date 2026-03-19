'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { AGENT_COLORS } from '@/lib/utils';
import AgentSelector from './AgentSelector';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ChatInput from './ChatInput';

export default function ChatPanel() {
  const { messages, isLoading, streamingText, selectedAgent, sendMessage, setAgent, initWelcome } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initWelcome();
  }, [initWelcome]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, streamingText]);

  const hasOnlyWelcome = messages.length <= 1;
  const agentColor = AGENT_COLORS[selectedAgent];

  return (
    <div className="flex flex-col h-full bg-bg-surface">
      <AgentSelector selected={selectedAgent} onSelect={setAgent} />

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Streaming */}
        {isLoading && streamingText && (
          <div className="flex gap-2.5 items-start animate-message">
            <div
              className="w-7 h-7 rounded-lg bg-bg-subtle border border-border flex items-center justify-center text-[12px] font-semibold shrink-0"
              style={{ color: agentColor }}
            >
              {selectedAgent[0].toUpperCase()}
            </div>
            <div className="flex-1 pt-1 text-[14px] leading-[1.65] text-text-primary">
              {streamingText}
              <span className="inline-block w-[2px] h-[14px] bg-brand ml-0.5 align-middle animate-pulse" />
            </div>
          </div>
        )}

        {isLoading && !streamingText && <TypingIndicator agent={selectedAgent} />}
      </div>

      <ChatInput onSend={sendMessage} disabled={isLoading} showChips={hasOnlyWelcome} />
    </div>
  );
}
