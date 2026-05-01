import { useCallback, useRef } from 'react';
import { MapPin, Star, ChevronRight, Bookmark, Users } from 'lucide-react';
import type { Place } from '@/types';
import { CATEGORY_CONFIG, CONGESTION_CONFIG } from '@/lib/utils';
import { useMapStore } from '@/stores/mapStore';
import { useBookmarkStore } from '@/stores/bookmarkStore';

const SCROLL_STYLE: React.CSSProperties = { scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as const;

interface PlaceCarouselProps {
  places: Place[];
}

interface PlaceCardTileProps {
  place: Place;
  variant: 'single' | 'carousel';
  onSelect: (place: Place) => void;
}

function PlaceCardTile({ place, variant, onSelect }: PlaceCardTileProps) {
  const cat = CATEGORY_CONFIG[place.category];
  const bookmarkedIds = useBookmarkStore((s) => s.bookmarkedIds);
  const toggleBookmark = useBookmarkStore((s) => s.toggle);
  const isBookmarked = bookmarkedIds.includes(place.id);

  const handleBookmark = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    toggleBookmark(place.id);
  }, [place.id, toggleBookmark]);

  const widthClass = variant === 'single' ? 'w-full max-w-[350px]' : 'flex-none w-[280px]';

  return (
    <div
      onClick={() => onSelect(place)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(place); }}
      className={`${widthClass} snap-start bg-bg-surface border border-border rounded-2xl overflow-hidden transition-[border-color,box-shadow] duration-200 active:scale-[0.97] cursor-pointer text-left`}
      role="button"
      tabIndex={0}
      aria-label={`${place.name} - ${cat.label}`}
    >
      <div className="relative aspect-video bg-bg-subtle overflow-hidden">
        {place.image && (
          <img
            src={place.image}
            alt={place.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <span
          className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[11px] font-medium"
          style={{ backgroundColor: `${cat.color}14`, color: cat.color }}
        >
          {cat.label}
        </span>
        <button
          type="button"
          onClick={handleBookmark}
          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center bg-bg-surface/90 backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
          aria-label={isBookmarked ? '북마크 해제' : '북마크'}
          aria-pressed={isBookmarked}
        >
          <Bookmark
            size={12}
            strokeWidth={isBookmarked ? 0 : 1.8}
            fill={isBookmarked ? '#F59E0B' : 'none'}
            className={isBookmarked ? '' : 'text-text-primary'}
          />
        </button>
        {place.congestion && (
          <span
            className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-medium backdrop-blur-sm"
            style={{
              backgroundColor: CONGESTION_CONFIG[place.congestion.level].bg,
              color: CONGESTION_CONFIG[place.congestion.level].color,
            }}
          >
            <Users size={9} strokeWidth={2} aria-hidden="true" />
            지금 {CONGESTION_CONFIG[place.congestion.level].label}
          </span>
        )}
      </div>
      <div className="p-3">
        <h4 className="text-[14px] font-semibold text-text-primary truncate">{place.name}</h4>
        <div className="flex items-center gap-1 mt-1 text-[11px] text-text-muted">
          {place.rating > 0 && (
            <>
              <Star size={10} fill="currentColor" className="text-amber-500" aria-hidden="true" />
              <span className="tabular-nums">{place.rating}</span>
              <span className="mx-0.5">·</span>
            </>
          )}
          <MapPin size={9} aria-hidden="true" />
          <span className="truncate">{place.address.split(' ').slice(1, 3).join(' ')}</span>
        </div>
      </div>
    </div>
  );
}

export default function PlaceCarousel({ places }: PlaceCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectPlace = useMapStore((s) => s.selectPlace);

  const handlePlaceClick = useCallback((place: Place) => {
    selectPlace(place);
  }, [selectPlace]);

  if (places.length === 0) {
    return (
      <div className="mt-3 py-6 text-center text-[13px] text-text-muted">
        검색 결과가 없습니다. 다른 키워드로 검색해보세요.
      </div>
    );
  }

  if (places.length === 1) {
    return (
      <div className="mt-3">
        <PlaceCardTile place={places[0]} variant="single" onSelect={handlePlaceClick} />
      </div>
    );
  }

  return (
    <div className="mt-3 -mx-5">
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-5 pb-2 snap-x snap-mandatory"
        style={SCROLL_STYLE}
      >
        {places.map((place) => (
          <PlaceCardTile key={place.id} place={place} variant="carousel" onSelect={handlePlaceClick} />
        ))}
        {places.length > 3 && (
          <div className="flex-none w-16 snap-start flex flex-col items-center justify-center gap-1 text-text-muted" aria-hidden="true">
            <ChevronRight size={20} />
            <span className="text-[11px]">{places.length}개</span>
          </div>
        )}
      </div>
    </div>
  );
}
