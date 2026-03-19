'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { AGENT_COLORS } from '@/lib/utils';
import AgentOrb from '@/components/agent/AgentOrb';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ChatInput from './ChatInput';

export default function ChatPanel() {
  const { messages, isLoading, streamingText, selectedAgent, sendMessage, setAgent, initWelcome } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { initWelcome(); }, [initWelcome]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, streamingText]);

  const hasOnlyWelcome = messages.length <= 1;
  const agentColor = AGENT_COLORS[selectedAgent];

  return (
    <div className="flex flex-col h-full bg-bg-surface">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {/* Orb hero — collapses as messages grow */}
        <div className={hasOnlyWelcome ? 'pt-4' : 'pt-2'}>
          <AgentOrb
            agent={selectedAgent}
            isThinking={isLoading && !streamingText}
            isStreaming={isLoading && !!streamingText}
            onAgentChange={setAgent}
          />
        </div>

        {/* Welcome subtitle */}
        {hasOnlyWelcome && (
          <div className="text-center px-8 -mt-2 mb-6 animate-fade-up">
            <p className="text-[13px] text-text-muted leading-relaxed">
              서울의 장소, 코스, 예약까지<br />무엇이든 물어보세요
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="px-5 pb-4 space-y-5">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Streaming */}
          {isLoading && streamingText && (
            <div className="flex gap-3 pr-12 animate-message">
              <div
                className="w-7 h-7 rounded-[10px] flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5"
                style={{ backgroundColor: `${agentColor}08`, color: agentColor, border: `1px solid ${agentColor}15` }}
              >
                {selectedAgent[0].toUpperCase()}
              </div>
              <div className="flex-1 text-[14px] leading-[1.7] text-text-primary tracking-[-0.006em]">
                {streamingText}
                <span className="inline-block w-[2px] h-[15px] bg-brand ml-[2px] align-text-bottom" style={{ animation: 'cursorBlink 1s step-end infinite' }} />
              </div>
            </div>
          )}

          {isLoading && !streamingText && <TypingIndicator agent={selectedAgent} />}
        </div>
      </div>

      <ChatInput onSend={sendMessage} disabled={isLoading} showChips={hasOnlyWelcome} />
    </div>
  );
}
