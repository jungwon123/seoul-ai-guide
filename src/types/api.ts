// Backend API contract — mirrors /Users/jwon/agt/apispec/API_SPEC.md
// BIGINT id 필드는 모두 string으로 직렬화됨 (JS Number 정밀도 한계 회피)

export type ApiUser = {
  user_id: string | number; // BIGINT (BE는 number, 직렬화 가이드는 string — 양쪽 수용)
  email: string;
  nickname: string | null;
  created_at?: string;
  updated_at?: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string; // "Bearer"
  user_id?: string | number;
  email?: string;
  nickname?: string | null;
  user?: ApiUser; // 일부 BE 응답은 user 객체로 감싸 전송
  is_new_user?: boolean; // /auth/google
};

// === Bookmarks ===
export type PinType = 'place' | 'event' | 'course' | 'analysis' | 'general';

export type BookmarkItem = {
  // BE는 BIGSERIAL int로 직렬화. 직렬화 가이드는 string이지만 양쪽 수용.
  bookmark_id: string | number;
  thread_id: string;
  thread_title?: string | null; // BE 응답에 미포함, 클라이언트가 채울 수 있음
  message_id: string | number;
  pin_type: PinType;
  preview_text: string | null;
  created_at: string;
};

export type BookmarkListResponse = {
  items: BookmarkItem[];
  next_cursor: string | null;
};

export type BookmarkCreateRequest = {
  thread_id: string;
  message_id: string | number;
  pin_type: PinType;
  preview_text?: string;
};

export type BookmarkCreateResponse = {
  bookmark_id: string | number;
  thread_id?: string;
  message_id?: string | number;
  pin_type: PinType;
  preview_text: string | null;
  created_at: string;
};

// === Place Bookmarks (BE PR #80 — Phase 2) ===
export type PlaceBookmarkCreateRequest = {
  place_id: string;
  name: string;
  category?: string | null;
  address?: string | null;
  district?: string | null;
  lat?: number | null;
  lng?: number | null;
  rating?: number | null;
  image_url?: string | null;
  summary?: string | null;
  source_thread_id?: string | null;
  source_message_id?: number | null;
};

export type PlaceBookmarkItem = {
  bookmark_id: number;
  place_id: string;
  name: string;
  category?: string | null;
  address?: string | null;
  district?: string | null;
  lat?: number | null;
  lng?: number | null;
  rating?: number | null;
  image_url?: string | null;
  summary?: string | null;
  source_thread_id?: string | null;
  source_message_id?: number | null;
  created_at: string;
};

export type PlaceBookmarkListResponse = {
  items: PlaceBookmarkItem[];
  next_cursor: string | null;
};

// === Calendar Events (BE Phase 1 — Google Calendar 직접 조회) ===
export type CalendarEventSource = 'localbiz' | 'user';

export type CalendarEventItem = {
  event_id: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
  calendar_link: string | null;
  source: CalendarEventSource;
};

export type CalendarEventsResponse = {
  items: CalendarEventItem[];
  next_page_token: string | null;
};

// === Image Upload ===
export type ImageUploadResponse = {
  image_url: string;
  expires_in_seconds: number;
};

// === Chats ===
export type ChatListItem = {
  thread_id: string;
  title: string | null;
  last_message?: string | null;
  updated_at: string;
};

export type ChatListResponse = {
  items: ChatListItem[];
  next_cursor: string | null;
};

export type MessageItem = {
  message_id: string | number;
  role: 'user' | 'assistant';
  blocks: Block[];
  created_at: string;
};

export type MessageListResponse = {
  items: MessageItem[];
  next_cursor: string | null;
};

