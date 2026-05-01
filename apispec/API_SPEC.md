# API 명세서 v2 (SSE)

> Phase 1 · 총 38개 엔드포인트
> 도메인 구성: 사용자(8) · 채팅 REST(8) · 채팅 SSE(20) · 공통(2)

---

## BE 구현 현황 (agt-backend `dev` 기준, 2026-05-01 sync)

| 엔드포인트 | 상태 | 비고 |
|---|---|---|
| `GET /health` | ✅ | (FE는 `/api/v1/health` 아닌 `/health` 호출해야 함 — 패치 완료) |
| `POST /api/v1/auth/signup` | ✅ | TokenResponse flat 구조 |
| `POST /api/v1/auth/login` | ✅ | 동일 |
| `POST /api/v1/auth/google` | ❌ | `GoogleLoginRequest` 모델만 있고 라우트 미구현 (`auth.py` docstring "후속 PR 예정") |
| `GET /api/v1/auth/google/calendar` | ✅ | Google **Calendar OAuth 권한** (소셜 로그인 아님) |
| `GET /api/v1/auth/google/calendar/callback` | ✅ | OAuth 콜백 |
| `PATCH /api/v1/users/me` | ✅ | 응답에 `auth_provider` 포함 (FE 타입 정렬 완료) |
| `PATCH /api/v1/users/me/password` | ✅ | google 사용자는 400 |
| `GET /api/v1/chats` | ✅ | cursor 페이지네이션 |
| `GET /api/v1/chats/{id}` | ✅ | 메타데이터만 (메시지는 별도 API) |
| `GET /api/v1/chats/{id}/messages` | ✅ | append-only |
| `PATCH /api/v1/chats/{id}` | ✅ | title 수정 |
| `DELETE /api/v1/chats/{id}` | ✅ | 204 |
| `POST /api/v1/chats/{id}/share` | ✅ | share_token 발급 |
| `DELETE /api/v1/chats/{id}/share` | ✅ | revoke |
| `GET /shared/{token}` | ✅ | 인증 불필요 |
| `GET /api/v1/chat/stream` | 🟡 | 라우트 존재, 본체는 stub (현재 `done`만 즉시 전송, JWT 미검증, LangGraph 미연결) |
| `POST /api/v1/users/me/bookmarks` | ❌ | 북마크 모듈 BE에 없음 |
| `GET /api/v1/users/me/bookmarks` | ❌ | 동일 |
| `DELETE /api/v1/users/me/bookmarks/{id}` | ❌ | 동일 |
| `POST /api/v1/feedback` | ❌ | feedback 모듈 BE에 없음 |
| (그 외 SSE intent별 응답 패턴들) | 🟡 | sse.py가 stub 단계라 모든 intent가 즉시 done |

**범례**: ✅ 사용 가능 / 🟡 라우트만 / ❌ BE 자체 없음

---

## 📌 개요 (Conventions)

### Base URL
```
{API_BASE}/api/v1
```

### 인증
- 대부분의 엔드포인트는 JWT 토큰을 헤더로 요구
  ```
  Authorization: Bearer {access_token}
  ```
- 예외: `/auth/*`, `/shared/{share_token}`, `/health` 는 인증 불필요
- SSE 엔드포인트는 헤더 대신 query param `token` 으로도 인증 가능 (EventSource 한계 대응)

### 공통 응답 규칙
- **성공**: `200 OK` (조회/수정), `201 Created` (생성), `204 No Content` (삭제)
- **에러**: `4xx` / `5xx` + `{ "error": { "code": "...", "message": "..." } }`

### ⚠ 직렬화 규칙
- `user_id` 등 BIGINT 컬럼은 ERD v6.2 기준 BIGINT 이지만, **JSON에서는 문자열로 직렬화** (JS Number 정밀도 한계 2^53 회피)

### 페이지네이션
- 커서 기반 (`cursor`, `next_cursor`)
- 기본 `limit`: 채팅 목록 20, 메시지 50, 북마크 20

