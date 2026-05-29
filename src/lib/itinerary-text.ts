import type { Itinerary, TransportMode } from '@/types';

const TRANSPORT_LABEL: Record<TransportMode, string> = {
  walk: '도보',
  subway: '지하철',
  bus: '버스',
  taxi: '택시',
};

// 코스(Itinerary)를 사람이 읽기 좋은 평문으로 직렬화 — 클립보드 복사/공유용.
// 예)
//   강남 반나절 코스
//   1. 10:00 스타필드 (체류 90분)
//      ↳ 지하철 12분
//   2. 11:42 봉은사 (체류 60분)
export function itineraryToText(itinerary: Itinerary): string {
  const lines: string[] = [itinerary.title];
  itinerary.stops.forEach((stop, i) => {
    const isLast = i >= itinerary.stops.length - 1;
    lines.push(`${i + 1}. ${stop.arrivalTime} ${stop.placeName} (체류 ${stop.duration}분)`);
    if (!isLast && stop.travelTimeToNext > 0) {
      const transport = TRANSPORT_LABEL[stop.transportToNext] ?? '이동';
      lines.push(`   ↳ ${transport} ${stop.travelTimeToNext}분`);
    }
  });
  return lines.join('\n');
}
