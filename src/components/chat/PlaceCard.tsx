import { useState } from 'react';
import { MapPin, Star, Bookmark } from 'lucide-react';
import type { Place } from '@/types';
import { CATEGORY_CONFIG } from '@/lib/utils';
import { useMapStore } from '@/stores/mapStore';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import BookingForm from '@/components/booking/BookingForm';

interface PlaceCardProps {
  place: Place;
  compact?: boolean;
}

export default function PlaceCard({ place, compact }: PlaceCardProps) {
  const selectPlace = useMapStore((s) => s.selectPlace);
  const toggleBookmark = useBookmarkStore((s) => s.toggle);
  const isBookmarked = useBookmarkStore((s) => s.bookmarkedIds.includes(place.id));
  const [bookingOpen, setBookingOpen] = useState(false);

  const cat = CATEGORY_CONFIG[place.category];

  const handleViewOnMap = () => {
    selectPlace(place);
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleBookmark(place.id);
  };

  return (
    <>
      <article
        aria-label={`${place.name} - ${cat.label}`}
        className="group bg-bg-surface border border-border rounded-2xl overflow-hidden transition-[border-color,box-shadow,transform] duration-200 hover:shadow-md hover:border-border-strong hover:-translate-y-[1px]"
      >
        <div className="relative aspect-video bg-bg-subtle overflow-hidden">
          {place.image && (
            <img
              src={place.image}
              alt={place.name}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => {
                // 이미지 로드 실패 시 카테고리 색 placeholder로 대체
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <span
            className="absolute top-3 left-3 z-10 px-2 py-0.5 rounded-full text-[11px] font-medium"
            style={{ backgroundColor: `${cat.color}14`, color: cat.color }}
          >
            {cat.label}
          </span>
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
            {place.rating > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-bg-surface/90 text-text-primary backdrop-blur-sm tabular-nums">
                <Star size={10} fill="currentColor" className="text-amber-500" aria-hidden="true" />
                {place.rating}
              </span>
            )}
            <button
              onClick={handleBookmark}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-bg-surface/90 backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
              aria-label={isBookmarked ? '북마크 해제' : '북마크'}
              aria-pressed={isBookmarked}
            >
              <Bookmark
                size={13}
                strokeWidth={isBookmarked ? 0 : 1.8}
                fill={isBookmarked ? '#F59E0B' : 'none'}
                className={isBookmarked ? '' : 'text-text-primary'}
              />
            </button>
          </div>
        </div>

        <div className="px-3.5 py-3">
          <h4 className="text-[14px] font-semibold text-text-primary tracking-[-0.02em] leading-tight truncate">
            {place.name}
          </h4>
          <div className="flex items-center gap-1 mt-1.5 text-[12px] text-text-muted min-w-0">
            <MapPin size={11} strokeWidth={1.5} aria-hidden="true" />
            <span className="truncate">{place.address}</span>
          </div>
          {!compact && (
            <p className="text-[13px] text-text-primary mt-2 leading-[1.6] line-clamp-2">
              {place.summary}
            </p>
          )}
          {!compact && (
            <div className="flex border-t border-border mt-3">
              <button
                onClick={handleViewOnMap}
                className="flex-1 py-2.5 text-[12px] font-medium text-brand hover:bg-brand-subtle transition-[background-color] cursor-pointer"
                aria-label={`${place.name} 지도에서 보기`}
              >
                지도에서 보기
              </button>
              <button
                onClick={() => setBookingOpen(true)}
                className="flex-1 py-2.5 text-[12px] font-medium text-brand hover:bg-brand-subtle transition-[background-color] cursor-pointer border-l border-border"
                aria-label={`${place.name} 예약하기`}
              >
                예약하기
              </button>
            </div>
          )}
        </div>
      </article>

      {bookingOpen && (
        <BookingForm
          place={place}
          isOpen={bookingOpen}
          onClose={() => setBookingOpen(false)}
          onSubmit={() => setBookingOpen(false)}
        />
      )}
    </>
  );
}
