# [BE 요청] 일정 탭 — Google Calendar 이벤트 조회 엔드포인트

**작성일**: 2026-05-18
**우선순위**: 중 (사용자 경험 영향, 회피 가능)
**FE 담당**: jwon
**관련 FE 코드**: `src/components/calendar/CalendarPanel.tsx`, `src/stores/calendarStore.ts`, `src/components/chat/blocks/CalendarBlock.tsx`

---

## 1. 증상

1. 사용자가 Google Calendar 연동 완료
2. 채팅으로 "이 코스 캘린더에 추가해줘" 요청 → 정상 동작
   - BE `calendar_node.py` 가 Google Calendar API 로 이벤트 insert
   - SSE `calendar` 블록 송신 → FE 채팅에 "일정 등록 완료" 카드 표시 ✅
   - 사용자 Google Calendar 에 실제로 이벤트 추가됨 ✅
3. 그러나 **FE "일정" 탭 클릭 시 항상 "일정 없음"** 표시 ❌

## 2. 원인

FE 의 `CalendarPanel` 은 클라이언트 메모리 store (`calendarStore.events`) 만 읽음. 이 store 는 **현재 어디서도 채워지지 않음** (grep 결과 0건).

BE 측에서 사용자의 Google Calendar 이벤트를 **조회**할 수 있는 엔드포인트가 없음. 현재 BE Google Calendar 관련 엔드포인트:
- `GET /api/v1/auth/google/calendar` — OAuth auth URL 발급 (구현 완료)
- `GET /api/v1/auth/google/calendar/callback` — OAuth 콜백 (구현 완료)
- (없음) — 이벤트 list/get 엔드포인트

SSE `calendar` 블록은 채팅 컨텍스트에서만 1회성으로 표시되고, 영구 저장 안 됨. 새로고침 시 사라짐.

## 3. 요청 사항

### Option B (권장) — Google Calendar 직접 조회

사용자의 Google Calendar 에 저장된 이벤트를 BE 가 OAuth 토큰으로 조회해서 반환.

**신규 엔드포인트**:
```
GET /api/v1/users/me/calendar/events
  ?time_min=2026-05-18T00:00:00Z   (선택, 기본: now)
  ?time_max=2026-06-30T00:00:00Z   (선택, 기본: now + 90d)
  ?limit=50                        (선택, 기본: 50, 최대 250)
Authorization: Bearer <JWT>
```

**응답 (200)**:
```json
{
  "items": [
    {
      "event_id": "google_event_id_string",
      "title": "강남역 카페 투어",
      "start_time": "2026-05-20T14:00:00+09:00",
      "end_time": "2026-05-20T17:00:00+09:00",
      "location": "서울특별시 강남구...",
      "description": "코스 설명...",
      "calendar_link": "https://www.google.com/calendar/event?eid=...",
      "source": "agent" | "user"   // 우리 앱이 만든 건지 사용자가 직접 만든 건지 (선택)
    }
  ],
  "next_page_token": "..." | null
}
```

**에러 응답**:
- `401` — JWT 없음/만료
- `403` — Google Calendar 미연동 (OAuth 토큰 없음). body: `{ "detail": "google_calendar_not_connected" }`
- `502` — Google API 호출 실패 (rate limit, network 등)

**구현 노트**:
- 구현 시 Google Calendar API `events.list` 사용
- `calendarId=primary` 로 기본 캘린더만 (또는 향후 다중 캘린더 지원)
- `source` 필드는 `extendedProperties` 또는 `description` prefix 로 구분 가능. 어렵다면 생략하고 일단 모든 이벤트 반환해도 OK.

**선택적**: 삭제/수정 엔드포인트
```
DELETE /api/v1/users/me/calendar/events/{event_id}
PATCH  /api/v1/users/me/calendar/events/{event_id}
```
FE 가 일정 탭에서 "삭제" 버튼 누를 때 Google Calendar 에서도 제거되도록.
지금 FE 의 `CalendarPanel` 에 이미 "삭제" 버튼 UI 가 있어서 연결만 하면 됨.

---

### Option C (대안) — 우리 앱 자체 DB 저장

Google Calendar 와 별개로 우리 앱 DB 에 이벤트 저장.

