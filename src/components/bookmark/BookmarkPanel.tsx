import { useMemo, useState } from 'react';
import { MessageSquare, MapPin, Sparkles, Trash2 } from 'lucide-react';
import type { MessageBookmarkItem, Place } from '@/types';
import { AGENT_COLORS, CATEGORY_CONFIG, cn } from '@/lib/utils';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { useMapStore } from '@/stores/mapStore';
import { useChatStore } from '@/stores/chatStore';
import LottiePlayer from '@/components/ui/LottiePlayer';
import placesData from '@/mocks/places.json';

const ALL_PLACES = placesData as Place[];

type Tab = 'place' | 'message';

interface Props {
  onClose?: () => void;
}

export default function BookmarkPanel({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('place');

  const bookmarkedIds = useBookmarkStore((s) => s.bookmarkedIds);
  const messageItems = useBookmarkStore((s) => s.messageItems);
  const places = useMemo(
    () =>
      bookmarkedIds
        .map((id) => ALL_PLACES.find((p) => p.id === id))
        .filter((p): p is Place => p !== undefined),
    [bookmarkedIds],
  );

  const counts = { place: places.length, message: messageItems.length };

  return (
    <div className="h-full flex flex-col bg-bg-base">
      {/* Segmented tabs — 슬라이딩 pill 인디케이터 */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <div
          role="tablist"
          aria-label="북마크 종류"
          className="relative flex items-center gap-1 p-1 bg-bg-subtle rounded-full border border-border/60"
        >
          {/* sliding pill — 활성 탭 인덱스(0/1)에 따라 50% 슬라이드 */}
          <span
            aria-hidden
            className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-bg-surface shadow-sm border border-border transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
            style={{
              transform: tab === 'message' ? 'translateX(calc(100% + 0.25rem))' : 'translateX(0)',
            }}
          />
          <TabButton
            active={tab === 'place'}
            label="장소"
            count={counts.place}
            icon={<MapPin size={13} strokeWidth={1.8} />}
            onClick={() => setTab('place')}
          />
          <TabButton
            active={tab === 'message'}
            label="대화"
            count={counts.message}
            icon={<MessageSquare size={13} strokeWidth={1.8} />}
            onClick={() => setTab('message')}
          />
        </div>
      </div>

      {/* Content — 탭 변경 시 cross-fade */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div key={tab} className="animate-tab-content">
          {tab === 'place' ? (
            <PlaceBookmarks places={places} onClose={onClose} />
          ) : (
            <MessageBookmarks items={messageItems} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active, label, count, icon, onClick,
}: { active: boolean; label: string; count: number; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'relative z-10 flex-1 flex items-center justify-center gap-1.5 h-9 rounded-full text-[13px] font-medium transition-colors duration-200 cursor-pointer active:scale-[0.97] motion-safe:transition-transform',
        active ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary',
      )}
    >
      {icon}
      <span>{label}</span>
      <span
        className={cn(
          'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-semibold tabular-nums transition-colors',
          active
            ? 'bg-brand-subtle text-brand'
            : 'bg-bg-surface/80 text-text-muted',
        )}
      >
        {count}
      </span>
    </button>
  );
}

/* =========================== 장소 탭 =========================== */

function PlaceBookmarks({ places, onClose }: { places: Place[]; onClose?: () => void }) {
  const removeBookmark = useBookmarkStore((s) => s.remove);
  const selectPlace = useMapStore((s) => s.selectPlace);

  if (places.length === 0) {
    return (
      <EmptyState
        lottieSrc="/animations/empty-place.json"
        icon={<MapPin size={28} strokeWidth={1.2} />}
        title="저장한 장소가 없어요"
        description="채팅이나 지도에서 마음에 드는 장소를 저장해보세요"
      />
    );
  }

  return (
    <div className="px-4 pb-6 pt-1 stagger-children space-y-2.5">
      {places.map((place) => {
        const cat = CATEGORY_CONFIG[place.category];
        return (
          <article
            key={place.id}
            className="group flex items-center gap-3 p-2 bg-bg-surface border border-border rounded-2xl transition-all duration-200 hover:border-border-strong hover:shadow-sm cursor-pointer"
            onClick={() => { selectPlace(place); onClose?.(); }}
          >
            <div
              className="relative w-[68px] h-[68px] rounded-xl bg-bg-subtle shrink-0 overflow-hidden flex items-center justify-center"
              style={{ backgroundColor: `${cat.color}0f` }}
            >
              {place.image ? (
                <img
                  src={place.image}
                  alt={place.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <span
                  className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tracking-wider"
                  style={{ color: cat.color }}
                >
                  {cat.label.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span
                  className="text-[10px] font-medium"
                  style={{ color: cat.color }}
                >
                  {cat.label}
                </span>
              </div>
              <h4 className="text-[14px] font-semibold text-text-primary tracking-[-0.01em] truncate">
                {place.name}
              </h4>
              <p className="text-[11.5px] text-text-muted truncate mt-0.5">{place.address}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); removeBookmark(place.id); }}
              className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-all cursor-pointer shrink-0"
              aria-label={`${place.name} 북마크 해제`}
            >
              <Trash2 size={14} />
            </button>
          </article>
        );
      })}
    </div>
  );
}

/* =========================== 대화 탭 =========================== */

function MessageBookmarks({ items, onClose }: { items: MessageBookmarkItem[]; onClose?: () => void }) {
  const removeMessage = useBookmarkStore((s) => s.removeMessage);
  const loadSession = useChatStore((s) => s.loadSession);

  const grouped = useMemo(() => items, [items]);

  if (grouped.length === 0) {
    return (
      <EmptyState
        lottieSrc="/animations/empty-message.json"
        icon={<Sparkles size={28} strokeWidth={1.2} />}
        title="저장한 대화가 없어요"
        description="에이전트 답변 위에 마우스를 올리면 북마크 아이콘이 나타나요"
      />
    );
  }

  return (
    <div className="px-4 pb-6 pt-1 stagger-children space-y-2.5">
      {grouped.map((item) => {
        const agent = item.snapshot.agent ?? 'claude';
        const color = AGENT_COLORS[agent];
        const relDate = formatRelativeDate(item.createdAt);
        const placeCount = item.snapshot.places?.length ?? 0;

        return (
          <article
            key={item.bookmarkId}
            className="group relative bg-bg-surface border border-border rounded-2xl p-3.5 transition-all duration-200 hover:border-border-strong hover:shadow-sm cursor-pointer"
            onClick={() => { loadSession(item.conversationId); onClose?.(); }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-[18px] h-[18px] rounded-md flex items-center justify-center text-[9px] font-bold"
                style={{ backgroundColor: `${color}14`, color }}
              >
                {agent[0].toUpperCase()}
              </span>
              <span className="text-[11px] font-medium" style={{ color }}>
                {agent}
              </span>
              <span className="text-[11px] text-text-muted">·</span>
              <span className="text-[11px] text-text-muted">{relDate}</span>

              <button
                onClick={(e) => { e.stopPropagation(); removeMessage(item.messageId); }}
                className="ml-auto opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-all cursor-pointer"
                aria-label="대화 북마크 해제"
              >
                <Trash2 size={13} />
              </button>
            </div>

            <p className="text-[13.5px] leading-[1.6] text-text-primary line-clamp-3">
              {item.snapshot.content}
            </p>

            {placeCount > 0 && (
              <div className="mt-2.5 flex items-center gap-1.5">
                <div className="flex -space-x-2">
                  {(item.snapshot.places ?? []).slice(0, 3).map((p) => {
                    const cat = CATEGORY_CONFIG[p.category];
                    return (
                      <span
                        key={p.id}
                        className="w-7 h-7 rounded-full border-2 border-bg-surface overflow-hidden shrink-0 flex items-center justify-center text-[10px] font-semibold"
                        style={{ backgroundColor: `${cat.color}18`, color: cat.color }}
                        title={p.name}
                      >
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          cat.label[0]
                        )}
                      </span>
                    );
                  })}
                </div>
                <span className="text-[11px] text-text-muted">
                  장소 {placeCount}곳 포함
                </span>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

/* =========================== 공통 =========================== */

function EmptyState({
  icon, title, description, lottieSrc,
}: { icon: React.ReactNode; title: string; description: string; lottieSrc?: string }) {
  return (
    <div className="flex flex-col items-center justify-center pt-16 pb-12 px-8 text-center animate-fade-up">
      {lottieSrc ? (
        <LottiePlayer
          src={lottieSrc}
          className="w-28 h-28 mb-3"
          ariaLabel={title}
          fallback={
            <div className="w-16 h-16 rounded-full bg-bg-subtle border border-border flex items-center justify-center text-text-muted mb-4">
              {icon}
            </div>
          }
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-bg-subtle border border-border flex items-center justify-center text-text-muted mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-[16px] font-semibold text-text-primary tracking-[-0.01em] mb-1.5">
        {title}
      </h3>
      <p className="text-[13px] text-text-muted leading-[1.6] max-w-[260px]">
        {description}
      </p>
    </div>
  );
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  const hour = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  if (hour < 24) return `${hour}시간 전`;
  if (day < 7) return `${day}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export { BookmarkPanel };
