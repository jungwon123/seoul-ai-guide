import { useState } from 'react';
import type { Place } from '@/types';
import GoogleMap from '@/components/map/GoogleMap';

// 공유(읽기 전용) 페이지용 경량 지도. 메시지의 장소/코스 마커를 표시하고
// 탭하면 강조만 한다(편집/네비게이션 없음). SharedPage 에서 lazy 로드.
export default function SharedMap({
  places,
  itineraryMode,
}: {
  places: Place[];
  itineraryMode: boolean;
}) {
  const [selected, setSelected] = useState<Place | null>(null);
  return (
    <div className="h-[320px] w-full rounded-xl overflow-hidden border border-border">
      <GoogleMap
        markers={places}
        selectedPlace={selected}
        onSelectPlace={setSelected}
        itineraryMode={itineraryMode}
      />
    </div>
  );
}
