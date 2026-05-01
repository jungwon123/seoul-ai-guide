// === Agent Types ===
export type AgentType = 'claude' | 'gpt' | 'gemini';

export type PlaceCategory = 'tourism' | 'shopping' | 'culture' | 'food';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export type TransportMode = 'walk' | 'subway' | 'bus' | 'taxi';

export type CongestionLevel = 'low' | 'medium' | 'high';

export interface Congestion {
  level: CongestionLevel;
  updatedAt?: string;
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
  booking?: Booking;
  // SSE 통합용 (apiChatStore에서 어댑터로 채움). 레거시 mock 메시지에선 undefined.
  threadId?: string;
  messageId?: string | number;
  blocks?: import('./api').Block[];
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

export interface MessageBookmarkItem {
  bookmarkId: string;
  messageId: string;
  conversationId: string;
  snapshot: MessageSnapshot;
  createdAt: string;
}
