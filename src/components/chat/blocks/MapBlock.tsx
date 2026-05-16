import { useMemo } from 'react';
import type { MarkerItem } from '@/types/api';
import type { Place } from '@/types';
import GoogleMap from '@/components/map/GoogleMap';

interface MapBlockProps {
  markers: MarkerItem[];
}

// SSE map_markers 블록 → 인라인 미니맵.
// MarkerItem({ place_id, lat, lng, label })을 GoogleMap이 요구하는 Place 스텁으로 변환.
function markerToPlace(m: MarkerItem): Place {
  return {
    id: m.place_id,
    name: m.label ?? m.place_id,
    category: 'tourism',
    address: '',
    lat: m.lat,
    lng: m.lng,
    hours: '',
    rating: 0,
    summary: '',
  };
}

export default function MapBlock({ markers }: MapBlockProps) {
  const places = useMemo(() => markers.map(markerToPlace), [markers]);

  if (places.length === 0) return null;

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-bg-surface">
      <div className="h-[260px] w-full">
        <GoogleMap markers={places} selectedPlace={null} onSelectPlace={() => {}} />
      </div>
      <div className="px-3 py-2 text-[11px] text-text-muted border-t border-border">
        지도에 표시된 장소 {places.length}곳
      </div>
    </div>
  );
}
