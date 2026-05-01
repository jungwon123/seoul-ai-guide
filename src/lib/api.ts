// HTTP 클라이언트 — JWT 인증 인터셉터 + 표준 에러 처리.
// VITE_API_BASE 미설정 시 dev에선 동일 origin /api/v1 로 프록시.

import type {
  ApiError,
  BookmarkCreateRequest,
  BookmarkCreateResponse,
  BookmarkListResponse,
  ChatDetailResponse,
  ChatListResponse,
  FeedbackRequest,
  FeedbackResponse,
  MessageListResponse,
  PinType,
  ShareCreateRequest,
  ShareCreateResponse,
  SharedConversation,
  TokenResponse,
} from '@/types/api';

// ---------------------------------------------------------------------------
// Token 저장소 (localStorage)
// ---------------------------------------------------------------------------
// ⚠️ 보안 트레이드오프: localStorage는 XSS에 취약하다. 서드파티 스크립트(분석/광고/SDK)
//   하나만 컴프로마이즈돼도 토큰이 탈취 가능. 장기 목표는 BE에서 httpOnly + Secure +
//   SameSite=Lax 쿠키로 발급받는 것. (BE 협의 필요)
const TOKEN_KEY = 'auth.token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode */
  }
}

// ---------------------------------------------------------------------------
// Base URL — 빈 문자열이면 same-origin (Vite proxy 사용)
// ---------------------------------------------------------------------------
function getApiBase(): string {
  const base = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';
  return base.replace(/\/$/, '');
}

export function buildUrl(path: string, params?: Record<string, string | number | undefined | null>): string {
  const base = getApiBase();
  const u = `${base}${path}`;
  if (!params) return u;
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    search.append(k, String(v));
  }
  const q = search.toString();
  return q ? `${u}?${q}` : u;
}

// ---------------------------------------------------------------------------
// 401 콜백 (인증 만료 시 외부에서 로그아웃 처리)
// ---------------------------------------------------------------------------
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;
export function setOnUnauthorized(fn: UnauthorizedHandler | null): void {
  onUnauthorized = fn;
}

// ---------------------------------------------------------------------------
// 표준 에러 (HTTP status + 메시지)
// ---------------------------------------------------------------------------
export class ApiHttpError extends Error {
  constructor(
    public status: number,
    public code: string | undefined,
    message: string,
    public retryable = false,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiHttpError';
  }
}

function extractErrorMessage(payload: ApiError | undefined, status: number): { code?: string; message: string } {
  if (!payload) return { message: `HTTP ${status}` };
  if (typeof payload.detail === 'string') return { message: payload.detail };
  if (payload.detail && typeof payload.detail === 'object') {
    return { code: payload.detail.code, message: payload.detail.message ?? `HTTP ${status}` };
  }
  if (payload.error) return { code: payload.error.code, message: payload.error.message ?? `HTTP ${status}` };
  return { message: `HTTP ${status}` };
}

// ---------------------------------------------------------------------------
// fetch 래퍼
// ---------------------------------------------------------------------------
const DEFAULT_TIMEOUT_MS = 30_000;

type RequestOptions = RequestInit & { auth?: boolean; timeoutMs?: number };

function makeTimeoutSignal(ms: number): AbortSignal {
  // AbortSignal.timeout (Safari 16+/Chrome 103+) 폴백.
  const tm = (AbortSignal as unknown as { timeout?: (ms: number) => AbortSignal }).timeout;
  if (typeof tm === 'function') return tm(ms);
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(new DOMException('Timeout', 'TimeoutError')), ms);
  return ctrl.signal;
}

function combineSignals(a: AbortSignal, b: AbortSignal): { signal: AbortSignal; cleanup: () => void } {
  // 둘 중 하나라도 abort되면 전파. AbortSignal.any가 있으면 사용.
  const any = (AbortSignal as unknown as { any?: (s: AbortSignal[]) => AbortSignal }).any;
  if (typeof any === 'function') return { signal: any([a, b]), cleanup: () => {} };
  const ctrl = new AbortController();
  const propagate = (s: AbortSignal) => () => ctrl.abort(s.reason);
  const onA = propagate(a);
  const onB = propagate(b);
  if (a.aborted) ctrl.abort(a.reason);
  else a.addEventListener('abort', onA, { once: true });
  if (b.aborted) ctrl.abort(b.reason);
  else b.addEventListener('abort', onB, { once: true });
  // fetch가 정상 완료되면 cleanup으로 listener 떼고 ctrl도 풀어줌.
  return {
    signal: ctrl.signal,
    cleanup: () => {
      a.removeEventListener('abort', onA);
      b.removeEventListener('abort', onB);
    },
  };
}

