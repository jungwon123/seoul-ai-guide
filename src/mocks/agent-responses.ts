import type { Message, Place, Itinerary, Booking } from '@/types';
import placesData from './places.json';
import itineraryData from './itinerary.json';

const places = placesData as Place[];
const itineraries = itineraryData as Itinerary[];

const WELCOME_MESSAGES: Record<string, string> = {
  claude: '안녕하세요! Claude입니다. 서울의 숨겨진 매력을 찾아드릴게요. 어디를 가고 싶으세요?',
  gpt: '안녕하세요! GPT입니다. 서울 여행 계획을 도와드릴게요. 무엇이 궁금하세요?',
  gemini: '안녕하세요! Gemini입니다. 서울의 다양한 경험을 추천해드릴게요. 어떤 걸 찾고 계세요?',
};

export function getWelcomeMessage(agent: string): string {
  return WELCOME_MESSAGES[agent] || WELCOME_MESSAGES.claude;
}

export function getMockDiscoveryResponse(query: string): { text: string; places: Place[] } {
  const lower = query.toLowerCase();

  let filtered = places;
  if (lower.includes('맛집') || lower.includes('음식') || lower.includes('먹')) {
    filtered = places.filter((p) => p.category === 'food');
  } else if (lower.includes('쇼핑') || lower.includes('사')) {
    filtered = places.filter((p) => p.category === 'shopping');
  } else if (lower.includes('문화') || lower.includes('한옥') || lower.includes('전통')) {
    filtered = places.filter((p) => p.category === 'culture');
  } else if (lower.includes('관광') || lower.includes('명소') || lower.includes('야경')) {
    filtered = places.filter((p) => p.category === 'tourism');
  }

  if (filtered.length === 0) filtered = places.slice(0, 4);

  const names = filtered.map((p) => p.name).join(', ');
  return {
    text: `서울에서 추천드릴 곳을 찾았어요! ${names} 등이 있습니다. 카드를 확인해보세요.`,
    places: filtered,
  };
}

export function getMockPlanningResponse(): { text: string; itinerary: Itinerary } {
  const itin = itineraries[0];
  const stopNames = itin.stops.map((s) => s.placeName).join(' → ');
  return {
    text: `반나절 코스를 만들었어요! ${stopNames} 순서로 방문하시면 됩니다. 이동 시간까지 고려한 최적 동선이에요.`,
    itinerary: itin,
  };
}

export function getMockBookingResponse(placeId: string, placeName: string): { text: string; booking: Booking } {
  const confirmNum = `MOCK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  return {
    text: `${placeName} 예약이 완료되었습니다! 확인번호: ${confirmNum}`,
    booking: {
      id: `book-${Date.now()}`,
      placeId,
      placeName,
      date: '2024-03-15',
      time: '14:00',
      partySize: 2,
      status: 'confirmed',
      confirmationNumber: confirmNum,
    },
  };
}

export async function processMessage(
  text: string,
  agent: string
): Promise<Partial<Message>> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));

  const lower = text.toLowerCase();

  if (lower.includes('일정') || lower.includes('코스') || lower.includes('동선') || lower.includes('계획')) {
    const resp = getMockPlanningResponse();
    return { text: resp.text, itinerary: resp.itinerary };
  }

  if (lower.includes('예약')) {
    const resp = getMockBookingResponse('place-003', '광장시장');
    return { text: resp.text, booking: resp.booking };
  }

  // Default: discovery
  const resp = getMockDiscoveryResponse(text);
  return { text: resp.text, places: resp.places };
}
