'use client';

import { useMapStore } from '@/stores/mapStore';
import PlaceCard from '@/components/chat/PlaceCard';
import EmptyState from '@/components/ui/EmptyState';
import KakaoMap from './KakaoMap';

// SVG path for map pin icon
const MAP_PIN_PATH = 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z';

export default function MapPanel() {
  const { markers, selectedPlace, selectPlace } = useMapStore();

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 relative m-2 overflow-hidden rounded-xl">
        {markers.length > 0 ? (
          <KakaoMap
            markers={markers}
            selectedPlace={selectedPlace}
            onSelectPlace={selectPlace}
          />
        ) : (
          <div
            className="h-full relative"
            style={{
              background: 'radial-gradient(ellipse at 50% 50%, #0d1528 0%, #050810 100%)',
            }}
          >
            {/* Grid lines */}
            <div className="absolute inset-0 opacity-5">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(0,255,178,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,178,0.3) 1px, transparent 1px)',
                  backgroundSize: '60px 60px',
                }}
              />
            </div>
            <EmptyState
              iconPath={MAP_PIN_PATH}
              title="지도 탐색"
              description="에이전트에게 장소를 추천받으면 여기에 표시돼요"
              color="#00FFB2"
            />
            <div
              className="absolute top-3 left-3 text-[10px] font-mono"
              style={{ color: 'var(--color-text-muted)' }}
            >
              서울 · 37.5665°N 126.9780°E
            </div>
          </div>
        )}
      </div>

      {selectedPlace && (
        <div className="p-3 border-t border-border-default animate-panel-in">
          <PlaceCard place={selectedPlace} />
        </div>
      )}
    </div>
  );
}