function isStreamLikeBody(body: BodyInit | null | undefined): boolean {
  if (body == null) return false;
  if (typeof FormData !== 'undefined' && body instanceof FormData) return true;
  if (typeof Blob !== 'undefined' && body instanceof Blob) return true;
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) return true;
  if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) return true;
  return false;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { auth = true, headers, timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = opts;

  const finalHeaders = new Headers(headers as HeadersInit | undefined);
  // FormData/Blob/URLSearchParams 등은 브라우저가 boundary 포함한 정확한 Content-Type을
  // 자동 설정한다. 임의로 application/json을 강제하면 멀티파트 업로드가 깨짐.
  if (rest.body && !finalHeaders.has('Content-Type') && !isStreamLikeBody(rest.body as BodyInit)) {
    finalHeaders.set('Content-Type', 'application/json');
  }
  if (auth) {
    const token = getToken();
    if (token) finalHeaders.set('Authorization', `Bearer ${token}`);
  }

  const timeoutSignal = makeTimeoutSignal(timeoutMs);
  const combined = signal ? combineSignals(signal, timeoutSignal) : null;
  const finalSignal = combined ? combined.signal : timeoutSignal;

  const url = path.startsWith('http') ? path : `${getApiBase()}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { ...rest, headers: finalHeaders, signal: finalSignal });
  } finally {
    combined?.cleanup();
  }

  if (res.status === 401 && auth && onUnauthorized) {
    onUnauthorized();
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const contentType = res.headers.get('Content-Type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await res.json().catch(() => undefined) : undefined;

  if (!res.ok) {
    const { code, message } = extractErrorMessage(payload as ApiError | undefined, res.status);
    throw new ApiHttpError(res.status, code, message, res.status >= 500, payload);
  }

  return payload as T;
}

// ---------------------------------------------------------------------------
// API 모듈별 헬퍼
// ---------------------------------------------------------------------------
export const authApi = {
  signup: (body: { email: string; password: string; nickname?: string }) =>
    request<TokenResponse>('/api/v1/auth/signup', { method: 'POST', body: JSON.stringify(body), auth: false }),
  login: (body: { email: string; password: string }) =>
    request<TokenResponse>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(body), auth: false }),
  // ⚠️ BE 미구현 (`models/user.py`에 GoogleLoginRequest는 있으나 라우트 추가 대기 중).
  //   호출 시 404. BE 라우트 머지 후 활성화.
  google: (body: { id_token: string }) =>
    request<TokenResponse>('/api/v1/auth/google', { method: 'POST', body: JSON.stringify(body), auth: false }),
};

export const usersApi = {
  // BE 응답: { user_id: int, email, nickname, auth_provider }. updated_at은 미반환.
  updateNickname: (nickname: string) =>
    request<{ user_id: number; email: string; nickname: string | null; auth_provider: string }>(
      '/api/v1/users/me',
      { method: 'PATCH', body: JSON.stringify({ nickname }) },
    ),
  changePassword: (old_password: string, new_password: string) =>
    request<{ message: string }>('/api/v1/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ old_password, new_password }),
    }),
};

// Google Calendar OAuth 연동 — JWT 인증된 사용자에게 동의 URL 발급.
// FE는 받은 auth_url로 window.location 리다이렉트하면 됨.
// 콜백(/api/v1/auth/google/calendar/callback)은 BE가 직접 처리.
export const googleCalendarApi = {
  getAuthUrl: () => request<{ auth_url: string }>('/api/v1/auth/google/calendar'),
};

// ⚠️ BE 미구현 — 북마크 모듈 자체가 backend/src/api/에 없음.
//   호출 시 모두 404. BE 구현 전엔 useApiBookmarkStore 활성화 금지.
export const bookmarksApi = {
  create: (body: BookmarkCreateRequest) =>
    request<BookmarkCreateResponse>('/api/v1/users/me/bookmarks', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  list: (params?: { thread_id?: string; pin_type?: PinType; cursor?: string; limit?: number }) =>
    request<BookmarkListResponse>(buildUrl('/api/v1/users/me/bookmarks', params)),
  delete: (bookmark_id: string) =>
    request<void>(`/api/v1/users/me/bookmarks/${encodeURIComponent(bookmark_id)}`, { method: 'DELETE' }),
};

export const chatsApi = {
  list: (params?: { cursor?: string; limit?: number }) =>
    request<ChatListResponse>(buildUrl('/api/v1/chats', params)),
  detail: (thread_id: string) =>
    request<ChatDetailResponse>(`/api/v1/chats/${encodeURIComponent(thread_id)}`),
  messages: (thread_id: string, params?: { cursor?: string; limit?: number }) =>
    request<MessageListResponse>(buildUrl(`/api/v1/chats/${encodeURIComponent(thread_id)}/messages`, params)),
  rename: (thread_id: string, title: string) =>
    request<{ thread_id: string; title: string; updated_at: string }>(
      `/api/v1/chats/${encodeURIComponent(thread_id)}`,
      { method: 'PATCH', body: JSON.stringify({ title }) },
    ),
  delete: (thread_id: string) =>
    request<void>(`/api/v1/chats/${encodeURIComponent(thread_id)}`, { method: 'DELETE' }),
  share: (thread_id: string, body: ShareCreateRequest) =>
    request<ShareCreateResponse>(`/api/v1/chats/${encodeURIComponent(thread_id)}/share`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  revokeShare: (thread_id: string) =>
    request<void>(`/api/v1/chats/${encodeURIComponent(thread_id)}/share`, { method: 'DELETE' }),
};

export const sharedApi = {
  get: (token: string) => request<SharedConversation>(`/shared/${encodeURIComponent(token)}`, { auth: false }),
};

// ⚠️ BE 미구현 — feedback 모듈 자체가 backend/src/api/에 없음. 호출 시 404.
export const feedbackApi = {
  create: (body: FeedbackRequest) =>
    request<FeedbackResponse>('/api/v1/feedback', { method: 'POST', body: JSON.stringify(body) }),
};

// BE의 health는 /health (no /api/v1 prefix). main.py:102 참조.
export const healthApi = {
  check: () => request<{ status: string; database?: string; opensearch?: string }>('/health', { auth: false }),
};
