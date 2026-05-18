import { memo, useCallback, useRef } from 'react';
import { Bookmark } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap-setup';
import type { Message, MessageSnapshot } from '@/types';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { useChatStore } from '@/stores/chatStore';
import AgentMark from '../agent/AgentMark';
import PlaceCarousel from './PlaceCarousel';
import ItineraryCard from './ItineraryCard';
import BookingCard from './BookingCard';
import FeedbackButton from './FeedbackButton';
import ShareButton from './ShareButton';
import { BlockRenderer } from './blocks';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export default memo(function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const bubbleRef = useRef<HTMLDivElement>(null);

  const conversationId = useChatStore((s) => s.sessionId);
  const toggleMessage = useBookmarkStore((s) => s.toggleMessage);
  const isMessageBookmarked = useBookmarkStore((s) =>
    s.messageItems.some((m) => m.messageId === message.id),
  );

  // 외곽 컨테이너 진입 효과 — ScrollTrigger 로 스크롤 컨테이너 viewport 진입 시 페이드.
  // 새로 도착한 메시지는 mount 시 이미 화면 안이라 즉시 발화 (animate-message 대체).
  // 긴 히스토리에서 위로 스크롤 시 옛 메시지도 진입 타이밍에 자연스럽게 등장.
  useGSAP(() => {
    if (prefersReducedMotion()) return;
    const el = bubbleRef.current;
    if (!el) return;
    const scroller = el.closest<HTMLElement>('[data-chat-scroller]');
    if (!scroller) return;
    const tween = gsap.from(el, {
      y: 14,
      opacity: 0,
      duration: 0.45,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        scroller,
        start: 'top 95%',
        once: true,
      },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, { scope: bubbleRef });

  // 어시스턴트 답변의 자식 섹션(text → places → itinerary → blocks → actions)을
  // 작은 간격으로 순차 reveal. 외곽 ScrollTrigger 와 독립적으로 mount 시 동작.
  useGSAP(() => {
    if (isUser) return;
    if (prefersReducedMotion()) return;
    const items = bubbleRef.current?.querySelectorAll<HTMLElement>('[data-reveal]');
    if (!items || items.length === 0) return;
    gsap.from(items, {
      y: 8,
      opacity: 0,
      duration: 0.35,
      ease: 'power2.out',
      stagger: 0.07,
      delay: 0.15,
    });
  }, { scope: bubbleRef });

  const handleBookmark = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const snapshot: MessageSnapshot = {
      role: 'assistant',
      createdAt: message.timestamp,
      content: message.text,
      places: message.places,
      itinerary: message.itinerary ?? null,
    };
    toggleMessage({
      messageId: message.id,
      conversationId,
      snapshot,
    });
  }, [message, conversationId, toggleMessage]);

  return (
    <div ref={bubbleRef}>
      {isUser ? (
        <div className="flex justify-end pl-12">
          <div className="bg-brand-subtle border border-brand/8 rounded-2xl rounded-br-sm px-3.5 py-2.5 text-[14px] leading-[1.6] text-text-primary">
            {message.text}
          </div>
        </div>
      ) : (
        <div className="group/bubble relative flex gap-2.5 pr-4">
          <AgentMark size={28} className="mt-0.5" />

          <div className="flex-1 min-w-0 space-y-2">
            <div data-reveal className="text-[14px] leading-[1.7] text-text-primary">
              {message.text}
            </div>

            {message.places && message.places.length > 0 && (
              <div data-reveal>
                <PlaceCarousel places={message.places} />
              </div>
            )}

            {message.itineraries && message.itineraries.length > 1 ? (
              <div data-reveal className="space-y-3">
                {message.itineraries.map((it) => (
                  <ItineraryCard key={it.id} itinerary={it} />
                ))}
              </div>
            ) : (
              message.itinerary && (
                <div data-reveal>
                  <ItineraryCard itinerary={message.itinerary} />
                </div>
              )
            )}
            {message.booking && (
              <div data-reveal>
                <BookingCard booking={message.booking} />
              </div>
            )}

            {message.blocks && message.blocks.length > 0 && (
              <div data-reveal className="space-y-2">
                {message.blocks.map((block, i) => (
                  <BlockRenderer key={`${block.type}-${i}`} block={block} />
                ))}
              </div>
            )}

            {/* 어시스턴트 메시지 액션 행 — 항상 노출 (호버/터치 모두 접근 가능) */}
            <div data-reveal className="flex items-center gap-1 pt-1">
              <button
                type="button"
                onClick={handleBookmark}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded transition-colors cursor-pointer text-xs ${
                  isMessageBookmarked
                    ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-overlay'
                }`}
                aria-label={isMessageBookmarked ? '대화 북마크 해제' : '대화 북마크'}
                aria-pressed={isMessageBookmarked}
              >
                <Bookmark
                  size={14}
                  strokeWidth={isMessageBookmarked ? 0 : 1.8}
                  fill={isMessageBookmarked ? '#F59E0B' : 'none'}
                />
                <span>{isMessageBookmarked ? '저장됨' : '저장'}</span>
              </button>
              {message.threadId && message.messageId != null && String(message.messageId).length > 0 && (
                <>
                  <FeedbackButton threadId={message.threadId} messageId={message.messageId} />
                  <ShareButton threadId={message.threadId} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