### SSE 공통 이벤트 타입
| Event | 설명 |
|-------|------|
| `intent` | 분류된 사용자 의도 (PLACE_SEARCH, GENERAL 등) |
| `status` | LangGraph 노드 전환 시 진행 상태 ("장소를 검색하고 있어요...") |
| `text_stream` | 텍스트 토큰 단위 스트리밍 |
| `place` / `places` | 단일/복수 장소 데이터 블록 |
| `events` | 행사 데이터 블록 |
| `course` | 코스(다중 장소 + 이동) 블록 |
| `map_markers` / `map_route` | 지도 마커 / 경로 |
| `chart` | 비교 차트 (레이더 등) |
| `calendar` | 캘린더 일정 |
| `references` | 추천 사유/근거 |
| `analysis_sources` | 분석 소스 (리뷰 등) |
| `disambiguation` | 모호성 해소 옵션 |
| `done` | 응답 종료 |
| `done_partial` | 다음 intent 남아있음 (Multi-Intent) |
| `error` | 에러 (`retryable` 플래그 포함) |

---

# 1. 사용자 (User & Auth)

## 1.1 회원가입

이메일/비밀번호로 새 계정 생성.

- **Method / URL**: `POST /api/v1/auth/signup`
- **인증**: 불필요
- **담당자**: 한정수 · **상태**: 구현 완료

### Request
```json
{
  "email": "string",
  "password": "string",
  "nickname": "string"
}
```

### Response (`201 Created`)
```json
{
  "access_token": "string",
  "token_type": "bearer",
  "user": {
    "user_id": "string (BIGINT)",
    "email": "string",
    "nickname": "string",
    "created_at": "ISO 8601"
  }
}
```

