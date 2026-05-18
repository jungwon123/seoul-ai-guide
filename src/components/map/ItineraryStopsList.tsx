import { memo } from 'react';
import { Star, MapPin } from 'lucide-react';
import type { NavigationState } from '@/stores/mapStore';
import { useMapStore } from '@/stores/mapStore';
import { CATEGORY_CONFIG } from '@/lib/utils';
import { deriveStopCategory } from '@/lib/stop-category';

type Section = '아침' | '오후' | '저녁';
const SECTION_ORDER: Section[] = ['아침', '오후', '저녁'];

function timeOfDayLabel(arrivalTime: string): Section {
  const hour = parseInt(arrivalTime.split(':')[0], 10);
  if (hour < 12) return '아침';
  if (hour < 17) return '오후';
  return '저녁';
}

interface Props {
  navigation: NavigationState;
  /** Called after a stop is selected — useful for collapsing a bottom sheet. */
  onStopSelect?: () => void;
}

export default memo(function ItineraryStopsList({ navigation, onStopSelect }: Props) {
  const goToStop = useMapStore((s) => s.goToStop);
  const selectedPlace = useMapStore((s) => s.selectedPlace);
  const { itinerary, stopIndex } = navigation;

  const grouped = itinerary.stops.reduce<Record<Section, typeof itinerary.stops>>((acc, stop) => {
    const key = timeOfDayLabel(stop.arrivalTime);
    if (!acc[key]) acc[key] = [];
    acc[key].push(stop);
    return acc;
  }, {} as Record<Section, typeof itinerary.stops>);

  return (
    <div>
      {SECTION_ORDER.map((section) => {
        const stops = grouped[section];
        if (!stops || stops.length === 0) return null;
        return (
          <div key={section} className="px-5 pt-5 pb-2">
            <h3 className="text-[14px] font-semibold text-text-secondary mb-3">{section}</h3>
            <div className="space-y-3">
              {stops.map((stop, idxInSection) => {
                const cat = CATEGORY_CONFIG[deriveStopCategory(stop)];
                const isCurrent = itinerary.stops[stopIndex]?.placeId === stop.placeId;
                const isSelected = selectedPlace?.id === stop.placeId;
                const globalIdx = itinerary.stops.findIndex((s) => s.placeId === stop.placeId);
                const key = stop.placeId || `${section}-${idxInSection}`;

                return (
                  <button
                    key={key}
                    onClick={() => { goToStop(globalIdx); onStopSelect?.(); }}
                    aria-label={`${stop.placeName} 선택`}
                    className={`w-full flex gap-3 p-3 rounded-2xl border text-left transition-[border-color,background-color] cursor-pointer ${
                      isCurrent || isSelected
                        ? 'border-brand bg-brand-subtle'
                        : 'border-border bg-bg-surface hover:border-border-strong'
                    }`}
                  >
                    <div
                      className="w-[72px] h-[72px] rounded-xl bg-bg-subtle shrink-0 flex items-center justify-center overflow-hidden"
                      style={{ background: stop.imageUrl ? undefined : `${cat.color}14` }}
                    >
                      {stop.imageUrl ? (
                        <img
                          src={stop.imageUrl}
                          alt={`${stop.placeName} 사진`}
                          width={72}
                          height={72}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-[24px]" style={{ color: cat.color }}>
                          {cat.label[0]}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-text-muted tabular-nums mb-0.5">
                        {stop.arrivalTime}
                      </div>
                      <div className="text-[14px] font-semibold text-text-primary truncate">
                        {stop.placeName}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-text-muted">
                        {stop.rating && stop.rating > 0 && (
                          <>
                            <Star size={10} fill="currentColor" className="text-amber-500" aria-hidden="true" />
                            <span className="tabular-nums">{stop.rating}</span>
                            <span className="mx-0.5">·</span>
                          </>
                        )}
                        <MapPin size={10} aria-hidden="true" />
                        <span className="truncate">{cat.label}</span>
                      </div>
                      {(stop.reason ?? stop.address) && (
                        <p className="text-[12px] text-text-secondary mt-1.5 line-clamp-2 leading-[1.5]">
                          {stop.reason ?? stop.address}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
});
