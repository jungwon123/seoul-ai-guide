# Phase 3 — 북마크 스토어 BE 통합

**브랜치**: `feat/api-integration`
**전제**: Phase 1·2 통과, vite proxy 활성

---

## 전략

### 범위 분리: 메시지 북마크만 BE 통합 (장소 북마크 보류)

기존 `bookmarkStore`엔 **두 종류**의 북마크가 있음:
1. **메시지 북마크** (`messageItems`, `toggleMessage`) — `thread_id + message_id` 컨텍스트 보유
2. **장소 북마크** (`bookmarkedIds`, `toggle`) — `place_id`만, 5개 컴포넌트(`PlaceCard`/`PlaceCarousel`/`PlaceOverlayItem`/`MapPanel`/카드)가 사용

BE 북마크 스키마(`thread_id + message_id + pin_type`)는 메시지 북마크에만 자연스럽게 매핑. 장소 북마크는 thread/message 컨텍스트가 없는 호출 경로가 많아 5개 컴포넌트 리팩토링이 필요 → 별도 Phase로 분리.

Phase 3 = 메시지 북마크만 BE 동기화, 장소 북마크는 localStorage 유지.

---

## 변경된 파일

| 파일 | 변경 |
|---|---|
| `src/stores/bookmarkStore.ts` | `bookmarksApi` 임포트, `bookmarkItemToMessage` / `pinTypeFromSnapshot` 어댑터 추가, `toggleMessage` / `removeMessage` 비동기화 + optimistic 패턴, `loadFromServer` 신규 |
| `src/App.tsx` | 로그인 토큰 감지 effect에 `useBookmarkStore.loadFromServer()` 호출 추가 (기존 chat과 함께) |

컴포넌트(UI) 변경: 0건 — `useBookmarkStore` 인터페이스 호환 유지(시그니처만 `Promise<void>`).

---

## BE → 레거시 변환

BE `BookmarkItem`엔 message snapshot이 없음 → `preview_text`를 본문으로 재구성:

```ts
bookmarkItemToMessage(item) → MessageBookmarkItem {
  bookmarkId: String(item.bookmark_id),
  messageId: String(item.message_id),
  conversationId: item.thread_id,
  snapshot: { role: 'assistant', createdAt: item.created_at, content: item.preview_text ?? '' },
  createdAt: item.created_at,
}
```

`pin_type` 추정:
- `snapshot.itinerary` 있으면 → `'course'`
- `snapshot.places` 있으면 → `'place'`
- 그 외 → `'general'`

---

## Optimistic 패턴

- `toggleMessage(input)` — 임시 ID(`temp-mb-<msg>-<ts>`)로 즉시 추가 → BE create → 응답 `bookmark_id`로 교체. 실패 시 롤백.
- `removeMessage(id)` — 로컬 즉시 제거 → BE delete(임시 ID면 스킵). 실패 silent.
- `loadFromServer()` — BE list 받아서 전부 교체. 실패 silent (비로그인/네트워크).

---

## 검증 결과

### 자동
- [x] `tsc --noEmit` 통과
- [x] `vitest run` — 13/13 tests passed

### 라이브 BE 호출 (proxy 경유)
- [x] `POST /api/v1/users/me/bookmarks` (message_id가 **integer**) → 201 + 응답 정상
- [x] `GET /api/v1/users/me/bookmarks` → 즉시 list에 반영 (**영속화 OK**)
- [x] `DELETE /api/v1/users/me/bookmarks/{id}` → 204 (브라우저 fetch는 redirect 자동 follow)

### 미해결 / 차단 사항
1. **BE는 `message_id`를 integer로만 받음** (FE 타입 정의는 `string | number`). 실 사용은 BE-recognized integer가 있어야 함.
2. **chat 영속화 의존**: Phase 2 영속화 이슈 미해결 상태에선 메시지에 BE message_id가 없음 → 메시지 북마크 버튼을 눌러도 422가 나서 롤백됨.
3. 별도 BE 이슈: [be-issue-bookmark-spec.md](./be-issue-bookmark-spec.md) 참조 (DELETE trailing slash 307, message_id 타입 스펙 정정).

### 브라우저 수동 (Phase 2 BE 영속화 후 검증 가능)
- [ ] 메시지에서 북마크 토글 → 즉시 노란색, BE에 영구 저장
- [ ] 새로고침 후 BookmarkPanel에 자동 노출 (`loadFromServer`)
- [ ] BookmarkPanel에서 제거 → BE 동기화
- [ ] 다른 기기/브라우저 로그인 → 동일 목록 노출

---

## 다음 Phase

- **Phase 4 — 공유 / Google Calendar OAuth / 정합성**
- `ShareButton` 실 BE 호출 검증 (`POST /chats/{tid}/share`)
- `SettingsPage` Google Calendar 연결 흐름 (`GET /auth/google/calendar`)
- 타입 자동생성 (`openapi-typescript`) 도입으로 `src/types/api.ts` 정합성 자동화
- 4상태 (Loading/Error/Empty/Populated) 잔여 보강

Phase 3의 실 사용 검증은 Phase 2 BE 영속화 완료 후 재실행.
