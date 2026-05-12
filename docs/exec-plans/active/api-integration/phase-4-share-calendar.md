# Phase 4 — 공유 / Google Calendar OAuth + 에러 헬퍼 일반화

**브랜치**: `feat/api-integration`
**전제**: Phase 1·2·3 통과, vite proxy 활성

---

## 결정사항

### 1. 코드 검토 결과 — 공유/캘린더 흐름은 이미 작성 완료
- `ShareButton.tsx` → `chatsApi.share()` 호출 + 클립보드 복사 + 토스트 (작성됨)
- `SharedPage.tsx` → `sharedApi.get(token)` (작성됨)
- `SettingsPage.tsx` → `googleCalendarApi.getAuthUrl()` + window.location 리다이렉트 (작성됨)
- `CalendarPanel.tsx` → 동일 (작성됨)
- `CalendarConnected.tsx` → 콜백 후 결과 페이지 (작성됨)

Phase 4의 본질적 작업은 **검증 + 에러 처리 일관화**.

### 2. 에러 헬퍼 일반화 — `friendlyApiError(err, fallback)`
기존 `friendlyAuthError`는 login/signup 전용이라 SettingsPage·ShareButton 등엔 부적합.
- 신규 `friendlyApiError(err, fallback)`: status별 일반 한글 매핑(401/403/404/409/422/5xx/0)
- `friendlyAuthError`는 9 / 401 특수분기만 유지 후 나머지를 `friendlyApiError`에 위임

### 3. 타입 자동생성 (openapi-typescript) — Phase 5 이월
지금 도입하면 수동 `src/types/api.ts`와 충돌 가능성 + 기존 변환 어댑터 영향. BE 라우트가 안정화되고 영속화 이슈가 풀린 뒤 도입.

---

## 변경된 파일

| 파일 | 변경 |
|---|---|
| `src/lib/auth-errors.ts` | `friendlyApiError(err, fallback)` 신규, `friendlyAuthError`는 일반 케이스를 위임 |
| `src/components/settings/SettingsPage.tsx` | 3개 catch (`updateNickname`, `getAuthUrl`, `changePassword`) → `friendlyApiError` |
| `src/components/chat/ShareButton.tsx` | catch → `friendlyApiError` |
| `src/components/share/SharedPage.tsx` | catch → `friendlyApiError` |
| `src/components/calendar/CalendarPanel.tsx` | OAuth 시작 catch → `friendlyApiError` |

---

## 검증 결과

### 자동
- [x] `tsc --noEmit` 통과
- [x] `vitest run` — 13/13 tests passed

### 라이브 BE 호출 (proxy 경유)
- [x] `GET /api/v1/auth/google/calendar` → 200 + `auth_url` 발급 ✅
- [x] `POST /api/v1/chats/{tid}/share` (없는 thread) → 404 "대화를 찾을 수 없습니다" (정상 — 영속화 대기)
- [x] `GET /shared/{nonexistent}` → 404 "공유 링크를 찾을 수 없습니다" (정상)

### 차단/미해결 사항

1. **Google Calendar `client_id`가 빈 값** — `auth_url` 응답엔 `client_id=` (빈 문자열).
   BE 환경변수 `GOOGLE_CALENDAR_CLIENT_ID`가 dev 서버에 적용되지 않은 듯.
   현 상태에서 OAuth 동의 화면이 정상 표시되지 않음.
   → 별도 보고: [be-issue-google-calendar-config.md](./be-issue-google-calendar-config.md)
2. **`redirect_uri`가 `http://localhost:8000`** — dev BE는 GCE 외부 IP(`34.22.91.75:8000`)인데
   redirect_uri는 localhost. 사용자 브라우저가 콜백 시 BE에 도달 불가.
3. **`/openapi.json`이 vite proxy 통과 안 함** — 타입 자동생성 단계에서 vite.config.ts에 추가 필요. 지금은 직접 BE 호출로 충분.

### 브라우저 수동 (해결 사항 풀린 후 검증)
- [ ] ShareButton 클릭 → 클립보드 복사 + 토스트 (chat 영속화 후)
- [ ] `/shared/<token>` 접근 → 메시지 렌더 (Phase 2 영속화 후)
- [ ] SettingsPage `Google Calendar 연동하기` 클릭 → 동의 화면 (BE config 수정 후)
- [ ] OAuth 콜백 → CalendarConnected 페이지 (BE redirect 수정 후)

---

## 다음 Phase

- **Phase 5 — 4상태 UI 보강 + 타입 자동생성 (선택)**
  - Loading/Error/Empty/Populated 정합성 점검 (`docs/ui-detail-specs.md` 기준)
  - 사이드바 empty state (BE 영속화 시 자연스럽게 노출)
  - 메시지 페이징 무한 스크롤 (현재 `limit: 100` 단발 호출)
  - `openapi-typescript` 도입 후 `src/types/api.ts` 정합성 자동화 (선택)

Phase 4의 실 사용 검증은 다음 BE 이슈가 풀린 후 재실행:
- `chat/stream` 영속화 (Phase 2 BE 이슈)
- Google Calendar `client_id` + `redirect_uri` (Phase 4 BE 이슈)
