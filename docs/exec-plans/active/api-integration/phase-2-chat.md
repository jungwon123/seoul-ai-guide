# Phase 2 — 채팅 스토어 BE 통합

**브랜치**: `feat/api-integration`
**전제**: Phase 1 (인증) 통과, vite proxy 활성

---

## 전략

### 결정: chatStore에 BE 영속성 통합 (apiChatStore swap 대신)

정찰 결과 `chatStore`(localStorage)와 `apiChatStore`(BE) 인터페이스가 완전히 달라
8개 컴포넌트(`App`, `ChatHeader`, `ChatMessages`, `ChatInputConnected`,
`ChatSidebar`, `MessageBubble`, `StreamingMessage`, `BookmarkPanel`)를
한 번에 모두 갈아엎으면 회귀 위험 큼.

관찰: chatStore도 이미 BE SSE(`openChatStream`)를 호출 중. **유일한 갭은
"thread 목록/메시지 히스토리 영속성"이 localStorage 기반**이라는 점.

→ chatStore에 BE 영속화 액션만 추가하고 컴포넌트 변경은 0건으로 유지.
   apiChatStore는 보존(향후 완전 마이그레이션 때 활용).

---

## 변경된 파일

| 파일 | 변경 |
|---|---|
| `src/stores/chatStore.ts` | `messageItemToMessage` 어댑터 추가, `loadFromServer`/`renameSession` 신규, `loadSession`/`deleteSession` 비동기화 + BE 호출 (optimistic delete/rename) |
| `src/App.tsx` | `useAuthStore.token` 감지 시 `loadFromServer()` 자동 호출 |

컴포넌트(UI) 변경: 0건 — `useChatStore` 인터페이스 호환 유지.

---

## 어댑터: `MessageItem.blocks[]` → 레거시 `Message`

BE는 메시지를 17종 블록 배열로 직렬화. FE 레거시 `Message`는
`text/places/itinerary/blocks` 필드로 분리. 변환 규칙:

| BE 블록 | → 레거시 Message |
|---|---|
| `text`, `text_stream` | `message.text` 누적 |
| `place` | `message.places = [...]` (1건) |
| `places` | `message.places = [...]` (n건) |
| `course` | `message.itinerary` (첫 번째) + `itineraries` (복수) |
| `intent`, `status`, `done`, `done_partial`, `error` | 제어 프레임 — 히스토리에 보존 안 함 |
| 기타 (`chart`, `events`, `calendar`, `references`, `analysis_sources`, `disambiguation`, `map_markers`, `map_route`) | `message.blocks[]` |

`role`: BE `assistant` → 레거시 `agent`로 매핑.

---

## Optimistic update 패턴

- `deleteSession(id)` — 로컬 즉시 제거 → BE 호출. 실패 시 다음 `loadFromServer`에서 복원.
- `renameSession(id, title)` — 로컬 즉시 변경 → BE 호출. 실패 시 이전 제목으로 롤백.
- `loadSession(id)` — 비동기 (BE에서 messages fetch). 실패 시 로컬 캐시로 폴백.

이유: 네트워크 왕복 대기 동안 UI freeze 방지. 기존 sync 시그니처를 호출하던
컴포넌트(ChatSidebar, BookmarkPanel)는 fire-and-forget으로 호환됨.

---

## 검증 결과

### 자동
- [x] `tsc --noEmit` 통과
- [x] `vitest run` — 13/13 tests passed (`chatStore.test.ts` `deleteSession` 테스트는
      optimistic 패턴 덕에 sync 호출에서도 통과)

### 라이브 BE 호출 (proxy 경유)
- [x] 회원가입 → JWT 발급 (201)
- [x] `GET /api/v1/chats` (인증 후) → 200 `{"items":[],"next_cursor":null}`
- [x] `GET /api/v1/chat/stream` SSE → `status`/`intent`/`text_stream`/`done` 이벤트 정상 수신

### 미해결 — BE 영속화 누락 (별도 보고)
- [ ] SSE 응답을 받은 후에도 `/api/v1/chats` 빈 배열 유지
- [ ] 직전 SSE에서 사용한 `thread_id`로 `/api/v1/chats/{id}/messages` → **404 "대화를 찾을 수 없습니다"**

→ 별도 이슈 보고: [be-issue-chat-persistence.md](./be-issue-chat-persistence.md)

FE 코드는 BE 영속화 활성화 시 추가 변경 없이 즉시 작동.

### 브라우저 수동 (미실행, 사용자 검증 필요)
- [ ] 로그인 후 사이드바에 BE chat 목록 노출 (BE 영속화 후 검증 가능)
- [ ] 사이드바에서 채팅 클릭 → BE messages fetch + 메시지 렌더 (BE 영속화 후)
- [ ] 사이드바에서 삭제 → 즉시 사라지고 새로고침 후에도 유지
- [ ] 새 대화 시작 후 메시지 보내고 새로고침 → 사이드바에 자동 추가 (BE 영속화 후)

---

## 다음 Phase

- **Phase 3 — 북마크 스토어 BE 통합**
- BE에 명시적 `POST/DELETE /api/v1/users/me/bookmarks` 라우트 있어 영속화 정상 기대
- 영향 컴포넌트: `BookmarkPanel`, `MessageBubble`
- 패턴: chatStore와 동일하게 optimistic local + BE 동기화

> Phase 2의 BE 영속화 이슈는 Phase 3 이후 BE 팀 처리 결과에 따라 재검증.
