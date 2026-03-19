'use client';

import { useMapStore } from '@/stores/mapStore';
import PlaceCard from '@/components/chat/PlaceCard';
import EmptyState from '@/components/ui/EmptyState';
import KakaoMap from './KakaoMap';

export default function MapPanel() {
  const { markers, selectedPlace, selectPlace } = useMapStore();

  return (
    <div className="h-full flex flex-col">
      {/* Real Kakao Map */}
      <div className="flex-1 relative m-2 overflow-hidden rounded-lg">
        {markers.length > 0 ? (
          <KakaoMap
            markers={markers}
            selectedPlace={selectedPlace}
            onSelectPlace={selectPlace}
          />
        ) : (
          <div className="h-full bg-[#1a1a2e] relative">
            {/* Empty map with grid background */}
            <div className="absolute inset-0 opacity-10">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }}
              />
            </div>
            <EmptyState
              emoji="🗺️"
              title="지도 탐색"
              description="에이전트에게 장소를 추천받으면 여기에 표시돼요"
            />
            <div className="absolute top-3 left-3 text-[10px] text-text-muted/40 font-mono">
              서울 · 37.5665°N 126.9780°E
            </div>
          </div>
        )}
      </div>

      {/* Selected place detail drawer */}
      {selectedPlace && (
        <div className="p-3 border-t border-border-default animate-slide-right">
          <PlaceCard place={selectedPlace} />
        </div>
      )}
    </div>
  );
}
