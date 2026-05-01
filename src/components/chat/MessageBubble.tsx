import { memo, useCallback } from 'react';
import { Bookmark } from 'lucide-react';
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

export default memo(function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const agent = message.agent ?? 'claude';

  const conversationId = useChatStore((s) => s.sessionId);
  const toggleMessage = useBookmarkStore((s) => s.toggleMessage);
  const isMessageBookmarked = useBookmarkStore((s) =>
    s.messageItems.some((m) => m.messageId === message.id),
  );

  const handleBookmark = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const snapshot: MessageSnapshot = {
      role: 'assistant',
      createdAt: message.timestamp,
      content: message.text,
      agent: message.agent,
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
    <div className="animate-message">
      {isUser ? (
        <div className="flex justify-end pl-12">
          <div className="bg-brand-subtle border border-brand/8 rounded-2xl rounded-br-sm px-3.5 py-2.5 text-[14px] leading-[1.6] text-text-primary">
            {message.text}
          </div>
        </div>
      ) : (
        <div className="group/bubble relative flex gap-2.5 pr-4">
          <AgentMark agent={agent} size={28} className="mt-0.5" />

          <div className="flex-1 min-w-0 space-y-2">
            <div className="text-[14px] leading-[1.7] text-text-primary">
              {message.text}
            </div>

            {message.places && message.places.length > 0 && (
              <PlaceCarousel places={message.places} />
            )}

            {message.itineraries && message.itineraries.length > 1 ? (
              <div className="space-y-3">
                {message.itineraries.map((it) => (
                  <ItineraryCard key={it.id} itinerary={it} />
                ))}
              </div>
            ) : (
              message.itinerary && <ItineraryCard itinerary={message.itinerary} />
            )}
            {message.booking && <BookingCard booking={message.booking} />}

            {message.blocks && message.blocks.length > 0 && (
              <div className="space-y-2">
                {message.blocks.map((block, i) => (
                  <BlockRenderer key={`${block.type}-${i}`} block={block} />
                ))}
              </div>
            )}

            {/* 어시스턴트 메시지 액션 행 — 항상 노출 (호버/터치 모두 접근 가능) */}
            <div className="flex items-center gap-1 pt-1">
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
