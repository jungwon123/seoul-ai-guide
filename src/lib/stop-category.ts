// 일정(course) 스톱의 카테고리 결정 — 모든 패널이 동일한 우선순위 사용.
//
// 우선순위:
//   1) stop.category      — BE 가 normalize 해서 보낸 값 (가장 신뢰)
//   2) mocks/places.json  — id 매칭되면 mock 의 category (레거시 mock 코스)
//   3) 'tourism'          — 안전한 기본값
//
// 이전 버그: chat ItineraryCard 는 (2)만, map 측은 (1)+(3)만 사용해서
// 같은 stop 이 두 패널에서 다른 카테고리로 보이는 불일치 발생.

import type { Place, PlaceCategory, ItineraryStop } from '@/types';
import placesData from '@/mocks/places.json';

const ALL_PLACES = placesData as Place[];

export function deriveStopCategory(stop: ItineraryStop): PlaceCategory {
  if (stop.category) return stop.category;
  const mock = ALL_PLACES.find((p) => p.id === stop.placeId);
  if (mock) return mock.category;
  return 'tourism';
}
