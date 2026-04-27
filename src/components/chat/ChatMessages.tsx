import { memo, useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import MessageBubble from './MessageBubble';
import StreamingMessage from './StreamingMessage';
import LottiePlayer from '@/components/ui/LottiePlayer';

export default memo(function ChatMessages() {
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);

  const scrollRef = useRef<HTMLDivElement>(null);
  const hasOnlyWelcome = messages.length <= 1;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
      {hasOnlyWelcome && (
        <div className="flex flex-col items-center justify-center pt-16 pb-8 px-8 animate-fade-up">
          <LottiePlayer
            src="/animations/AI-logo.json"
            className="w-[180px] h-[180px] mb-6"
            ariaLabel="Seoul Edit AI"
            fallback={
              <div className="w-[180px] h-[180px] mb-6 rounded-full bg-brand-subtle border border-border" />
            }
          />
          <h2 className="text-[22px] font-bold text-text-primary mb-2 tracking-tight">
            서울을 탐색해보세요
          </h2>
          <p className="text-[14px] text-text-muted text-center leading-relaxed max-w-[260px]">
            장소 추천, 코스 설계, 예약까지
            <br />무엇이든 물어보세요
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
