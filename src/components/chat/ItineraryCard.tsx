import { useRef } from 'react';
import { Clock, Star, MapPin, Footprints, Train, Bus, Car } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { Itinerary, TransportMode, Place } from '@/types';
import { CATEGORY_CONFIG } from '@/lib/utils';
import { useChatStore } from '@/stores/chatStore';
import { useMapStore } from '@/stores/mapStore';
import placesData from '@/mocks/places.json';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

const ALL_PLACES = placesData as Place[];

const TRANSPORT_ICON: Record<TransportMode, typeof Footprints> = {
  walk: Footprints,
  subway: Train,
  bus: Bus,
  taxi: Car,
};

const TRANSPORT_LABEL: Record<TransportMode, string> = {
  walk: '도보',
  subway: '지하철',
  bus: '버스',
  taxi: '택시',
};

export default function ItineraryCard({ itinerary, hideActions = false }: { itinerary: Itinerary; hideActions?: boolean }) {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const isLoading = useChatStore((s) => s.isLoading);
  const startNavigation = useMapStore((s) => s.startNavigation);
  const stopsRef = useRef<HTMLDivElement>(null);

  // 일정 stop 리스트를 위에서부터 차례로 reveal — 정적 등장보다 시선 유도가 자연스럽다.
  useGSAP(() => {
    if (prefersReducedMotion()) return;
    const items = stopsRef.current?.children;
    if (!items || items.length === 0) return;
    gsap.from(Array.from(items), {
      y: 12,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.out',
      stagger: 0.08,
    });
  }, { scope: stopsRef });

  return (
    <div className="bg-bg-surface border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-bg-subtle/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Clock size={14} className="text-text-muted shrink-0" strokeWidth={1.5} />
          <h4 className="text-[14px] font-semibold text-text-primary tracking-[-0.02em] truncate">
            {itinerary.title}
          </h4>
        </div>
        <span className="text-[11px] text-text-muted tabular-nums shrink-0">
          {itinerary.stops.length}곳
        </span>
      </div>

      {/* Stops */}
      <div ref={stopsRef} className="px-3 py-3 space-y-2">
        {itinerary.stops.map((stop, i) => {
          const place = ALL_PLACES.find((p) => p.id === stop.placeId);
          const cat = place ? CATEGORY_CONFIG[place.category] : null;
          const isLast = i >= itinerary.stops.length - 1;
          const TransportIcon = !isLast ? TRANSPORT_ICON[stop.transportToNext] : null;

          return (
            <div key={stop.order}>
              {/* Stop card */}
              <div className="flex gap-3 p-2.5 rounded-xl border border-border/60 bg-bg-surface">
                {/* Thumbnail — 외부 컨테이너는 overflow 허용해 order 뱃지가 모서리 밖으로 살짝 튀어나옴 */}
                <div className="relative w-[60px] h-[60px] shrink-0">
                  {/* 이미지/폴백 래퍼 — 둥근 모서리 클립용 overflow-hidden은 안쪽에만 */}
                  <div
                    className="absolute inset-0 rounded-lg overflow-hidden flex items-center justify-center"
                    style={{
                      background: (stop.imageUrl || place?.image)
                        ? undefined
                        : cat
                          ? `${cat.color}14`
                          : 'var(--color-bg-subtle)',
                    }}
                  >
                    {(stop.imageUrl || place?.image) ? (
                      <img
                        src={stop.imageUrl || place?.image}
                        alt={stop.placeName}
                        width={60}
                        height={60}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span
                        className="text-[22px] font-semibold"
                        style={{ color: cat?.color ?? 'var(--color-text-muted)' }}
                      >
                        {cat?.label[0] ?? '·'}
                      </span>
                    )}
                  </div>
                  {/* Order badge — 외부 컨테이너에 absolute, 음수 offset으로 모서리 바깥으로 */}
                  <span
                    className="absolute -top-1.5 -left-1.5 w-[18px] h-[18px] rounded-full bg-text-primary text-white text-[10px] font-bold flex items-center justify-center shadow-sm border-2 border-bg-surface tabular-nums z-10"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span className="text-[11.5px] text-text-muted tabular-nums font-medium">
                      {stop.arrivalTime}
                    </span>
                    <span className="text-[10.5px] text-text-muted tabular-nums">
                      체류 {stop.duration}분
                    </span>
                  </div>
                  <div className="text-[13.5px] font-semibold text-text-primary truncate tracking-[-0.01em]">
                    {stop.placeName}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-[11px] text-text-muted min-w-0">
                    {place && place.rating > 0 && (
                      <>
                        <Star size={9} fill="currentColor" className="text-amber-500 shrink-0" aria-hidden="true" />
                        <span className="tabular-nums">{place.rating}</span>
                        <span>·</span>
                      </>
                    )}
                    {cat && (
                      <>
                        <MapPin size={9} className="shrink-0" aria-hidden="true" />
                        <span className="truncate">{cat.label}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Transport connector */}
              {TransportIcon && stop.travelTimeToNext > 0 && (
                <div className="flex items-center gap-1.5 pl-[30px] py-1 text-[11px] text-text-muted">
                  <span className="w-px h-3 bg-border shrink-0" aria-hidden="true" />
                  <TransportIcon size={11} strokeWidth={1.7} aria-hidden="true" />
                  <span>
                    {TRANSPORT_LABEL[stop.transportToNext]} {stop.travelTimeToNext}분
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions — shared 페이지 같은 read-only 컨텍스트에선 숨김 */}
      {!hideActions && (
        <div className="flex border-t border-border">
          <button
            onClick={() => startNavigation(itinerary)}
            className="flex-1 py-2.5 text-[12px] font-medium text-brand hover:bg-brand-subtle transition-colors cursor-pointer border-r border-border"
          >
            경로 보기
          </button>
          <button
            onClick={() => {
              if (isLoading) return;
              void sendMessage(`"${itinerary.title}" 코스를 내 캘린더에 추가해줘`);
            }}
            disabled={isLoading}
            className="flex-1 py-2.5 text-[12px] font-medium text-brand hover:bg-brand-subtle transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            일정 추가
          </button>
        </div>
      )}
    </div>
  );
}
