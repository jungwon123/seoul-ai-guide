'use client';

import { MapPin } from 'lucide-react';
import { useMapStore } from '@/stores/mapStore';
import PlaceCard from '@/components/chat/PlaceCard';
import EmptyState from '@/components/ui/EmptyState';
import KakaoMap from './KakaoMap';

export default function MapPanel() {
  const { markers, selectedPlace, selectPlace } = useMapStore();

  return (
    <div className="h-full flex flex-col bg-bg-base">
      <div className="flex-1 relative m-2 overflow-hidden rounded-xl border border-border">
        {markers.length > 0 ? (
          <KakaoMap markers={markers} selectedPlace={selectedPlace} onSelectPlace={selectPlace} />
        ) : (
          <div className="h-full bg-bg-subtle">
            <EmptyState
              icon={MapPin}
              title="지도 탐색"
              description="에이전트에게 장소를 추천받으면 여기에 표시돼요"
            />
          </div>
        )}
      </div>

      {selectedPlace && (
        <div className="p-3 border-t border-border animate-fade-up">
          <PlaceCard place={selectedPlace} compact />
        </div>
      )}
    </div>
  );
}
