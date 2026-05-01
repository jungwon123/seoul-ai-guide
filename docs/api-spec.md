# API Spec

Notion 원본 문서의 API 목록을 카테고리별로 정리. 각 항목 옆 표시는 현재 코드베이스의 구현 상태.

> **현재 코드베이스 전반 상태**: 실제 백엔드 호출 없음. 모든 데이터 mock 기반 (`src/mocks/*`). SSE/WebSocket 클라이언트 0건.

---

## 1. 인증 (Auth)

| API | 상태 | 비고 |
|---|---|---|
| 회원가입 | ❌ 미구현 | UI/스토어 모두 없음 |
| 로그인 | ❌ 미구현 | localStorage `seoul-ai-guide-onboarded` 플래그만 있음 |
| Google 소셜 로그인 | ❌ 미구현 | |
| 비밀번호 변경 | ❌ 미구현 | |
| 닉네임 변경 | ❌ 미구현 | |

---

## 2. 채팅 — SSE (Server-Sent Events)

핵심 채팅 플로우. 이벤트 기반 스트리밍.

| API | 상태 | 비고 |
|---|---|---|
| 채팅 시작 (SSE) | 🟡 Mock | `chatStore.sendMessage` → `mocks/agent-responses.ts: streamResponse` async generator |
| SSE: 일반 대화 (GENERAL) | 🟡 Mock | 위와 동일 경로 |
| SSE: 코스 추천 (COURSE_PLAN) | 🟡 Mock | itinerary mock 반환 |
| SSE: 장소 검색 (PLACE_S / ANALYSIS) | 🟡 Mock | places mock 반환 |
| SSE: 일정 추가 (CALENDAR) | 🟡 Mock | `calendarStore` 로컬만 |
| SSE: 예약 연동 (BOOKING) | 🟡 Mock | `bookings.json` |
| SSE: 비용 견적 (COST_ESTIMATE) | ❌ 미구현 | |
| SSE: 혼잡도 (CROWDEDNESS) | 🟡 Mock | `Congestion` 타입은 있음, mock 데이터에 포함 |
| SSE: 행사 검색 (EVENT_SEARCH) | ❌ 미구현 | |
| SSE: 행사 추천 (EVENT_RECOMMEND) | ❌ 미구현 | |
| SSE: 처리 상태 (Status) | ❌ 미구현 | typing dot UI는 있지만 SSE 이벤트 매핑 없음 |
| SSE: 에러 처리 | 🟡 부분 | `ErrorBubble` 컴포넌트만 있음, SSE 에러 이벤트 미연결 |
| SSE: 재생성 (Retry) | ❌ 미구현 | |
| SSE: 중단 (Interrupt) | ❌ 미구현 | abort signal 없음 |
| SSE: Multi-Intent | ❌ 미구현 | 복합 의도 처리 분기 없음 |

---

## 3. 채팅 — REST CRUD

| API | 상태 | 비고 |
|---|---|---|
| 채팅 목록 조회 | 🟡 Mock | `chatStore.sessions` 로컬 메모리 |
| 채팅 상세 조회 | 🟡 Mock | 위와 동일 |
| 대화 메시지 전체 조회 | 🟡 Mock | 세션 내 messages 배열 |
| 대화 제목 수정 | 🟡 Mock | `generateSessionTitle` 자동만, 수동 수정 UI 없음 |
| 대화 삭제 | 🟡 Mock | `chatStore.deleteSession` 있음 |
| 대화 공유 링크 생성 | ❌ 미구현 | |
| 공유 대화 조회 (읽기 전용) | ❌ 미구현 | |
| 공유 링크 해제 | ❌ 미구현 | |

---

## 4. 북마크

| API | 상태 | 비고 |
|---|---|---|
| 북마크 목록 조회 | 🟡 Mock | `bookmarkStore` 로컬 |
| 북마크 생성 | 🟡 Mock | `toggle`, `toggleMessage` |
| 북마크 삭제 | 🟡 Mock | 동일 |

---

## 5. WebSocket

| API | 상태 | 비고 |
|---|---|---|
| WS: 이미지 검색 (IMAGE_SEARCH) | ❌ 미구현 | WS 클라이언트 0건 |
| WS: 리뷰 비교 (REVIEW_COMPARE) | ❌ 미구현 | |
| WS: 장소 상세 (DETAIL_INQUIRY) | ❌ 미구현 | 정적 mock으로만 표시 |

---

## 6. 시스템

| API | 상태 | 비고 |
|---|---|---|
| 헬스체크 | ❌ 미구현 | |

---

## 범례

- ✅ 실제 API 호출로 동작
- 🟡 **Mock** — UI는 동작하지만 실제 API 미연결
- ❌ 미구현 — UI도 없음

---

## 다음 단계 권장

1. **API 클라이언트 레이어** 도입 (`src/lib/api/`) — SSE 핸들러, WS 핸들러, REST fetcher 분리
2. **인증 토큰 관리** (zustand `authStore` + httpOnly cookie 또는 secureStorage)
3. **SSE intent 라우터** — `event:` 헤더 기반 (`COURSE_PLAN`, `GENERAL` 등)으로 dispatch
4. **에러/재시도/중단 표준화** — `AbortController` + 재시도 큐
5. **Notion 원본의 request/response 스키마** 가져와서 타입 생성 (`src/types/api.ts`)