**테이블**: `user_calendar_events`
```
event_id          BIGSERIAL PRIMARY KEY
user_id           BIGINT (FK users)
title             TEXT
start_time        TIMESTAMPTZ
end_time          TIMESTAMPTZ NULL
location          TEXT NULL
description       TEXT NULL
google_event_id   TEXT NULL  // Google Calendar 에 동기화된 경우
calendar_link     TEXT NULL
source_thread_id  TEXT NULL  // 어떤 채팅에서 만들어진 일정인지
created_at        TIMESTAMPTZ DEFAULT now()
is_deleted        BOOLEAN DEFAULT false
deleted_at        TIMESTAMPTZ NULL
```

**엔드포인트**:
- `GET /api/v1/users/me/calendar/events` — 목록
- `POST /api/v1/users/me/calendar/events` — 생성 (BE 가 Google Calendar 에도 insert 후 google_event_id 저장)
- `DELETE /api/v1/users/me/calendar/events/{id}` — 소프트 삭제 (Google Calendar 에서도 제거)

**채팅 통합**: 현재 `calendar_node.py` 가 Google Calendar insert 후 `CalendarBlock` SSE 송신 → 그 시점에 우리 DB 에도 row 추가하면 자연스러움.

---

## 4. Option B vs C 비교

| 항목 | B (Google 직조회) | C (우리 DB 저장) |
|---|---|---|
| BE 작업량 | 작음 (1개 엔드포인트) | 큼 (테이블 + 3 엔드포인트 + 마이그레이션) |
| 데이터 소유 | Google | 우리 + Google |
| 사용자 다른 일정 노출 | 노출됨 (사적 일정 포함) | 우리 앱이 만든 것만 |
| Google 측에서 직접 수정/삭제 | 즉시 반영 | 우리 DB 와 어긋남 (동기 필요) |
| 오프라인 | 안 됨 | 우리 DB 만으로 동작 |
| 추가 메타데이터 (itinerary 등) | 어려움 (Google 스키마 제약) | 자유롭게 추가 |

## 5. FE 가 선호하는 것

**Option B 가 더 가볍고 빠른 도입** 입니다. 사용자 일정의 single source of truth 가 Google 이라 모순이 적음.

다만 **사용자가 우리 앱이 만든 이벤트만 보고 싶어할 수도** 있어서 그 케이스를 BE 가 어떻게 구분해서 응답할지 의견 부탁드립니다 (Google `extendedProperties` 활용 등).

## 6. 우선순위 / 마일스톤

- **Phase 1 (즉시)**: FE 단독으로 SSE `calendar` 블록을 localStorage 미러로 임시 처리 (BE 작업 불필요, 새로고침/다른 기기 시 사라지지만 당장 사용 가능)
- **Phase 2 (이 요청)**: 위 엔드포인트 도입 후 진정한 동기화

Phase 1 은 FE 가 곧 진행 예정이라 Phase 2 는 1~2주 정도 텀 두고 검토 가능합니다.

## 7. 결정 필요한 항목 (BE 답변 요청)

- [ ] Option B vs C 중 어느 방향?
- [ ] (B 선택 시) `source` 필드 구분 가능 여부 (Google extendedProperties 활용 가능?)
- [ ] (B 선택 시) `time_min/max` 기본값 정책 (now ~ +90일 OK?)
- [ ] (C 선택 시) 테이블 컬럼 추가 의견
- [ ] 우선순위 / 예상 일정

---

## 부록 — 현재 FE 화면 흐름

1. 사용자 일정 탭 진입
2. (현재) localStorage 또는 메모리 `events` 배열을 보여줌 — 항상 비어있음
3. (목표) BE `GET /events` 호출 → `items[]` 표시
4. 카드에는 이벤트별로 title / start_time / location / "캘린더에서 열기" 링크 / 삭제 버튼 표시

**FE 작업 예정 (Phase 2 진행 시)**:
- `src/lib/api.ts` 에 `calendarApi.listEvents` / `deleteEvent` 추가
- `src/stores/calendarStore.ts` 에 `loadFromServer` 추가
- `App.tsx` 에서 로그인 직후 `loadFromServer` 호출 (다른 store 들과 동일 패턴)
- 캘린더 미연동 (403) 시 `CalendarPanel` 에 "Google Calendar 연동" CTA 강조
