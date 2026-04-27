

import { memo } from 'react';
import { X, Copy, Navigation } from 'lucide-react';
import { type NavigationState } from '@/stores/mapStore';
import ItineraryStopsList from './ItineraryStopsList';

interface Props {
  navigation: NavigationState;
  onClose: () => void;
}

function ItineraryDetailPanelInner({ navigation, onClose }: Props) {
  const { itinerary } = navigation;

  return (
    <aside
      aria-label="일정 상세"
      className="w-full md:w-[400px] h-full bg-bg-surface border-l border-border flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="text-[22px] font-bold text-text-primary tracking-[-0.02em] leading-tight">
            {itinerary.title}
          </h2>
          <button
            onClick={onClose}
            aria-label="경로 패널 접기"
            className="p-1.5 rounded-lg hover:bg-bg-subtle transition-[background-color] cursor-pointer shrink-0"
          >
            <X size={18} className="text-text-muted" aria-hidden="true" />
          </button>
        </div>
        <p className="text-[13px] text-text-secondary leading-[1.6] mb-4">
          최적 동선으로 구성된 {itinerary.stops.length}개 장소를 둘러보는 코스입니다.
        </p>
        <div className="flex gap-2">
          <button
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-text-primary text-white rounded-xl text-[13px] font-semibold hover:bg-black transition-[background-color] cursor-pointer"
            aria-label="경로 열기"
          >
            <Navigation size={14} aria-hidden="true" />
            경로 열기
          </button>
          <button
            className="flex items-center gap-1.5 px-4 py-2.5 bg-bg-subtle text-text-primary rounded-xl text-[13px] font-semibold hover:bg-border transition-[background-color] cursor-pointer"
            aria-label="복사"
          >
            <Copy size={14} aria-hidden="true" />
            복사
          </button>
        </div>
      </div>

      {/* Stops list */}
      <div className="flex-1 overflow-y-auto">
        <ItineraryStopsList navigation={navigation} />
      </div>
    </aside>
  );
}

const ItineraryDetailPanel = memo(ItineraryDetailPanelInner);
export default ItineraryDetailPanel;
