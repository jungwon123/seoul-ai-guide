// MSW REST + SSE 핸들러 — BE dev 브랜치 스펙(API_SPEC.md 기준) 모방.
// 인메모리 상태(reload 시 리셋). 정합성은 src/types/api.ts 와 일치.

import { http, HttpResponse, delay } from 'msw';
import { v4 as uuid } from 'uuid';
import type {
  BookmarkCreateRequest,
  BookmarkListResponse,
  ChatListResponse,
  ChatDetailResponse,
  FeedbackRequest,
  MessageListResponse,
  PinType,
  ShareCreateRequest,
  SharedConversation,
} from '@/types/api';

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------
type ChatRow = {
  thread_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};
type MessageRow = {
  message_id: number;
  thread_id: string;
  role: 'user' | 'assistant';
  blocks: unknown[];
  created_at: string;
};
type BookmarkRow = {
  bookmark_id: number; // BE는 BIGSERIAL int
  thread_id: string;
  thread_title: string | null;
  message_id: number; // BE는 int
  pin_type: PinType;
  preview_text: string | null;
  created_at: string;
};

const chats = new Map<string, ChatRow>();
const messages: MessageRow[] = [];
const bookmarks: BookmarkRow[] = [];
const shares = new Map<string, { thread_id: string; created_at: string }>();
let messageSeq = 1;
let bookmarkSeq = 1;

const MOCK_USER = { user_id: 1, email: 'demo@seoul.app', nickname: 'demo', auth_provider: 'email' };
const MOCK_TOKEN = 'mock.jwt.token';

function nowIso(): string {
  return new Date().toISOString();
}

function ensureChat(thread_id: string): ChatRow {
  let row = chats.get(thread_id);
  if (!row) {
    row = { thread_id, title: null, created_at: nowIso(), updated_at: nowIso() };
    chats.set(thread_id, row);
  }
  return row;
}

// 데모용 시드 — 화면이 비어있지 않게.
(function seed() {
  const tid = `thread-${uuid()}`;
  ensureChat(tid).title = '광장시장 추천 받았던 대화';
  messages.push({
    message_id: messageSeq++,
    thread_id: tid,
    role: 'user',
    blocks: [{ type: 'text', content: '광장시장 어때?' }],
    created_at: nowIso(),
  });
  messages.push({
    message_id: messageSeq++,
    thread_id: tid,
    role: 'assistant',
    blocks: [
      { type: 'text', content: '광장시장은 빈대떡이 유명해요!' },
    ],
    created_at: nowIso(),
  });
})();

