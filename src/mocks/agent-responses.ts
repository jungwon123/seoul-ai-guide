import type { Message, Place, Itinerary, Booking } from '@/types';
import type { Block } from '@/types/api';
import placesData from './places.json';
import itineraryData from './itinerary.json';

const places = placesData as Place[];
const itineraries = itineraryData as Itinerary[];

const WELCOME_MESSAGES: Record<string, string> = {
  claude: '안녕하세요! 서울의 숨겨진 매력을 찾아드릴게요. 어디를 가고 싶으세요?',
  gpt: '안녕하세요! 서울 여행 계획을 도와드릴게요. 무엇이 궁금하세요?',
  gemini: '안녕하세요! 서울의 다양한 경험을 추천해드릴게요. 어떤 걸 찾고 계세요?',
};

export function getWelcomeMessage(agent: string): string {
  return WELCOME_MESSAGES[agent] || WELCOME_MESSAGES.claude;
}

function matchPlaces(query: string): Place[] {
  const lower = query.toLowerCase();

  if (lower.includes('맛집') || lower.includes('음식') || lower.includes('먹')) {
    return places.filter((p) => p.category === 'food');
  }
  if (lower.includes('쇼핑') || lower.includes('사')) {
    return places.filter((p) => p.category === 'shopping');
  }
  if (lower.includes('문화') || lower.includes('한옥') || lower.includes('전통')) {
    return places.filter((p) => p.category === 'culture');
  }
  if (lower.includes('관광') || lower.includes('명소') || lower.includes('야경')) {
    return places.filter((p) => p.category === 'tourism');
  }
  return places.slice(0, 4);
}

/**
 * Simulated streaming - yields characters one by one
 */
