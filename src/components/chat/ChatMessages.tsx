import { memo, useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import MessageBubble from './MessageBubble';
import StreamingMessage from './StreamingMessage';
import AgentOrb from '@/components/agent/AgentOrb';

export default memo(function ChatMessages() {
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);

  const scrollRef = useRef<HTMLDivElement>(null);
  const hasOnlyWelcome = messages.length <= 1;

  useEffect(() => {
    // rAF 로 다음 프레임에 읽기/쓰기 — commit 단계에서 scrollHeight 를 동기로 읽어
    // 강제 reflow 나던 것을 레이아웃 단계와 분리.
    const id = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(id);
  }, [messages, isLoading]);

  return (
    <div ref={scrollRef} data-chat-scroller className="flex-1 overflow-y-auto overscroll-contain">
      {hasOnlyWelcome && (
        <div className="flex flex-col items-center justify-center pt-14 pb-10 px-8 animate-fade-up">
          <div className="mb-7">
            <AgentOrb state={isLoading ? 'thinking' : 'idle'} size={220} />
          </div>
          <h2
            className="text-[34px] leading-[1.05] text-text-primary mb-3 text-center"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em', wordBreak: 'keep-all' }}
          >
            서울을<br />탐색해보세요
          </h2>
          <p className="text-[14px] text-text-secondary text-center leading-[1.55] max-w-[280px]" style={{ wordBreak: 'keep-all' }}>
            장소 추천, 코스 설계, 예약까지<br />무엇이든 물어보세요
          </p>
        </div>
      )}

      <div className="px-4 pb-4 space-y-5">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <StreamingMessage />
      </div>
    </div>
  );
});
