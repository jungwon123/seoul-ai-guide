'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import AgentSelector from './AgentSelector';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ChatInput from './ChatInput';

export default function ChatPanel() {
  const { messages, isLoading, selectedAgent, sendMessage, setAgent, initWelcome } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initWelcome();
  }, [initWelcome]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const hasOnlyWelcome = messages.length <= 1;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-bg-secondary/50 backdrop-blur-sm">
        <h2 className="text-sm font-semibold text-text-primary">Chat</h2>
        <AgentSelector selected={selectedAgent} onSelect={setAgent} />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && <TypingIndicator agent={selectedAgent} />}
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
