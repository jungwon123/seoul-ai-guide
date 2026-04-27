import { memo, useCallback, useEffect, useState } from 'react';
import { X, Navigation, ChevronUp, ChevronDown, Footprints, Train, Bus, Car } from 'lucide-react';
import type { NavigationState } from '@/stores/mapStore';
import { CATEGORY_CONFIG } from '@/lib/utils';
import placesData from '@/mocks/places.json';
import type { Place, TransportMode } from '@/types';
import BottomSheet, { type SnapState } from '@/components/ui/BottomSheet';
import ItineraryStopsList from './ItineraryStopsList';

const allPlaces = placesData as Place[];

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

interface Props {
  navigation: NavigationState;
  onClose: () => void;
  /** When true (e.g. a map pin is tapped), auto-collapse the sheet to peek. */
  collapseOnSelect?: boolean;
}

function ItineraryBottomSheetInner({ navigation, onClose, collapseOnSelect }: Props) {
  const [snap, setSnap] = useState<SnapState>('peek');

  useEffect(() => {
    if (collapseOnSelect) setSnap('peek');
  }, [collapseOnSelect]);

  const { itinerary, stopIndex } = navigation;
  const currentStop = itinerary.stops[stopIndex];
  const currentPlace = currentStop ? allPlaces.find((p) => p.id === currentStop.placeId) : null;
  const isLast = stopIndex >= itinerary.stops.length - 1;

  const handleStopSelect = useCallback(() => setSnap('peek'), []);
  const toggleSnap = useCallback(
    () => setSnap((current) => (current === 'peek' ? 'full' : 'peek')),
    [],
  );

  if (!currentStop || !currentPlace) return null;

  const cat = CATEGORY_CONFIG[currentPlace.category];
  const TransportIcon = !isLast ? TRANSPORT_ICON[currentStop.transportToNext] : null;

  const isExpanded = snap !== 'peek';
  const peekCard = (
    <button
      onClick={toggleSnap}
      aria-label={isExpanded ? '일정 접기' : '일정 펼치기'}
      aria-expanded={isExpanded}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer"
    >
      {/* Thumbnail */}
      <div
        className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center overflow-hidden"
        style={{ background: currentPlace.image ? undefined : `${cat.color}14` }}
      >
        {currentPlace.image ? (
          <img src={currentPlace.image} alt={currentPlace.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-[20px] font-semibold" style={{ color: cat.color }}>
            {cat.label[0]}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] text-text-muted tabular-nums mb-0.5">
          <span className="tabular-nums font-medium">
            {stopIndex + 1} / {itinerary.stops.length}
          </span>
          <span>·</span>
          <span>{currentStop.arrivalTime}</span>
        </div>
        <div className="text-[14.5px] font-semibold text-text-primary truncate">
          {currentPlace.name}
        </div>
        {!isLast && TransportIcon && (
          <div className="flex items-center gap-1 mt-0.5 text-[11px] text-text-muted">
            <span>다음</span>
            <TransportIcon size={11} strokeWidth={1.7} aria-hidden="true" />
            <span>{TRANSPORT_LABEL[currentStop.transportToNext]} {currentStop.travelTimeToNext}분</span>
          </div>
        )}
      </div>

      {isExpanded
        ? <ChevronDown size={18} className="text-text-muted shrink-0" strokeWidth={1.8} aria-hidden="true" />
        : <ChevronUp size={18} className="text-text-muted shrink-0" strokeWidth={1.8} aria-hidden="true" />}
    </button>
  );

  return (
    <BottomSheet
      defaultSnap={snap}
      onSnapChange={setSnap}
      peekHeight={96}
      header={peekCard}
      className="md:hidden"
    >
      {/* Expanded header */}
      <div className="px-5 pt-4 pb-4 border-t border-border">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="text-[20px] font-bold text-text-primary tracking-[-0.02em] leading-tight">
            {itinerary.title}
          </h2>
          <button
            onClick={onClose}
            aria-label="경로 패널 접기"
            className="p-1.5 -mt-0.5 rounded-lg hover:bg-bg-subtle transition-[background-color] cursor-pointer shrink-0"
          >
            <X size={16} className="text-text-muted" aria-hidden="true" />
          </button>
        </div>
        <p className="text-[12.5px] text-text-secondary leading-[1.6] mb-3">
          최적 동선으로 구성된 {itinerary.stops.length}개 장소 코스입니다.
        </p>
        <div className="flex gap-2">
          <button
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-text-primary text-white rounded-lg text-[13px] font-semibold hover:bg-black transition-[background-color] cursor-pointer"
            aria-label="경로 열기"
          >
            <Navigation size={13} aria-hidden="true" />
            경로 열기
          </button>
        </div>
      </div>

      {/* Stops list */}
      <ItineraryStopsList navigation={navigation} onStopSelect={handleStopSelect} />
      <div className="h-8" />
    </BottomSheet>
  );
}

const ItineraryBottomSheet = memo(ItineraryBottomSheetInner);
export default ItineraryBottomSheet;