export type ChatDetailResponse = {
  thread_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

// === Share ===
export type ShareCreateRequest = {
  message_range?: {
    from_message_id: number | null;
    to_message_id: number | null;
  } | null;
  expires_at?: string | null;
};

export type ShareCreateResponse = {
  share_token: string;
  share_url: string;
  expires_at: string | null;
};

export type SharedConversation = {
  thread_title: string | null;
  messages: { role: string; blocks: Block[]; created_at: string }[];
};

// === Feedback ===
export type FeedbackRequest = {
  thread_id: string;
  message_id: string | number;
  rating: 'up' | 'down';
  comment?: string | null;
};

export type FeedbackResponse = {
  feedback_id: string;
  rating: 'up' | 'down';
  created_at: string;
};

// === SSE blocks (16 종) — backend src/models/blocks.py 미러 ===
export type IntentBlock = { type: 'intent'; intent: string; confidence?: number };
export type StatusFrame = { type: 'status'; message: string; node?: string };
export type TextBlock = { type: 'text'; content: string };
// 라이브 SSE: { type, delta } 토큰. DB 저장본: { type, content } 전체 텍스트.
// FE 어댑터에서 둘 다 다뤄야 하므로 둘 다 optional.
export type TextStreamBlock = { type: 'text_stream'; delta?: string; content?: string };

// BE PlaceBlock.congestion — district 단위 area_proxy 혼잡도.
// docs/be-requests.md #3 참조. PR #70 머지 시 자동 활성화.
export type CongestionBlockInfo = {
  level: 'low' | 'medium' | 'high';
  updated_at: string;  // ISO date
  source?: string;     // "area_proxy" 등
};

export type PlaceBlockData = {
  type: 'place';
  place_id: string;
  name: string;
  category?: string;
  address?: string;
  district?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  image_url?: string;
  summary?: string;
  congestion?: CongestionBlockInfo;
  naver_map_url?: string;
  kakao_map_url?: string;
};

export type PlacesBlock = {
  type: 'places';
  items: Omit<PlaceBlockData, 'type'>[];
  total_count?: number;
};

export type EventItem = {
  event_id: string;
  title: string;
  district?: string;
  place_name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  start_date?: string;
  end_date?: string;
  category?: string;
  image_url?: string;
  homepage_url?: string;
  description?: string;
  // EVENT 응답 신규 필드(PR #194/#200). detail_url=카드 클릭 대상, source=출처 라벨.
  // 일부 신규 응답은 poster_url/date_start/date_end/price 명을 쓰므로 함께 수용(폴백).
  detail_url?: string;
  source?: string;
  poster_url?: string;
  date_start?: string;
  date_end?: string;
  price?: string;
};

export type EventsBlock = { type: 'events'; items: EventItem[]; total_count?: number };

export type CoursePlaceInfo = {
  place_id: string;
  name: string;
  category?: string;
  category_label?: string;
  address?: string;
  district?: string;
  location?: { lat: number; lng: number } | null;
  rating?: number;
  summary?: string;
  photo_url?: string;
  congestion?: CongestionBlockInfo;
};

export type CourseTransit = {
  mode: 'walk' | 'subway' | 'bus' | 'taxi';
  mode_ko?: string;
  distance_m?: number;
  duration_min?: number;
};

export type CourseStop = {
  order: number;
  arrival_time?: string;
  duration_min?: number;
  place: CoursePlaceInfo;
  transit_to_next?: CourseTransit | null;
  recommendation_reason?: string;
};

export type CourseBlock = {
  type: 'course';
  course_id?: string;
  title?: string;
  description?: string;
  total_distance_m?: number;
  total_duration_min?: number;
  total_stay_min?: number;
  total_transit_min?: number;
  stops: CourseStop[];
};

export type MarkerItem = { place_id: string; lat: number; lng: number; label?: string };
export type MapMarkersBlock = { type: 'map_markers'; markers: MarkerItem[] };

export type LatLng = { lat: number; lng: number };

export type MapRouteMarker = {
  order: number;
  position: LatLng;
  label?: string;
  category?: string;
};

export type MapRouteSegment = {
  from_order: number;
  to_order: number;
  mode: 'walk' | 'subway' | 'bus' | 'taxi';
  coordinates: [number, number][]; // GeoJSON [lng, lat] pairs
};

export type MapRoutePolyline = {
  type: string; // "straight" | "routed" 등
  segments: MapRouteSegment[];
};

export type MapRouteBlock = {
  type: 'map_route';
  course_id?: string;
  bounds?: { sw: LatLng; ne: LatLng };
  center?: LatLng;
  suggested_zoom?: number;
  markers: MapRouteMarker[];
  polyline: MapRoutePolyline;
};

// BE review_compare_node 가 보내는 실제 형태: places[].scores{6지표}.
// (불변식 #6 으로 key 고정 — satisfaction 포함 6개, 이름 변경 금지)
export type ChartPlaceScores = {
  satisfaction?: number;   // 종합 만족도 — 축 제외, 범례에 표기
  accessibility?: number;  // 접근성
  cleanliness?: number;    // 청결도
  value?: number;          // 가성비
  atmosphere?: number;     // 분위기
  expertise?: number;      // 전문성
};

export type ChartPlace = {
  name: string;
  scores: ChartPlaceScores;
};

export type ChartBlock = {
  type: 'chart';
  chart_type: 'radar';
  title?: string;
  places: ChartPlace[];
};

export type CalendarBlock = {
  type: 'calendar';
  title?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  calendar_link?: string;
};

export type ReferenceItem = {
  source_type: string;
  source_id?: string;
  snippet: string;
  url?: string;
};

export type ReferencesBlock = { type: 'references'; items: ReferenceItem[] };

export type AnalysisSourcesBlock = {
  type: 'analysis_sources';
  review_count?: number;
  blog_count?: number;
  official_count?: number;
  sources: ReferenceItem[];
};

export type DisambiguationCandidate = {
  place_id?: string;
  event_id?: string;
  name: string;
  address?: string;
  category?: string;
};

export type DisambiguationBlock = {
  type: 'disambiguation';
  message?: string;
  candidates: DisambiguationCandidate[];
};

export type DoneBlock = {
  type: 'done';
  status: 'done' | 'error' | 'cancelled';
  reason?: string;
  partial?: boolean;
  error_message?: string;
  // BE PR #81 — done 시점에 DB에 저장된 assistant message_id.
  // 북마크/피드백/공유 버튼이 새로고침 없이 즉시 사용 가능하도록 활용.
  message_id?: number;
};

export type ErrorBlock = {
  type: 'error';
  code?: string;
  message: string;
  recoverable?: boolean;
  retryable?: boolean;
};

export type DonePartialFrame = { type: 'done_partial'; completed_intent?: string };

export type Block =
  | IntentBlock
  | StatusFrame
  | TextBlock
  | TextStreamBlock
  | PlaceBlockData
  | PlacesBlock
  | EventsBlock
  | CourseBlock
  | MapMarkersBlock
  | MapRouteBlock
  | ChartBlock
  | CalendarBlock
  | ReferencesBlock
  | AnalysisSourcesBlock
  | DisambiguationBlock
  | DoneBlock
  | ErrorBlock
  | DonePartialFrame;

// SSE event 종류 (event 필드)
export type SseEventType =
  | 'intent'
  | 'status'
  | 'text_stream'
  | 'place'
  | 'places'
  | 'events'
  | 'course'
  | 'map_markers'
  | 'map_route'
  | 'chart'
  | 'calendar'
  | 'references'
  | 'analysis_sources'
  | 'disambiguation'
  | 'done'
  | 'done_partial'
  | 'error';

export type ApiErrorDetailItem = {
  type?: string;
  loc?: (string | number)[];
  msg?: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
};

export type ApiError = {
  error?: { code?: string; message?: string };
  // FastAPI/Pydantic: 422 응답은 detail이 배열 형태. 그 외 라우트는 string/object.
  detail?: string | { code?: string; message?: string } | ApiErrorDetailItem[];
};
