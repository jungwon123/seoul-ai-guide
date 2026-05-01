import { memo, useCallback, useEffect, useRef } from 'react';
import { MapPin, Star, Clock, X, Bookmark } from 'lucide-react';
import type { Place } from '@/types';
import { CATEGORY_CONFIG, CONGESTION_CONFIG } from '@/lib/utils';
import { useBookmarkStore } from '@/stores/bookmarkStore';

interface Props {
  place: Place;
  isBookmark: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
  registerRef: (id: string, el: HTMLElement | null) => void;
}

export default memo(function PlaceOverlayItem({ place, isBookmark, isSelected, onSelect, onClose, registerRef }: Props) {
  const cat = CATEGORY_CONFIG[place.category];
  const ref = useRef<HTMLDivElement>(null);
  const toggleBookmark = useBookmarkStore((s) => s.toggle);

  useEffect(() => {
    registerRef(place.id, ref.current);
    return () => registerRef(place.id, null);
  }, [place.id, registerRef]);

  const handleBookmark = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleBookmark(place);
  }, [place, toggleBookmark]);

  return (
    <div
      ref={ref}
      data-place-id={place.id}
      onClick={(e) => { e.stopPropagation(); onSelect(place.id); }}
      className="snap-center shrink-0 w-[85%] max-w-[400px] bg-bg-surface rounded-2xl shadow-md border border-border overflow-hidden cursor-pointer transition-all relative"
      style={{ scrollSnapAlign: 'center', opacity: isSelected ? 1 : 0.75 }}
      role="button"
    >
      {isSelected && (
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary bg-bg-surface/80 hover:bg-bg-subtle transition-colors cursor-pointer z-10"
          aria-label="닫기"
        >
          <X size={14} strokeWidth={1.8} />
        </button>
      )}
      <div className="flex gap-3 p-3">
        <div className="w-16 h-16 shrink-0 relative">
          <div
            className="w-full h-full rounded-xl flex items-center justify-center text-[22px] font-semibold overflow-hidden"
            style={{ backgroundColor: `${cat.color}14`, color: cat.color }}
          >
            {place.image ? (
              <img src={place.image} alt={place.name} className="w-full h-full object-cover" />
            ) : (
              place.name.slice(0, 1)
            )}
          </div>
          <button
            onClick={handleBookmark}
            className={`absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow-sm border-2 border-white transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer z-10 ${
              isBookmark ? 'bg-amber-500' : 'bg-white'
            }`}
            aria-label={isBookmark ? '북마크 해제' : '북마크'}
            aria-pressed={isBookmark}
          >
            <Bookmark
              size={10}
              strokeWidth={isBookmark ? 0 : 1.8}
              fill={isBookmark ? 'white' : 'none'}
              className={isBookmark ? '' : 'text-text-muted'}
            />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-text-primary tracking-[-0.02em] leading-tight truncate pr-7">
            {place.name}
          </h3>

          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span
              className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
              style={{ backgroundColor: `${cat.color}14`, color: cat.color }}
            >
              {cat.label}
            </span>
            {place.rating > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] text-text-secondary tabular-nums">
                <Star size={10} fill="currentColor" className="text-amber-500" aria-hidden="true" />
                {place.rating}
              </span>
            )}
            {place.congestion && (() => {
              const c = CONGESTION_CONFIG[place.congestion.level];
              return (
                <span
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ backgroundColor: c.bg, color: c.color }}
                  aria-label={`혼잡도: ${c.label}`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: c.color }}
                    aria-hidden="true"
                  />
                  {c.label}
                </span>
              );
            })()}
          </div>

          <div className="flex items-center gap-1 mt-1 text-[11px] text-text-muted min-w-0">
            <MapPin size={10} strokeWidth={1.5} aria-hidden="true" />
            <span className="truncate">{place.address}</span>
          </div>

          {place.hours && (
            <div className="flex items-center gap-1 mt-0.5 text-[11px] text-text-muted">
              <Clock size={10} strokeWidth={1.5} aria-hidden="true" />
              <span className="truncate">{place.hours}</span>
            </div>
          )}
        </div>
      </div>

      {place.summary && (
        <div className="px-3 pb-3 border-t border-border pt-2.5">
          <p className="text-[13px] text-text-primary leading-[1.55] line-clamp-2">
            {place.summary}
          </p>
        </div>
      )}
    </div>
  );
});
