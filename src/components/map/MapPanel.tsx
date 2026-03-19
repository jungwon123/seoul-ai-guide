'use client';

import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import { useMapStore } from '@/stores/mapStore';
import PlaceCard from '@/components/chat/PlaceCard';
import EmptyState from '@/components/ui/EmptyState';

const KakaoMap = dynamic(() => import('./KakaoMap'), { ssr: false });

export default function MapPanel() {
  const markers = useMapStore((s) => s.markers);
  const selectedPlace = useMapStore((s) => s.selectedPlace);
  const selectPlace = useMapStore((s) => s.selectPlace);

  return (
    <div className="h-full flex flex-col bg-bg-base">
      <div className="flex-1 relative m-3 overflow-hidden rounded-2xl border border-border shadow-sm">
        {markers.length > 0 ? (
          <KakaoMap markers={markers} selectedPlace={selectedPlace} onSelectPlace={selectPlace} />
        ) : (
          <div className="h-full bg-bg-subtle">
            <EmptyState icon={MapPin} title="지도 탐색" description="에이전트에게 장소를 추천받으면 여기에 표시돼요" />
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
