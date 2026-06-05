import { memo, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { Bookmark } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap-setup';
import type { Message, MessageSnapshot } from '@/types';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { useChatStore } from '@/stores/chatStore';
import AgentMark from '../agent/AgentMark';
import FeedbackButton from './FeedbackButton';
import ShareButton from './ShareButton';
import Markdown from '@/components/ui/Markdown';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

// 무거운 카드/블록(지도·코스·예약·블록 렌더러)은 lazy 분리 — 웰컴/단순 텍스트 메시지에는
// 필요 없으므로 메인 번들에서 제외해 초기 로드(FCP/LCP)를 줄인다. 추천이 도착할 때 청크 fetch.
const PlaceCarousel = lazy(() => import('./PlaceCarousel'));
const ItineraryCard = lazy(() => import('./ItineraryCard'));
const BookingCard = lazy(() => import('./BookingCard'));
const BlockRenderer = lazy(() => import('./blocks').then((m) => ({ default: m.BlockRenderer })));

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export default memo(function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const bubbleRef = useRef<HTMLDivElement>(null);

  const conversationId = useChatStore((s) => s.sessionId);
  const toggleMessage = useBookmarkStore((s) => s.toggleMessage);
  // BE 가 발급한 message_id (number) 만 북마크/피드백/공유에 사용 가능.
  // streaming 직후 done.message_id 캡처가 안 됐거나 user 메시지면 string 또는 undefined.
  const beMessageId = typeof message.messageId === 'number' ? message.messageId : null;
  const beMessageIdStr = beMessageId != null ? String(beMessageId) : null;
  const isMessageBookmarked = useBookmarkStore((s) =>
    beMessageIdStr != null && s.messageItems.some((m) => m.messageId === beMessageIdStr),
  );

  // 외곽 컨테이너 진입 효과 — IntersectionObserver (native, off-main-thread layout) 로 변경.
  // 이전엔 ScrollTrigger 가 메시지 N개 만큼 layout 측정 트리거 → forced reflow.
  // IO 는 layout 측정 없이 entry 보고. once 후 disconnect.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const el = bubbleRef.current;
    if (!el) return;
    const scroller = el.closest<HTMLElement>('[data-chat-scroller]');
    if (!scroller) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            gsap.from(el, { y: 14, opacity: 0, duration: 0.45, ease: 'power2.out' });
            io.disconnect();
            break;
          }
        }
      },
      { root: scroller, rootMargin: '0px 0px -5% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

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
    // BE message_id 없으면 저장 불가 — 버튼 자체도 가려져 있어 일반적으로 도달 X.
    if (!beMessageIdStr) return;
    const snapshot: MessageSnapshot = {
      role: 'assistant',
      createdAt: message.timestamp,
      content: message.text,
      places: message.places,
      itinerary: message.itinerary ?? null,
    };
    toggleMessage({
      messageId: beMessageIdStr,
      conversationId,
      snapshot,
    });
  }, [message, beMessageIdStr, conversationId, toggleMessage]);

  return (
    <div
      ref={bubbleRef}
      data-message-id={message.messageId != null ? String(message.messageId) : undefined}
    >
      {isUser ? (
        <div className="flex justify-end pl-12">
          <div className="flex flex-col items-end gap-1.5 max-w-[85%]">
            {message.attachedImageUrl && (
              <a
                href={message.attachedImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-[180px] h-[180px] rounded-2xl rounded-br-sm overflow-hidden border border-brand/15 bg-bg-subtle"
                aria-label="첨부 사진 원본 열기"
              >
                <img
                  src={message.attachedImageUrl}
                  alt="첨부 사진"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </a>
            )}
            {message.text && (
              <div className="bg-brand-subtle border border-brand/8 rounded-2xl rounded-br-sm px-3.5 py-2.5 text-[14px] leading-[1.6] text-text-primary break-words">
                {message.text}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="group/bubble relative flex gap-2.5 pr-4">
          <AgentMark size={28} className="mt-0.5" />

          <div className="flex-1 min-w-0 space-y-2">
            {message.text && (
              <div data-reveal className="text-[14px] leading-[1.7] text-text-primary">
                <Markdown>{message.text}</Markdown>
              </div>
            )}

            {message.places && message.places.length > 0 && (
              <div data-reveal>
                <Suspense fallback={null}>
                  <PlaceCarousel places={message.places} />
                </Suspense>
              </div>
            )}

            {message.itineraries && message.itineraries.length > 1 ? (
              <div data-reveal className="space-y-3">
                <Suspense fallback={null}>
                  {message.itineraries.map((it) => (
                    <ItineraryCard key={it.id} itinerary={it} />
                  ))}
                </Suspense>
              </div>
            ) : (
              message.itinerary && (
                <div data-reveal>
                  <Suspense fallback={null}>
                    <ItineraryCard itinerary={message.itinerary} />
                  </Suspense>
                </div>
              )
            )}
            {message.booking && (
              <div data-reveal>
                <Suspense fallback={null}>
                  <BookingCard booking={message.booking} />
                </Suspense>
              </div>
            )}

            {message.blocks && message.blocks.length > 0 && (
              <div data-reveal className="space-y-2">
                <Suspense fallback={null}>
                  {message.blocks.map((block, i) => (
                    <ErrorBoundary
                      key={`${block.type}-${i}`}
                      fallback={<div className="text-[12px] text-text-muted px-1 py-0.5">이 항목을 표시할 수 없어요.</div>}
                    >
                      <BlockRenderer block={block} places={message.places} />
                    </ErrorBoundary>
                  ))}
                </Suspense>
              </div>
            )}

            {/* 어시스턴트 메시지 액션 행 — BE 가 부여한 message_id 가 있어야 모든 액션 가능.
                streaming 직후 done.message_id 캡처 실패 시엔 액션 행 숨김. */}
            {beMessageId != null && message.threadId && (
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
                <FeedbackButton threadId={message.threadId} messageId={beMessageId} />
                <ShareButton threadId={message.threadId} messageId={beMessageId} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