export async function* streamResponse(
  text: string,
  query: string,
): AsyncGenerator<{
  text: string;
  done: boolean;
  places?: Place[];
  itinerary?: Itinerary;
  booking?: Booking;
  blocks?: Block[];
}> {
  // Simulate initial latency
  await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));

  const lower = query.toLowerCase();
  let fullText: string;
  let resultPlaces: Place[] | undefined;
  let resultItinerary: Itinerary | undefined;
  let resultBooking: Booking | undefined;
  let resultBlocks: Block[] | undefined;

  if (lower.includes('비교') || lower.includes('분석') || lower.includes('차트')) {
    fullText = '두 곳을 6개 지표로 비교해봤어요. 만족도와 분위기는 비슷하지만 가성비는 차이가 큽니다.';
    resultBlocks = [
      {
        type: 'chart',
        chart_type: 'radar',
        datasets: [
          { label: '광장시장', score_satisfaction: 4.6, accessibility: 4.2, cleanliness: 3.5, value: 4.8, atmosphere: 4.7, expertise: 4.3 },
          { label: '망원시장', score_satisfaction: 4.4, accessibility: 4.0, cleanliness: 3.8, value: 4.5, atmosphere: 4.5, expertise: 4.0 },
        ],
      },
      {
        type: 'analysis_sources',
        review_count: 1240,
        blog_count: 87,
        official_count: 5,
        sources: [
          { source_type: 'review', snippet: '전 정말 맛있고 사장님 친절해요', url: 'https://example.com/r/1' },
          { source_type: 'blog', snippet: '꼭 가봐야 할 서울 시장', url: 'https://example.com/b/2' },
        ],
      },
    ];
  } else if (lower.includes('행사') || lower.includes('축제') || lower.includes('이벤트')) {
    fullText = '이번 달 서울에서 열리는 주요 행사 3건을 찾았어요.';
    resultBlocks = [
      {
        type: 'events',
        items: [
          { event_id: 'ev-1', title: '서울빛초롱축제', district: '중구', place_name: '청계천', start_date: '2026-05-10', end_date: '2026-05-25', category: 'festival' },
          { event_id: 'ev-2', title: '한강 야시장', district: '용산구', place_name: '여의도 한강공원', start_date: '2026-05-04', end_date: '2026-05-04', category: 'market' },
          { event_id: 'ev-3', title: '서울국제도서전', district: '강남구', place_name: 'COEX', start_date: '2026-05-15', end_date: '2026-05-19', category: 'fair' },
        ],
        total_count: 3,
      },
      {
        type: 'references',
        items: [
          { source_type: 'official', snippet: '문화체육관광부 후원 공식 행사', url: 'https://example.com/official' },
        ],
      },
    ];
  } else if (lower.includes('캘린더') || lower.includes('일정 등록') || lower.includes('등록해')) {
    fullText = 'Google Calendar에 일정을 등록했어요.';
    resultBlocks = [
      {
        type: 'calendar',
        title: '광장시장 방문',
        start_time: '2026-05-10T14:00:00+09:00',
        end_time: '2026-05-10T16:00:00+09:00',
        location: '서울특별시 종로구 창경궁로 88',
        calendar_link: 'https://calendar.google.com',
      },
    ];
  } else if (lower.includes('일정') || lower.includes('코스') || lower.includes('동선') || lower.includes('계획')) {
    const itin = itineraries[0];
    const stopNames = itin.stops.map((s) => s.placeName).join(' → ');
    fullText = `반나절 코스를 만들었어요! ${stopNames} 순서로 방문하시면 됩니다. 이동 시간까지 고려한 최적 동선이에요.`;
    resultItinerary = itin;
  } else if (lower.includes('예약')) {
    const confirmNum = `MOCK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    fullText = `광장시장 예약이 완료되었습니다! 확인번호: ${confirmNum}`;
    resultBooking = {
      id: `book-${Date.now()}`,
      placeId: 'place-003',
      placeName: '광장시장',
      date: '2024-03-15',
      time: '14:00',
      partySize: 2,
      status: 'confirmed',
      confirmationNumber: confirmNum,
    };
  } else {
    const filtered = matchPlaces(query);
    const names = filtered.map((p) => p.name).join(', ');
    fullText = `서울에서 추천드릴 곳을 찾았어요! ${names} 등이 있습니다. 카드를 확인해보세요.`;
    resultPlaces = filtered;
  }

  // Stream characters with variable speed
  let accumulated = '';
  for (let i = 0; i < fullText.length; i++) {
    accumulated += fullText[i];
    const delay = fullText[i] === '.' || fullText[i] === '!' ? 80 : 15 + Math.random() * 25;
    await new Promise((r) => setTimeout(r, delay));
    yield { text: accumulated, done: false };
  }

  // Final yield with data
  yield {
    text: fullText,
    done: true,
    places: resultPlaces,
    itinerary: resultItinerary,
    booking: resultBooking,
    blocks: resultBlocks,
  };
}

/**
 * Non-streaming fallback (for backward compatibility)
 */
export async function processMessage(
  text: string,
  _agent: string,
): Promise<Partial<Message>> {
  await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));

  const lower = text.toLowerCase();

  if (lower.includes('일정') || lower.includes('코스') || lower.includes('동선') || lower.includes('계획')) {
    const itin = itineraries[0];
    const stopNames = itin.stops.map((s) => s.placeName).join(' → ');
    return {
      text: `반나절 코스를 만들었어요! ${stopNames} 순서로 방문하시면 됩니다.`,
      itinerary: itin,
    };
  }

  if (lower.includes('예약')) {
    const confirmNum = `MOCK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    return {
      text: `광장시장 예약이 완료되었습니다! 확인번호: ${confirmNum}`,
      booking: {
        id: `book-${Date.now()}`,
        placeId: 'place-003',
        placeName: '광장시장',
        date: '2024-03-15',
        time: '14:00',
        partySize: 2,
        status: 'confirmed',
        confirmationNumber: confirmNum,
      },
    };
  }

  const filtered = matchPlaces(text);
  const names = filtered.map((p) => p.name).join(', ');
  return {
    text: `서울에서 추천드릴 곳을 찾았어요! ${names} 등이 있습니다.`,
    places: filtered,
  };
}
