'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { AGENT_CONFIG } from '@/lib/utils';
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
  const agentConfig = AGENT_CONFIG[selectedAgent];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-bg-secondary/50 backdrop-blur-sm shrink-0">
        <h2 className="text-sm font-semibold text-text-primary">Chat</h2>
        <AgentSelector selected={selectedAgent} onSelect={setAgent} />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Streaming text */}
        {isLoading && streamingText && (
          <div className="flex items-start gap-3 animate-fade-in-up">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: agentConfig.color }}
            >
              {agentConfig.label[0]}
            </div>
            <div className="bg-bg-elevated rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-text-primary leading-relaxed max-w-[80%]">
              {streamingText}
              <span className="inline-block w-0.5 h-4 bg-brand-primary ml-0.5 animate-pulse align-middle" />
            </div>
          </div>
        )}

        {/* Typing indicator (before streaming starts) */}
        {isLoading && !streamingText && <TypingIndicator agent={selectedAgent} />}
      </div>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        disabled={isLoading}
        showChips={hasOnlyWelcome}
      />
    </div>
  );
}