// ---------------------------------------------------------------------------
// REST handlers
// ---------------------------------------------------------------------------
export const restHandlers = [
  http.get('/health', () =>
    HttpResponse.json({ status: 'ok', database: 'mock', opensearch: 'mock' }),
  ),

  // --- Auth ---
  http.post('/api/v1/auth/signup', async () => {
    await delay(300);
    return HttpResponse.json(
      { access_token: MOCK_TOKEN, token_type: 'Bearer', ...MOCK_USER },
      { status: 201 },
    );
  }),
  http.post('/api/v1/auth/login', async () => {
    await delay(300);
    return HttpResponse.json({ access_token: MOCK_TOKEN, token_type: 'Bearer', ...MOCK_USER });
  }),
  http.get('/api/v1/auth/google/calendar', async () =>
    HttpResponse.json({ auth_url: `${window.location.origin}/calendar/connected?mock=1` }),
  ),

  // --- Users ---
  http.patch('/api/v1/users/me', async ({ request }) => {
    const body = (await request.json()) as { nickname: string };
    MOCK_USER.nickname = body.nickname;
    return HttpResponse.json({ ...MOCK_USER });
  }),
  http.patch('/api/v1/users/me/password', async () => {
    await delay(300);
    return HttpResponse.json({ message: 'Password updated' });
  }),

  // --- Chats ---
  http.get('/api/v1/chats', () => {
    const items = [...chats.values()]
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map((c) => ({
        thread_id: c.thread_id,
        title: c.title,
        last_message: null,
        updated_at: c.updated_at,
      }));
    return HttpResponse.json<ChatListResponse>({ items, next_cursor: null });
  }),
  http.get('/api/v1/chats/:thread_id', ({ params }) => {
    const row = chats.get(String(params.thread_id));
    if (!row) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json<ChatDetailResponse>(row);
  }),
  http.get('/api/v1/chats/:thread_id/messages', ({ params }) => {
    const tid = String(params.thread_id);
    const items = messages.filter((m) => m.thread_id === tid).map((m) => ({
      message_id: m.message_id,
      role: m.role,
      blocks: m.blocks as never,
      created_at: m.created_at,
    }));
    return HttpResponse.json<MessageListResponse>({ items, next_cursor: null });
  }),
  http.patch('/api/v1/chats/:thread_id', async ({ params, request }) => {
    const tid = String(params.thread_id);
    const body = (await request.json()) as { title: string };
    const row = ensureChat(tid);
    row.title = body.title;
    row.updated_at = nowIso();
    return HttpResponse.json({ thread_id: tid, title: body.title, updated_at: row.updated_at });
  }),
  http.delete('/api/v1/chats/:thread_id', ({ params }) => {
    const tid = String(params.thread_id);
    chats.delete(tid);
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].thread_id === tid) messages.splice(i, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Share ---
  http.post('/api/v1/chats/:thread_id/share', async ({ params }) => {
    const tid = String(params.thread_id);
    const _body = (await ((): Promise<ShareCreateRequest> => Promise.resolve({} as ShareCreateRequest))());
    void _body;
    const token = uuid().replace(/-/g, '').slice(0, 24);
    shares.set(token, { thread_id: tid, created_at: nowIso() });
    return HttpResponse.json(
      {
        share_token: token,
        share_url: `${window.location.origin}/shared/${token}`,
        expires_at: null,
      },
      { status: 201 },
    );
  }),
  http.delete('/api/v1/chats/:thread_id/share', ({ params }) => {
    const tid = String(params.thread_id);
    for (const [k, v] of shares) if (v.thread_id === tid) shares.delete(k);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get('/shared/:token', ({ params }) => {
    const tok = String(params.token);
    const meta = shares.get(tok);
    if (!meta) return new HttpResponse(null, { status: 404 });
    const chat = chats.get(meta.thread_id);
    const msgs = messages
      .filter((m) => m.thread_id === meta.thread_id)
      .map((m) => ({ role: m.role, blocks: m.blocks as never, created_at: m.created_at }));
    return HttpResponse.json<SharedConversation>({
      thread_title: chat?.title ?? null,
      messages: msgs,
    });
  }),

  // --- Bookmarks (BE 미구현이지만 FE 검수용 mock 제공) ---
  http.get('/api/v1/users/me/bookmarks', () =>
    HttpResponse.json<BookmarkListResponse>({ items: bookmarks, next_cursor: null }),
  ),
  http.post('/api/v1/users/me/bookmarks', async ({ request }) => {
    const body = (await request.json()) as BookmarkCreateRequest;
    const row: BookmarkRow = {
      bookmark_id: bookmarkSeq++,
      thread_id: body.thread_id,
      thread_title: chats.get(body.thread_id)?.title ?? null,
      message_id: Number(body.message_id) || 0,
      pin_type: body.pin_type,
      preview_text: body.preview_text ?? null,
      created_at: nowIso(),
    };
    bookmarks.unshift(row);
    return HttpResponse.json(
      {
        bookmark_id: row.bookmark_id,
        thread_id: row.thread_id,
        message_id: row.message_id,
        pin_type: row.pin_type,
        preview_text: row.preview_text,
        created_at: row.created_at,
      },
      { status: 201 },
    );
  }),
  http.delete('/api/v1/users/me/bookmarks/:id', ({ params }) => {
    const id = Number(params.id);
    const idx = bookmarks.findIndex((b) => b.bookmark_id === id);
    if (idx >= 0) bookmarks.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Feedback (BE 미구현 mock) ---
  http.post('/api/v1/feedback', async ({ request }) => {
    const body = (await request.json()) as FeedbackRequest;
    return HttpResponse.json(
      { feedback_id: uuid(), rating: body.rating, created_at: nowIso() },
      { status: 201 },
    );
  }),
];

// ---------------------------------------------------------------------------
// SSE handler — /api/v1/chat/stream
// ---------------------------------------------------------------------------
function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function pickIntent(query: string): 'GENERAL' | 'PLACE_SEARCH' | 'COURSE_PLAN' | 'CALENDAR' | 'EVENT' | 'ANALYSIS' | 'DETAIL_INQUIRY' {
  const q = query.toLowerCase();
  // DETAIL_INQUIRY: "거기/그 장소/여기 영업시간/주소/전화" 등 단건 상세 질문
  if (/(거기|여기|그\s*장소|그곳).*?(어때|영업|주소|전화|시간|얼마|메뉴|평점)/.test(q)) return 'DETAIL_INQUIRY';
  if (/영업시간|운영시간|상세|자세히/.test(q) && q.length < 40) return 'DETAIL_INQUIRY';
  if (/비교|분석|차트/.test(q)) return 'ANALYSIS';
  if (/행사|축제|이벤트/.test(q)) return 'EVENT';
  if (/캘린더|일정\s*등록|등록해/.test(q)) return 'CALENDAR';
  if (/일정|코스|동선|계획/.test(q)) return 'COURSE_PLAN';
  if (/카페|맛집|식당|쇼핑|장소|어디/.test(q)) return 'PLACE_SEARCH';
  return 'GENERAL';
}

function buildSseStream(query: string, threadId: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const intent = pickIntent(query);

  return new ReadableStream({
    async start(ctrl) {
      const send = (event: string, data: unknown) => ctrl.enqueue(enc.encode(sseFrame(event, data)));
      const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

      // 1) intent
      send('intent', { type: 'intent', intent, confidence: 0.92 });
      await wait(80);

      // 2) status
      send('status', { type: 'status', message: '응답 준비 중...', node: 'router' });
      await wait(120);

      // 3) text_stream — 토큰 단위 분할
      const replyMap: Record<typeof intent, string> = {
        GENERAL: '안녕하세요! 무엇을 도와드릴까요?',
        PLACE_SEARCH: '근처에서 추천드릴 곳을 찾아봤어요.',
        COURSE_PLAN: '반나절 코스를 만들었어요. 이동 시간을 고려한 동선이에요.',
        CALENDAR: 'Google Calendar에 일정을 등록했어요.',
        EVENT: '이번 달 서울 행사 3건을 찾았어요.',
        ANALYSIS: '두 곳을 6지표로 비교했어요. 가성비 차이가 큽니다.',
        DETAIL_INQUIRY: '광장시장은 종로구 창경궁로에 위치한 100년 전통 시장입니다. 빈대떡과 마약김밥이 유명하고 평점은 4.5예요.',
      };
      const reply = replyMap[intent];
      for (const ch of reply) {
        send('text_stream', { type: 'text_stream', delta: ch });
        await wait(20);
      }

      // 4) intent별 콘텐츠 블록
      if (intent === 'PLACE_SEARCH') {
        send('places', {
          type: 'places',
          items: [
            { place_id: 'p1', name: '광장시장', category: 'food', address: '종로구 창경궁로 88', district: '종로구', lat: 37.5703, lng: 126.9990, rating: 4.5, image_url: 'https://picsum.photos/seed/seoul-gwangjang-market/640/360' },
            { place_id: 'p2', name: '망원시장', category: 'food', address: '마포구 포은로8길', district: '마포구', lat: 37.5560, lng: 126.9056, rating: 4.3, image_url: 'https://picsum.photos/seed/seoul-mangwon-market/640/360' },
          ],
          total_count: 2,
        });
        await wait(80);
        send('map_markers', {
          type: 'map_markers',
          markers: [
            { place_id: 'p1', lat: 37.5703, lng: 126.9990, label: '광장시장' },
            { place_id: 'p2', lat: 37.5560, lng: 126.9056, label: '망원시장' },
          ],
        });
      } else if (intent === 'COURSE_PLAN') {
        send('course', {
          type: 'course',
          title: '종로 반나절 코스',
          stops: [
            { order: 1, place_id: 'p1', name: '광장시장', lat: 37.5703, lng: 126.9990, duration_minutes: 60, memo: '빈대떡', image_url: 'https://picsum.photos/seed/seoul-gwangjang-market/640/360' },
            { order: 2, place_id: 'p3', name: '경복궁', lat: 37.5796, lng: 126.9770, duration_minutes: 90, memo: '한복 체험', image_url: 'https://picsum.photos/seed/seoul-gyeongbokgung-palace/640/360' },
            { order: 3, place_id: 'p4', name: '북촌한옥마을', lat: 37.5826, lng: 126.9836, duration_minutes: 60, memo: '산책', image_url: 'https://picsum.photos/seed/seoul-bukchon-hanok/640/360' },
          ],
          total_duration_minutes: 210,
        });
        await wait(80);
        send('map_route', {
          type: 'map_route',
          waypoints: [
            { lat: 37.5703, lng: 126.9990 },
            { lat: 37.5796, lng: 126.9770 },
            { lat: 37.5826, lng: 126.9836 },
          ],
          distance_meters: 3200,
          duration_seconds: 1500,
        });
      } else if (intent === 'CALENDAR') {
        send('calendar', {
          type: 'calendar',
          title: '광장시장 방문',
          start_time: '2026-05-10T14:00:00+09:00',
          end_time: '2026-05-10T16:00:00+09:00',
          location: '서울특별시 종로구 창경궁로 88',
          calendar_link: 'https://calendar.google.com',
        });
      } else if (intent === 'EVENT') {
        send('events', {
          type: 'events',
          items: [
            { event_id: 'e1', title: '서울빛초롱축제', district: '중구', place_name: '청계천', start_date: '2026-05-10', end_date: '2026-05-25', category: 'festival', image_url: 'https://picsum.photos/seed/seoul-lantern-festival/320/240' },
            { event_id: 'e2', title: '한강 야시장', district: '용산구', place_name: '여의도 한강공원', start_date: '2026-05-04', end_date: '2026-05-04', category: 'market', image_url: 'https://picsum.photos/seed/seoul-han-market/320/240' },
            { event_id: 'e3', title: '서울국제도서전', district: '강남구', place_name: 'COEX', start_date: '2026-05-15', end_date: '2026-05-19', category: 'fair', image_url: 'https://picsum.photos/seed/seoul-bookfair/320/240' },
          ],
          total_count: 3,
        });
        await wait(80);
        send('references', {
          type: 'references',
          items: [{ source_type: 'official', snippet: '문화체육관광부 후원 공식 행사', url: 'https://example.com' }],
        });
      } else if (intent === 'DETAIL_INQUIRY') {
        send('place', {
          type: 'place',
          place_id: 'p1',
          name: '광장시장',
          category: 'food',
          address: '서울특별시 종로구 창경궁로 88',
          district: '종로구',
          lat: 37.5703,
          lng: 126.9990,
          rating: 4.5,
          image_url: 'https://picsum.photos/seed/seoul-gwangjang-market/640/360',
          summary: '100년 역사의 전통시장. 빈대떡, 마약김밥, 육회 등 길거리 음식의 성지.',
        });
      } else if (intent === 'ANALYSIS') {
        send('chart', {
          type: 'chart',
          chart_type: 'radar',
          datasets: [
            { label: '광장시장', score_satisfaction: 4.6, accessibility: 4.2, cleanliness: 3.5, value: 4.8, atmosphere: 4.7, expertise: 4.3 },
            { label: '망원시장', score_satisfaction: 4.4, accessibility: 4.0, cleanliness: 3.8, value: 4.5, atmosphere: 4.5, expertise: 4.0 },
          ],
        });
        await wait(80);
        send('analysis_sources', {
          type: 'analysis_sources',
          review_count: 1240,
          blog_count: 87,
          official_count: 5,
          sources: [{ source_type: 'review', snippet: '맛있고 친절해요', url: 'https://example.com/r/1' }],
        });
      }

      await wait(50);
      send('done', { type: 'done', status: 'done' });

      // 메시지 영속화 — 다음 messages 조회에 포함되도록.
      ensureChat(threadId);
      messages.push({
        message_id: messageSeq++,
        thread_id: threadId,
        role: 'user',
        blocks: [{ type: 'text', content: query }],
        created_at: nowIso(),
      });
      messages.push({
        message_id: messageSeq++,
        thread_id: threadId,
        role: 'assistant',
        blocks: [{ type: 'text', content: reply }],
        created_at: nowIso(),
      });

      ctrl.close();
    },
  });
}

export const sseHandler = http.get('/api/v1/chat/stream', ({ request }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('query') ?? '';
  const threadId = url.searchParams.get('thread_id') ?? `thread-${uuid()}`;
  return new HttpResponse(buildSseStream(query, threadId), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
});

export const handlers = [...restHandlers, sseHandler];
