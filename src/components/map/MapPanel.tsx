'use client';

import { useMapStore } from '@/stores/mapStore';
import { CATEGORY_CONFIG } from '@/lib/utils';
import PlaceCard from '@/components/chat/PlaceCard';
import EmptyState from '@/components/ui/EmptyState';

export default function MapPanel() {
  const { markers, selectedPlace, selectPlace } = useMapStore();

  return (
    <div className="h-full flex flex-col">
      {/* Mock Map Area */}
      <div className="flex-1 relative bg-[#1a1a2e] rounded-lg m-2 overflow-hidden">
        {/* Dark map grid */}
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

        {/* Markers or empty */}
        {markers.length > 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-64 h-64">
              {markers.map((place, i) => {
                const cat = CATEGORY_CONFIG[place.category];
                const angle = (i / markers.length) * Math.PI * 2 - Math.PI / 2;
                const radius = markers.length === 1 ? 0 : 80;
                const x = 50 + Math.cos(angle) * (radius / 2.56);
                const y = 50 + Math.sin(angle) * (radius / 2.56);
                const isSelected = selectedPlace?.id === place.id;
                return (
                  <button
                    key={place.id}
                    onClick={() => selectPlace(isSelected ? null : place)}
                    className="absolute flex flex-col items-center gap-1 cursor-pointer group"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: 'translate(-50%, -50%)',
                      animation: `scaleIn 0.4s ease-out ${i * 0.08}s both`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm transition-transform group-hover:scale-110"
                      style={{
                        backgroundColor: cat.color,
                        boxShadow: isSelected
                          ? `0 0 20px ${cat.color}80, 0 0 40px ${cat.color}40`
                          : `0 0 12px ${cat.color}40`,
                        transform: isSelected ? 'scale(1.15)' : undefined,
                      }}
                    >
                      {cat.emoji}
                    </div>
                    <span className="text-[10px] text-text-secondary bg-bg-primary/80 px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                      {place.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <EmptyState
            emoji="🗺️"
            title="지도 탐색"
            description="에이전트에게 장소를 추천받으면 여기에 표시돼요"
          />
        )}

        {/* Coordinates label */}
        <div className="absolute top-3 left-3 text-[10px] text-text-muted/40 font-mono">
          서울 · 37.5665°N 126.9780°E
        </div>
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
