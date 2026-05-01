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
export type TextStreamBlock = { type: 'text_stream'; delta: string };

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
  start_date?: string;
  end_date?: string;
  category?: string;
  image_url?: string;
  homepage_url?: string;
};

export type EventsBlock = { type: 'events'; items: EventItem[]; total_count?: number };

export type CourseStop = {
  order: number;
  place_id: string;
  name: string;
  lat?: number;
  lng?: number;
  duration_minutes?: number;
  memo?: string;
};

export type CourseBlock = {
  type: 'course';
  title?: string;
  stops: CourseStop[];
  total_duration_minutes?: number;
};

export type MarkerItem = { place_id: string; lat: number; lng: number; label?: string };
export type MapMarkersBlock = { type: 'map_markers'; markers: MarkerItem[] };

export type MapRouteBlock = {
  type: 'map_route';
  polyline?: string;
  waypoints?: { lat: number; lng: number }[];
  distance_meters?: number;
  duration_seconds?: number;
};

export type ChartDataset = {
  label: string;
  score_satisfaction?: number;
  accessibility?: number;
  cleanliness?: number;
  value?: number;
  atmosphere?: number;
  expertise?: number;
};

export type ChartBlock = {
  type: 'chart';
  chart_type: 'radar';
  datasets: ChartDataset[];
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

export type ApiError = {
  error?: { code?: string; message?: string };
  detail?: string | { code?: string; message?: string };
};
