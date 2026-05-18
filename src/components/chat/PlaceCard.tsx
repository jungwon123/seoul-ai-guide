import { useRef, useState } from 'react';
import { MapPin, Star, Bookmark } from 'lucide-react';
import gsap from 'gsap';
import type { Place, CongestionLevel } from '@/types';
import { CATEGORY_CONFIG } from '@/lib/utils';
import { useMapStore } from '@/stores/mapStore';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import BookingForm from '@/components/booking/BookingForm';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

const CONGESTION_BADGE: Record<CongestionLevel, { label: string; className: string }> = {
  low: { label: '한산', className: 'bg-green-100 text-green-700' },
  medium: { label: '보통', className: 'bg-yellow-100 text-yellow-700' },
  high: { label: '혼잡', className: 'bg-red-100 text-red-700' },
};

interface PlaceCardProps {
  place: Place;
  compact?: boolean;
}

export default function PlaceCard({ place, compact }: PlaceCardProps) {
  const selectPlace = useMapStore((s) => s.selectPlace);
  const toggleBookmark = useBookmarkStore((s) => s.toggle);
  const isBookmarked = useBookmarkStore((s) => s.bookmarkedIds.includes(place.id));
  const [bookingOpen, setBookingOpen] = useState(false);
  const bookmarkBtnRef = useRef<HTMLButtonElement>(null);
  const burstRef = useRef<HTMLSpanElement>(null);

  const cat = CATEGORY_CONFIG[place.category];

  const handleViewOnMap = () => {
    selectPlace(place);
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    const wasBookmarked = isBookmarked;
    toggleBookmark(place);

    if (prefersReducedMotion()) return;

    // 버튼 스케일 팝 — 항상 (추가/해제 모두 시각 피드백).
    if (bookmarkBtnRef.current) {
      gsap.fromTo(
        bookmarkBtnRef.current,
        { scale: 0.85 },
        { scale: 1, duration: 0.35, ease: 'back.out(2.2)' },
      );
    }

    // 파티클 버스트 — 추가 시에만.
    if (!wasBookmarked && burstRef.current) {
      const particles = burstRef.current.querySelectorAll<HTMLSpanElement>('.bm-particle');
      const count = particles.length;
      gsap.set(particles, { x: 0, y: 0, scale: 0.4, opacity: 1 });
      gsap.to(particles, {
        x: (i) => Math.cos((i / count) * Math.PI * 2 + Math.PI / 6) * 22,
        y: (i) => Math.sin((i / count) * Math.PI * 2 + Math.PI / 6) * 22,
        opacity: 0,
        scale: 1.1,
        duration: 0.55,
        ease: 'power2.out',
      });
    }
  };

  return (
    <>
      <article
        aria-label={`${place.name} - ${cat.label}`}
        onClick={handleViewOnMap}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleViewOnMap(); }}
        role="button"
        tabIndex={0}
        className="group bg-bg-surface border border-border rounded-2xl overflow-hidden transition-[border-color,box-shadow,transform] duration-200 hover:shadow-md hover:border-border-strong hover:-translate-y-[1px] cursor-pointer"
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
          <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
              {place.rating > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-bg-surface/90 text-text-primary backdrop-blur-sm tabular-nums">
                  <Star size={10} fill="currentColor" className="text-amber-500" aria-hidden="true" />
                  {place.rating}
                </span>
              )}
              <button
                ref={bookmarkBtnRef}
                onClick={handleBookmark}
                className="relative w-7 h-7 rounded-full flex items-center justify-center bg-bg-surface/90 backdrop-blur-sm hover:scale-110 cursor-pointer"
                aria-label={isBookmarked ? '북마크 해제' : '북마크'}
                aria-pressed={isBookmarked}
              >
                <Bookmark
                  size={13}
                  strokeWidth={isBookmarked ? 0 : 1.8}
                  fill={isBookmarked ? '#F59E0B' : 'none'}
                  className={isBookmarked ? '' : 'text-text-primary'}
                />
                <span ref={burstRef} className="pointer-events-none absolute inset-0" aria-hidden="true">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={i}
                      className="bm-particle absolute top-1/2 left-1/2 w-1 h-1 -ml-0.5 -mt-0.5 rounded-full bg-amber-400 opacity-0"
                    />
                  ))}
                </span>
              </button>
            </div>
            {place.congestion && (
              <div className="flex flex-col items-end gap-0.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${CONGESTION_BADGE[place.congestion.level].className}`}
                >
                  {CONGESTION_BADGE[place.congestion.level].label}
                </span>
                {place.congestion.updatedAt && (
                  <span className="text-[10px] text-gray-400">기준: {place.congestion.updatedAt}</span>
                )}
              </div>
            )}
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
          {(place.naverMapUrl || place.kakaoMapUrl) && (
            <div className="flex items-center gap-2 mt-2">
              {place.naverMapUrl && (
                <a
                  href={place.naverMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-green-600 hover:underline"
                >
                  네이버 지도
                </a>
              )}
              {place.kakaoMapUrl && (
                <a
                  href={place.kakaoMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-yellow-600 hover:underline"
                >
                  카카오맵
                </a>
              )}
            </div>
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