> `user_id`는 BIGINT(불변식 #1). JSON 직렬화 시 문자열로 변환.

---

## 1.2 로그인

이메일/비밀번호 로그인 → JWT 발급.

- **Method / URL**: `POST /api/v1/auth/login`
- **인증**: 불필요
- **담당자**: 한정수 · **상태**: 구현 완료

### Request
```json
{
  "email": "string",
  "password": "string"
}
```

### Response (`200 OK`)
```json
{
  "access_token": "string",
  "token_type": "bearer",
  "user": {
    "user_id": "string (BIGINT)",
    "email": "string",
    "nickname": "string"
  }
}
```

---

## 1.3 Google 소셜 로그인

Google 계정으로 로그인. 첫 로그인 시 자동 회원가입.

- **Method / URL**: `POST /api/v1/auth/google`
- **인증**: 불필요
- **담당자**: 한정수 · **상태**: (미정)

### Request
```json
{
  "id_token": "string"
}
```

### Response (`200 OK`)
```json
{
  "access_token": "string",
  "token_type": "bearer",
  "user": { "user_id": "...", "email": "...", "nickname": "..." },
  "is_new_user": true
}
```

---

## 1.4 닉네임 변경

설정 페이지에서 닉네임 변경.

- **Method / URL**: `PATCH /api/v1/users/me`
- **인증**: 필요
- **담당자**: 한정수 · **상태**: 구현 완료

### Request
```json
{ "nickname": "string" }
```

### Response (`200 OK`)
```json
{
  "user_id": "string (BIGINT)",
  "email": "string",
  "nickname": "string",
  "updated_at": "ISO 8601"
}
```

---

## 1.5 비밀번호 변경

현재 비밀번호 확인 후 새 비밀번호로 변경.

- **Method / URL**: `PATCH /api/v1/users/me/password`
- **인증**: 필요
- **담당자**: 한정수 · **상태**: 진행중

### Request
```json
{
  "old_password": "string",
  "new_password": "string"
}
```

### Response (`200 OK`)
```json
{ "message": "Password updated" }
```

---

## 1.6 북마크 생성

채팅 도중 특정 응답에 핀 꽂아 북마크 저장.

- **Method / URL**: `POST /api/v1/users/me/bookmarks`
- **인증**: 필요
- **담당자**: 강민서 · **상태**: 진행중

### Request
```json
{
  "thread_id": "string",
  "message_id": "string",
  "pin_type": "place | event | course | analysis | general",
  "preview_text": "string"
}
```

### Response (`201 Created`)
```json
{
  "bookmark_id": "uuid",
  "pin_type": "string",
  "preview_text": "string",
  "created_at": "ISO 8601"
}
```

---

## 1.7 북마크 목록 조회

북마크 탭 표시용. 대화별/핀타입별 필터 가능.

- **Method / URL**: `GET /api/v1/users/me/bookmarks`
- **인증**: 필요
- **담당자**: 강민서 · **상태**: 진행중

### Query Params
| Param | Type | Default | 설명 |
|-------|------|---------|------|
| `thread_id` | string | - | 특정 대화의 북마크만 |
| `pin_type` | string | - | 특정 타입만 |
| `cursor` | string | - | 페이지네이션 커서 |
| `limit` | int | 20 | 페이지 크기 |

### Response (`200 OK`)
```json
{
  "items": [
    {
      "bookmark_id": "uuid",
      "thread_id": "string",
      "thread_title": "string",
      "message_id": "string",
      "pin_type": "string",
      "preview_text": "string",
      "created_at": "ISO 8601"
    }
  ],
  "next_cursor": "string"
}
```

---

## 1.8 북마크 삭제

특정 북마크 삭제.

- **Method / URL**: `DELETE /api/v1/users/me/bookmarks/{bookmark_id}`
- **인증**: 필요
- **담당자**: 강민서 · **상태**: 진행중

### Response (`204 No Content`)

---

# 2. 채팅 (Chat - REST)

## 2.1 채팅 목록 조회

사이드바 표시용 채팅 목록.

- **Method / URL**: `GET /api/v1/chats`
- **인증**: 필요
- **담당자**: 이정 · **상태**: 구현 완료

### Query Params
| Param | Type | Default |
|-------|------|---------|
| `cursor` | string | - |
| `limit` | int | 20 |

### Response (`200 OK`)
```json
{
  "items": [
    {
      "thread_id": "string",
      "title": "string",
      "last_message": "string",
      "updated_at": "ISO 8601"
    }
  ],
  "next_cursor": "string"
}
```

---

## 2.2 채팅 상세 조회

특정 채팅의 메시지 블록을 채팅창에 표시.

- **Method / URL**: `GET /api/v1/chats/{thread_id}`
- **인증**: 필요
- **담당자**: 이정 · **상태**: 구현 완료

### Response (`200 OK`)
```json
{
  "thread_id": "string",
  "title": "string",
  "messages": [
    {
      "role": "user | assistant",
      "blocks": [
        { "type": "text | place | places | course | ...", "content": "..." }
      ],
      "created_at": "ISO 8601"
    }
  ]
}
```

---

## 2.3 대화 메시지 전체 조회

전체 메시지 원본 (append-only). 북마크 위치 이동 시 사용.

- **Method / URL**: `GET /api/v1/chats/{thread_id}/messages`
- **인증**: 필요
- **담당자**: 이정 · **상태**: 구현 완료

### Query Params
| Param | Type | Default |
|-------|------|---------|
| `cursor` | string | - |
| `limit` | int | 50 |

### Response (`200 OK`)
```json
{
  "items": [
    {
      "message_id": "string",
      "role": "user | assistant",
      "blocks": [ /* ... */ ],
      "created_at": "ISO 8601"
    }
  ],
  "next_cursor": "string"
}
```

---

## 2.4 대화 제목 수정

사이드바에서 대화 제목 직접 수정.

- **Method / URL**: `PATCH /api/v1/chats/{thread_id}`
- **인증**: 필요
- **담당자**: 이정 · **상태**: 구현 완료

### Request
```json
{ "title": "string" }
```

### Response (`200 OK`)
```json
{
  "thread_id": "string",
  "title": "string",
  "updated_at": "ISO 8601"
}
```

---

## 2.5 대화 삭제

채팅 목록에서 특정 대화 삭제. `messages` + `bookmarks` cascade 삭제.

- **Method / URL**: `DELETE /api/v1/chats/{thread_id}`
- **인증**: 필요
- **담당자**: 이정 · **상태**: 구현 완료

### Response (`204 No Content`)

---

## 2.6 대화 공유 링크 생성

특정 응답이나 전체 대화를 공유 링크로 생성.

- **Method / URL**: `POST /api/v1/chats/{thread_id}/share`
- **인증**: 필요
- **담당자**: 이정 · **상태**: (미정)

### Request
```json
{
  "thread_id": "string",
  "message_range": {
    "from_message_id": "string | null",
    "to_message_id": "string | null"
  }
}
```

### Response (`201 Created`)
```json
{
  "share_token": "string",
  "share_url": "https://.../shared/{token}",
  "expires_at": "ISO 8601 | null"
}
```

---

## 2.7 공유 링크 해제

발급한 공유 링크 비활성화.

- **Method / URL**: `DELETE /api/v1/chats/{thread_id}/share`
- **인증**: 필요
- **담당자**: 이정 · **상태**: (미정)

### Response (`204 No Content`)

---

## 2.8 AI 응답 피드백

AI 응답 품질 개선용 피드백 수집.

- **Method / URL**: `POST /api/v1/feedback`
- **인증**: 필요
- **담당자**: (미배정) · **상태**: (미정)

### Request
```json
{
  "thread_id": "string",
  "message_id": "string",
  "rating": "up | down",
  "comment": "string | null"
}
```

### Response (`201 Created`)
```json
{
  "feedback_id": "uuid",
  "rating": "up | down",
  "created_at": "ISO 8601"
}
```

---

# 3. 채팅 (Chat - SSE Stream)

> 모든 SSE 엔드포인트는 동일한 단일 경로를 사용:
> ```
> GET /api/v1/chat/stream?thread_id={id}&query={text}&token={jwt}
> ```
> 서버는 `query` 의도(intent)를 분류해 적절한 이벤트 시퀀스로 응답한다.

## 3.1 메인 엔드포인트 — 채팅 시작 (SSE)

SSE 스트림으로 AI와 실시간 채팅.

- **Method / URL**: `GET /api/v1/chat/stream`
- **담당자**: 이정 · **상태**: 구현 완료

### Query Params
| Param | Type | 설명 |
|-------|------|------|
| `thread_id` | string | 채팅 세션 ID |
| `query` | string | 사용자 질문 |
| `token` | string | JWT (헤더 대안) |

### Request
- GET 요청 (query params). 본문 없음.
- JWT: `Authorization: Bearer {token}` 헤더 또는 `token` query param.
- 중단: 클라이언트 `AbortController.abort()` / `EventSource.close()`.

### Response (SSE 이벤트 스트림)
```
event: intent | status | text_stream | place | places | events | course
       | map_markers | map_route | chart | calendar | references
       | analysis_sources | disambiguation | done | done_partial | error
data:  { ...json }
```

- `done` 이벤트 = 응답 종료
- `error` 이벤트는 `retryable: true|false` 플래그 포함
- `Last-Event-ID` 기반 자동 재연결 지원 (브라우저 표준)

---

## 3.2 Intent별 응답 패턴

### 3.2.1 GENERAL — 일반 대화

일반 대화 응답. 텍스트만 스트리밍, 별도 블록 없음.

- **담당자**: 이정 · **상태**: 구현 완료
- **예시 query**: `"안녕! 오늘 날씨 어때?"`

```
intent → text_stream → done
```

---

### 3.2.2 PLACE_SEARCH — 장소 검색

자연어 장소 검색.

- **담당자**: 이정 · **상태**: (미정)
- **예시 query**: `"홍대 카페"`

```
intent → status → text_stream → places[] → map_markers → done
```

#### `places` 페이로드
```json
{
  "items": [
    {
      "place_id": "string",
      "name": "string",
      "category": "string",
      "address": "string",
      "location": { "lat": 0.0, "lng": 0.0 },
      "rating": 4.5,
      "photo_url": "string"
    }
  ]
}
```

---

### 3.2.3 PLACE_RECOMMEND — 장소 추천

비정형 조건 기반 장소 추천 + 추천 사유.

- **담당자**: 이정 · **상태**: (미정)
- **예시 query**: `"카공하기 좋은 카페 추천"`

```
intent → text_stream → places[] → map_markers → references → done
```

---

### 3.2.4 DETAIL_INQUIRY — 장소 상세 조회

이전 대화 맥락에서 언급된 장소의 상세 정보 조회.

- **담당자**: 이정 · **상태**: (미정)
- **예시 query**: `"거기 영업시간은?"`

```
intent → status → text_stream → place → done
```

#### `place` 페이로드
```json
{
  "place_id": "string",
  "name": "string",
  "phone": "string",
  "is_open_now": true,
  "opening_hours": [ /* ... */ ]
}
```

---

### 3.2.5 ANALYSIS — 단일 장소 분석

런타임 Gemini 6지표 채점 + 리뷰 분석.

- **담당자**: 이정 · **상태**: (미정)
- **예시 query**: `"이 카페 분석해줘"`

```
intent → status → text_stream → analysis_sources → done
```

#### 6지표
`satisfaction` · `accessibility` · `cleanliness` · `value` · `atmosphere` · `expertise`

---

### 3.2.6 COURSE_PLAN — 코스 추천

카테고리별 병렬 검색 → ST_DWithin → Greedy NN → OSRM 경로 계산.

- **담당자**: 이정 · **상태**: (미정)
- **예시 query**: `"홍대 카페+맛집 코스"`

```
intent → text_stream → course → map_route → done
```

#### `course` 페이로드
```json
{
  "stops": [
    {
      "order": 1,
      "place": { /* place 객체 */ },
      "duration_min": 60,
      "transit_to_next": { "mode": "walk", "minutes": 10 }
    }
  ]
}
```

#### `map_route` 페이로드
```json
{
  "markers": [ /* ... */ ],
  "polyline": "encoded polyline string"
}
```

---

### 3.2.7 EVENT_SEARCH — 행사 검색

DB 우선 → Naver fallback 행사 검색.

- **담당자**: 한정수 · **상태**: (미정)
- **예시 query**: `"이번 주말 서울 전시회"`

```
intent → status → text_stream → events[] → done
```

---

### 3.2.8 EVENT_RECOMMEND — 행사 추천

취향/맥락 기반 행사 추천 + 추천 사유.

- **담당자**: 한정수 · **상태**: (미정)
- **예시 query**: `"주말에 갈 만한 전시회 추천해줘"`

```
intent → status → text_stream → events[] → references → done
```

---

### 3.2.9 REVIEW_COMPARE — 리뷰 비교

6지표 레이더차트 비교.

- **담당자**: 정조셉 · **상태**: (미정)
- **예시 query**: `"스타벅스 vs 블루보틀 비교"`

```
intent → status → text_stream → chart → analysis_sources → done
```

#### `chart` 페이로드
```json
{
  "chart_type": "radar",
  "places": [
    {
      "name": "string",
      "scores": {
        "satisfaction": 0.0,
        "accessibility": 0.0,
        "cleanliness": 0.0,
        "value": 0.0,
        "atmosphere": 0.0,
        "expertise": 0.0
      }
    }
  ]
}
```

---

### 3.2.10 CALENDAR — 일정 추가

Google Calendar MCP로 일정 추가.

- **담당자**: 강민서 · **상태**: 진행중
- **예시 query**: `"토요일 2시 경복궁 일정 추가"`

```
intent → text_stream → calendar → done
```

#### `calendar` 페이로드
```json
{
  "event_title": "string",
  "start_time": "ISO 8601",
  "end_time": "ISO 8601",
  "location": "string",
  "calendar_link": "https://...",
  "status": "created"
}
```

---

### 3.2.11 BOOKING — 예약 연동

네이버예약/카카오맵 등 딥링크 제공.

- **담당자**: 강민서 · **상태**: 진행중
- **예시 query**: `"여기 예약해줘"`

```
intent → text_stream(딥링크 포함) → done
```

---

### 3.2.12 COST_ESTIMATE — 비용 견적

3단계 가격 추정 (`price_level` + Blog 정규식 + fallback).

- **담당자**: 정조셉 · **상태**: (미정)
- **예시 query**: `"강남 이탈리안 2인 얼마?"`

```
intent → status → text_stream → done
```

> 예상 비용 텍스트만 스트리밍.

---

### 3.2.13 CROWDEDNESS — 혼잡도

`population_stats` (생활인구 데이터) 기반 혼잡도 분석.

- **담당자**: 정조셉 · **상태**: (미정)
- **예시 query**: `"홍대 지금 사람 많아?"`

```
intent → text_stream → done
```

---

### 3.2.14 IMAGE_SEARCH — 이미지 검색

Gemini Vision 이미지 기반 장소 식별.

- **담당자**: 강민서 · **상태**: (미정)
- **예시 query**: 이미지 URL

#### 결과 케이스별 시퀀스
| 케이스 | 이벤트 시퀀스 |
|--------|---------------|
| 식별 성공 | `intent → text_stream → place → done` |
| 유사 추천 | `intent → text_stream → places[] → done` |
| 간판 복수(모호) | `intent → disambiguation[] → done` |

---

## 3.3 메타 (제어/에러)

### 3.3.1 처리 상태 표시 (Status)

LangGraph 노드 전환 시 진행 상태 표시.

- **담당자**: 이정 · **상태**: 구현 완료

```
event: status
data: { "content": "장소를 검색하고 있어요..." }
```

> 노드 전환 시마다 자동 전송. `text_stream` 시작 시 클라이언트 로딩 해제.

---

### 3.3.2 응답 재생성 (Retry)

다시 생성 버튼 클릭 시 동일 질문으로 재요청.

- **담당자**: 이정 · **상태**: 구현 완료

#### 동작
1. 마지막 assistant 메시지 삭제
2. 동일 `query` 로 새 SSE 스트림 재요청

---

### 3.3.3 응답 중단 (Interrupt)

ESC 또는 중단 버튼으로 스트리밍 즉시 중단.

- **담당자**: 이정 · **상태**: 구현 완료

#### 클라이언트
```js
abortController.abort();
// 또는
eventSource.close();
```

#### 서버
- `Request.is_disconnected()` 감지 → 파이프라인 중단

#### 종료 이벤트
```
event: done
data: { "reason": "cancelled", "partial": true }
```

---

### 3.3.4 에러 처리

SSE 스트림 에러 + 자동 재연결.

- **담당자**: 이정 · **상태**: 구현 완료

```
event: error
data: { "message": "string", "retryable": true | false }
```

> 브라우저 `Last-Event-ID` 기반 자동 재연결.

---

### 3.3.5 중첩된 요청 대응 (Multi-Intent)

복수 intent 순차 실행.

- **담당자**: 이정 · **상태**: (미정)
- **예시 query**: `"홍대 카페 추천해주고 주말 전시회도 알려줘"`

```
PLACE_RECOMMEND 이벤트들 → done_partial
                        → EVENT_SEARCH 이벤트들 → done
```

| Event | 의미 |
|-------|------|
| `done_partial` | 다음 intent 남아있음 |
| `done` | 모든 intent 처리 완료 |

---

# 4. 공통 (Common)

## 4.1 공유 대화 조회 (읽기 전용)

공유 링크로 로그인 없이 대화 열람.

- **Method / URL**: `GET /shared/{share_token}`
- **인증**: 불필요 (읽기 전용)
- **담당자**: 이정 · **상태**: (미정)

### Response (`200 OK`)
```json
{
  "thread_title": "string",
  "messages": [
    {
      "role": "user | assistant",
      "blocks": [ /* ... */ ],
      "created_at": "ISO 8601"
    }
  ]
}
```

---

## 4.2 헬스체크

서버/DB/OpenSearch 연결 상태 확인.

- **Method / URL**: `GET /api/v1/health`
- **인증**: 불필요
- **담당자**: 이정 · **상태**: 구현 완료

### Response (`200 OK`)
```json
{
  "status": "healthy",
  "version": "string",
  "uptime_seconds": 12345,
  "database": "connected",
  "opensearch": "connected"
}
```

---

# 📑 Appendix

## A. 담당자별 API

| 담당자 | API |
|--------|-----|
| **이정** | 채팅 REST 전체, SSE 메인, GENERAL/PLACE_*/DETAIL/ANALYSIS/COURSE/Status/Retry/Interrupt/Error/Multi-Intent, 헬스체크, 공유 |
| **한정수** | 회원가입, 로그인, Google 로그인, 비밀번호 변경, 닉네임 변경, EVENT_SEARCH, EVENT_RECOMMEND |
| **강민서** | 북마크 CRUD, CALENDAR, BOOKING, IMAGE_SEARCH |
| **정조셉** | REVIEW_COMPARE, COST_ESTIMATE, CROWDEDNESS |
| (미배정) | AI 응답 피드백 |

## B. 진행 상태 요약

| 상태 | 개수 | 항목 |
|------|------|------|
| 구현 완료 | 11 | 회원가입, 로그인, 닉네임 변경, 채팅 목록/상세/메시지/제목수정/삭제, SSE 메인, GENERAL, Status, Retry, Interrupt, Error, 헬스체크 |
| 진행중 | 5 | 비밀번호 변경, 북마크 생성/목록/삭제, CALENDAR, BOOKING |
| 미정(빈칸) | 22 | Google 로그인, 공유 링크 생성/해제/조회, 피드백, SSE intent들(PLACE_*, DETAIL, ANALYSIS, COURSE, EVENT_*, REVIEW, COST, CROWD, IMAGE), Multi-Intent |

## C. 엔드포인트 일람표

| # | Method | URL | 도메인 |
|---|--------|-----|--------|
| 1 | POST | `/api/v1/auth/signup` | 사용자 |
| 2 | POST | `/api/v1/auth/login` | 사용자 |
| 3 | POST | `/api/v1/auth/google` | 사용자 |
| 4 | PATCH | `/api/v1/users/me` | 사용자 |
| 5 | PATCH | `/api/v1/users/me/password` | 사용자 |
| 6 | POST | `/api/v1/users/me/bookmarks` | 사용자 |
| 7 | GET | `/api/v1/users/me/bookmarks` | 사용자 |
| 8 | DELETE | `/api/v1/users/me/bookmarks/{bookmark_id}` | 사용자 |
| 9 | GET | `/api/v1/chats` | 채팅 |
| 10 | GET | `/api/v1/chats/{thread_id}` | 채팅 |
| 11 | GET | `/api/v1/chats/{thread_id}/messages` | 채팅 |
| 12 | PATCH | `/api/v1/chats/{thread_id}` | 채팅 |
| 13 | DELETE | `/api/v1/chats/{thread_id}` | 채팅 |
| 14 | POST | `/api/v1/chats/{thread_id}/share` | 채팅 |
| 15 | DELETE | `/api/v1/chats/{thread_id}/share` | 채팅 |
| 16 | POST | `/api/v1/feedback` | 채팅 |
| 17 | GET | `/api/v1/chat/stream` | 채팅 (SSE, 14 intents + 5 meta 공용) |
| 18 | GET | `/shared/{share_token}` | 공통 |
| 19 | GET | `/api/v1/health` | 공통 |

> 실제 SSE는 `/api/v1/chat/stream` 단일 엔드포인트에서 `query`의 분류된 intent에 따라 다른 이벤트 시퀀스를 반환한다.
