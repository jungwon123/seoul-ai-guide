import { useMemo } from 'react';
import type { MarkerItem } from '@/types/api';
import type { Place } from '@/types';
import GoogleMap from '@/components/map/GoogleMap';

interface MapBlockProps {
  markers: MarkerItem[];
  // 같은 메시지의 places 블록 결과 — place_id 매칭으로 진짜 카테고리/이미지 복원 용.
  places?: Place[];
}

// BE MarkerItem 은 { place_id, lat, lng, label } 만 들고 카테고리/이미지 없음.
// 같은 메시지 places 블록에서 place_id 매칭되면 그 Place 사용 — 우측 패널과 시각 일치.
// 매칭 안 되면 stub (모든 핀이 tourism 으로 보이던 이전 동작 — fallback).
function markerToPlace(m: MarkerItem, placesById: Map<string, Place>): Place {
  const matched = placesById.get(m.place_id);
  if (matched) {
    return { ...matched, lat: m.lat, lng: m.lng, name: m.label ?? matched.name };
  }
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

export default function MapBlock({ markers, places }: MapBlockProps) {
  const placesById = useMemo(() => {
    const map = new Map<string, Place>();
    for (const p of places ?? []) map.set(p.id, p);
    return map;
  }, [places]);
  const resolvedPlaces = useMemo(
    () => markers.map((m) => markerToPlace(m, placesById)),
    [markers, placesById],
  );

  if (resolvedPlaces.length === 0) return null;

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-bg-surface">
      <div className="h-[260px] w-full">
        <GoogleMap markers={resolvedPlaces} selectedPlace={null} onSelectPlace={() => {}} />
      </div>
      <div className="px-3 py-2 text-[11px] text-text-muted border-t border-border">
        지도에 표시된 장소 {resolvedPlaces.length}곳
      </div>
    </div>
  );
}
