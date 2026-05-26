// === Agent Types ===
export type AgentType = 'claude' | 'gpt' | 'gemini';

export type PlaceCategory = 'tourism' | 'shopping' | 'culture' | 'food';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export type TransportMode = 'walk' | 'subway' | 'bus' | 'taxi';

export type CongestionLevel = 'low' | 'medium' | 'high';

export interface Congestion {
  level: CongestionLevel;
  updatedAt?: string;
  source?: string;
}

// === Place ===
export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  address: string;
  lat: number;
  lng: number;
  hours: string;
  rating: number;
  summary: string;
  image?: string;
  congestion?: Congestion;
  naverMapUrl?: string;
  kakaoMapUrl?: string;
}

// === Itinerary ===
export interface ItineraryStop {
  order: number;
  placeId: string;
  placeName: string;
  arrivalTime: string;
  duration: number; // minutes
  transportToNext: TransportMode;
  travelTimeToNext: number; // minutes
  // SSE 어댑터로부터 직접 받은 필드 (places.json 매칭 안 되는 SSE-driven 코스용).
  lat?: number;
  lng?: number;
  imageUrl?: string;
  address?: string;
  category?: PlaceCategory;
  rating?: number;
  reason?: string;
}

export interface Itinerary {
  id: string;
  title: string;
  date: string;
  stops: ItineraryStop[];
}

// === Booking ===
export interface Booking {
  id: string;
  placeId: string;
  placeName: string;
  date: string;
  time: string;
  partySize: number;
  status: BookingStatus;
  confirmationNumber: string;
  specialRequest?: string;
}

// === Calendar ===
export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  stops: ItineraryStop[];
  createdAt: string;
  source: 'agent';
}

// === Chat ===
export interface Message {
  id: string;
  role: 'user' | 'agent';
  agent?: AgentType;
  text: string;
  timestamp: string;
  places?: Place[];
  itinerary?: Itinerary;
  itineraries?: Itinerary[]; // 복수 코스 추천. 있으면 itinerary 대신 이걸 렌더.
  booking?: Booking;
  // SSE 통합용 (apiChatStore에서 어댑터로 채움). 레거시 mock 메시지에선 undefined.
  threadId?: string;
  messageId?: string | number;
  blocks?: import('./api').Block[];
  // 사용자 첨부 이미지 URL (BE 가 query 텍스트에서 regex 로 파싱하지만 UI 는 thumb 으로 표시).
  attachedImageUrl?: string;
}

// === Agent Response ===
export interface AgentResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  sessionId: string;
}

// === Map ===
export interface RoutePoint {
  lat: number;
  lng: number;
  order: number;
  transport: TransportMode;
}

export interface PlaceMarkerData {
  place: Place;
  isSelected: boolean;
}

// === Bookmarks ===
export interface MessageSnapshot {
  role: 'assistant';
  createdAt: string;
  content: string;
  agent?: AgentType;
  places?: Place[];
  itinerary?: Itinerary | null;
}

// PinType은 BE bookmarks 모델과 동일 (api.ts 재export 회피 — 순환 import 방지).
export type BookmarkPinType = 'place' | 'event' | 'course' | 'analysis' | 'general';

export interface MessageBookmarkItem {
  bookmarkId: string;
  messageId: string;
  conversationId: string;
  pinType: BookmarkPinType;
  snapshot: MessageSnapshot;
  createdAt: string;
}
