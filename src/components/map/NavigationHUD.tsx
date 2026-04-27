

import { memo } from 'react';
import { ChevronLeft, ChevronRight, X, Play, Pause, Navigation } from 'lucide-react';
import { useMapStore, type NavigationState } from '@/stores/mapStore';
import { TRANSPORT_LABELS } from '@/lib/utils';

function NavigationHUDInner({ navigation }: { navigation: NavigationState }) {
  const { itinerary, stopIndex, isPlaying } = navigation;
  const nextStop = useMapStore((s) => s.nextStop);
  const prevStop = useMapStore((s) => s.prevStop);
  const stopNavigation = useMapStore((s) => s.stopNavigation);
  const togglePlayPause = useMapStore((s) => s.togglePlayPause);

  const stops = itinerary.stops;
  const current = stops[stopIndex];
  const isFirst = stopIndex === 0;
  const isLast = stopIndex === stops.length - 1;
  const progress = ((stopIndex + 1) / stops.length) * 100;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
      {/* Progress bar */}
      <div className="h-1 bg-border mx-3">
        <div
          className="h-full bg-brand transition-all duration-700 ease-out rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* HUD panel */}
      <div className="mx-3 mb-3 mt-0 pointer-events-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-border overflow-hidden">
        {/* Top: title + close */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
          <div className="flex items-center gap-2 min-w-0">
            <Navigation size={14} className="text-brand shrink-0" />
            <span className="text-[13px] font-semibold text-text-primary truncate">
              {itinerary.title}
            </span>
          </div>
          <button
            onClick={stopNavigation}
            aria-label="경로 탐색 종료"
            className="p-1.5 rounded-lg hover:bg-bg-subtle transition-[background-color] cursor-pointer shrink-0"
          >
            <X size={16} className="text-text-muted" />
          </button>
        </div>

        {/* Current stop info */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-medium text-brand bg-brand/10 px-2 py-0.5 rounded-full">
              {stopIndex + 1}/{stops.length}
            </span>
            <span className="text-[11px] text-text-muted">{current.arrivalTime}</span>
            <span className="text-[11px] text-text-muted">· {current.duration}분 체류</span>
          </div>
          <h3 className="text-[16px] font-bold text-text-primary tracking-[-0.02em]">
            {current.placeName}
          </h3>
          {!isLast && current.travelTimeToNext > 0 && (
            <p className="text-[12px] text-text-muted mt-1">
              다음: {TRANSPORT_LABELS[current.transportToNext].icon}{' '}
              {TRANSPORT_LABELS[current.transportToNext].label} {current.travelTimeToNext}분
              → {stops[stopIndex + 1].placeName}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2 px-4 pb-3">
          <button
            onClick={prevStop}
            disabled={isFirst}
            aria-label="이전 경유지"
            className="p-2.5 rounded-xl bg-bg-subtle hover:bg-border transition-[background-color] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            onClick={togglePlayPause}
            aria-label={isPlaying ? '일시정지' : '자동 재생'}
            className="p-3 rounded-xl bg-brand text-white hover:bg-[#1558CC] transition-[background-color] cursor-pointer shadow-md"
          >
            {isPlaying ? <Pause size={20} aria-hidden="true" /> : <Play size={20} className="ml-0.5" aria-hidden="true" />}
          </button>
          <button
            onClick={nextStop}
            disabled={isLast}
            aria-label="다음 경유지"
            className="p-2.5 rounded-xl bg-bg-subtle hover:bg-border transition-[background-color] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

const NavigationHUD = memo(NavigationHUDInner);
export default NavigationHUD;
