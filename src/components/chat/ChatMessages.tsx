import { memo, useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import MessageBubble from './MessageBubble';
import StreamingMessage from './StreamingMessage';
import AgentOrb from '@/components/agent/AgentOrb';

export default memo(function ChatMessages() {
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);

  const focusMessageId = useChatStore((s) => s.focusMessageId);
  const clearFocusMessageId = useChatStore((s) => s.clearFocusMessageId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const hasOnlyWelcome = messages.length <= 1;

  useEffect(() => {
    // 북마크 점프(focus) 진행 중이면 하단 자동스크롤을 건너뛴다(타겟 스크롤과 충돌 방지).
    // focusMessageId 는 deps 에서 제외 — 소비(null) 시 이 effect 가 재실행돼 하단으로
    // 튕기는 것을 막고, 다음 '새 메시지'(messages 변경) 때 정상 하단 스크롤되게 한다.
    if (useChatStore.getState().focusMessageId) return;
    const id = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(id);
  }, [messages, isLoading]);

  // 북마크에서 점프한 메시지로 스크롤 + 하이라이트. lazy 카드(코스/장소)가 뒤늦게 mount 되며
  // 높이가 늘어나므로 ResizeObserver 로 ~900ms 동안 재정렬한 뒤 focus 를 소비한다.
  useEffect(() => {
    if (!focusMessageId) return;
    const scroller = scrollRef.current;
    if (!scroller) return;

    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let settleTimer = 0;

    const findEl = () =>
      scroller.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(focusMessageId)}"]`);
    const align = () => {
      const el = findEl();
      if (el) el.scrollIntoView({ block: 'center', behavior: 'auto' });
      return el;
    };

    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      const el = align();
      if (!el) {
        // 타겟을 못 찾음(이론상 store 가 이미 검증하지만 방어적) → 소비만.
        clearFocusMessageId();
        return;
      }
      // 잠깐 강조 — 어느 버블인지 즉시 인지되게.
      el.style.transition = 'box-shadow 0.25s ease';
      el.style.borderRadius = '14px';
      el.style.boxShadow = '0 0 0 2px var(--color-brand)';
      window.setTimeout(() => {
        el.style.boxShadow = '';
      }, 1600);

      // lazy 카드 높이 변동 추적 재정렬.
      ro = new ResizeObserver(() => {
        if (!cancelled) align();
      });
      ro.observe(el);
      settleTimer = window.setTimeout(() => {
        ro?.disconnect();
        clearFocusMessageId();
      }, 900);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.clearTimeout(settleTimer);
    };
  }, [focusMessageId, messages, clearFocusMessageId]);

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
