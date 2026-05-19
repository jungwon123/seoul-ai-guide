// 코스 응답 도착 시점에 3D 데이터/모듈을 백그라운드로 미리 받아두기.
// 사용자가 "3D 보기" 토글을 누르거나 "지도에서 보기" 버튼을 누르기 전에
// (1) Three.js 모듈 chunk 다운로드, (2) 자치구 빌딩 데이터(IndexedDB 캐시)
// 를 채워서 클릭 → 표시 사이의 대기 시간을 0 에 수렴시킨다.
//
// 모든 호출은 fire-and-forget. 실패 silent.

import type { ItineraryStop } from '@/types';

type LatLng = { lat: number; lng: number };

function takeCoords(stops: ItineraryStop[]): LatLng[] {
  return stops
    .map((s) => (s.lat != null && s.lng != null ? { lat: s.lat, lng: s.lng } : null))
    .filter((c): c is LatLng => c !== null);
}

let prefetchInFlight = false;

export function prefetchCourse3D(stops: ItineraryStop[]) {
  if (prefetchInFlight) return;
  const coords = takeCoords(stops);
  if (coords.length === 0) return;
  prefetchInFlight = true;

  // 1) 3D 모듈 chunk 백그라운드 다운로드.
  void import('@/components/map/ThreeMap');
  // 2) 자치구 빌딩 데이터 prefetch (IDB 캐시 적재).
  void (async () => {
    try {
      const { fetchBuildingsNearPoint } = await import('./overpass');
      await Promise.allSettled(
        coords.map((c) => fetchBuildingsNearPoint(c.lat, c.lng, 500)),
      );
    } catch {
      /* silent */
    } finally {
      prefetchInFlight = false;
    }
  })();
}
