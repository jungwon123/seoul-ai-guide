'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Box, Map } from 'lucide-react';
import { useMapStore } from '@/stores/mapStore';
import PlaceCard from '@/components/chat/PlaceCard';
import EmptyState from '@/components/ui/EmptyState';

const KakaoMap = dynamic(() => import('./KakaoMap'), { ssr: false });
const ThreeMap = dynamic(() => import('./ThreeMap'), { ssr: false });

export default function MapPanel() {
  const markers = useMapStore((s) => s.markers);
  const selectedPlace = useMapStore((s) => s.selectedPlace);
  const selectPlace = useMapStore((s) => s.selectPlace);
  const mapCenter = useMapStore((s) => s.mapCenter);

  const [is3D, setIs3D] = useState(false);
  const [loading3D, setLoading3D] = useState(false);
  const [buildingCount, setBuildingCount] = useState(0);
  const [error3D, setError3D] = useState<string | null>(null);

  const handleLoadingChange = useCallback((v: boolean) => setLoading3D(v), []);
  const handleBuildingCount = useCallback((n: number) => setBuildingCount(n), []);
  const handleError = useCallback((msg: string) => {
    setError3D(msg);
    setTimeout(() => setError3D(null), 4000);
  }, []);

  return (
    <div className="h-full flex flex-col bg-bg-base">
      <div className="flex-1 relative m-3 overflow-hidden rounded-2xl border border-border shadow-sm">
        {markers.length > 0 || is3D ? (
          <>
            {is3D ? (
              <ThreeMap
                markers={markers}
                selectedPlace={selectedPlace}
                center={mapCenter}
                zoom={16}
                onLoadingChange={handleLoadingChange}
                onBuildingCount={handleBuildingCount}
                onError={handleError}
              />
            ) : (
              <KakaoMap
                markers={markers}
                selectedPlace={selectedPlace}
                onSelectPlace={selectPlace}
              />
            )}

            {/* 2D/3D Toggle */}
            <button
              onClick={() => { setIs3D(!is3D); setError3D(null); }}
              className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold shadow-md transition-all duration-200 cursor-pointer"
              style={{
                background: is3D ? '#DC2626' : '#2563EB',
                color: 'white',
              }}
            >
              {is3D ? <Map size={14} /> : <Box size={14} />}
              {is3D ? '2D 보기' : '3D 보기'}
            </button>

            {/* 3D Loading */}
            {loading3D && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="flex items-center gap-3 bg-white/90 px-5 py-3 rounded-xl shadow-lg">
                  <div className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                  <span className="text-[13px] font-medium text-text-primary">건물 데이터 로딩 중...</span>
                </div>
              </div>
            )}

            {/* Building count */}
            {is3D && !loading3D && buildingCount > 0 && (
              <div className="absolute bottom-3 left-3 z-10 px-3 py-1.5 rounded-lg bg-black/60 text-white text-[11px] font-medium backdrop-blur-sm">
                {buildingCount.toLocaleString()}개 건물
              </div>
            )}

            {/* Error toast */}
            {error3D && (
              <div className="absolute top-14 right-3 z-10 px-3 py-2 rounded-lg bg-red-600 text-white text-[12px] font-medium shadow-lg animate-fade-up">
                {error3D}
              </div>
            )}
          </>
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
        <div className="px-3 pb-3 animate-fade-up">
          <PlaceCard place={selectedPlace} compact />
        </div>
      )}
    </div>
  );
}
