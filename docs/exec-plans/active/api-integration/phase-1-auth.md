# Phase 1 — 인증 + 401 흐름

**브랜치**: `feat/api-integration`
**BE**: `http://34.22.91.75:8000` (GCE `localbiz-api`, AnyWay v0.1.0)
**dev 접근**: vite proxy(same-origin) → BE. CORS 우회.

---

## 결정사항

### 1. dev BE 접속은 vite proxy로 처리
- 이유: BE의 CORS allow-origin이 `http://localhost:5173` 한 곳만이라 포트가 바뀌면 깨짐
- `vite.config.ts > server.proxy`에서 `/api`, `/health`, `/shared`를 dev BE로 전달
- `.env.local`의 `VITE_API_BASE`는 빈 값 유지(same-origin)
- BE 대상 변경은 `VITE_DEV_BE` 환경변수로 (vite.config.ts 참조)

### 2. Pydantic 422 응답을 한글로 변환
- BE는 422 응답을 `{"detail": [{loc, msg, type, ...}, ...]}` 배열로 반환
- 기존 `extractErrorMessage`는 array 케이스를 못 잡아서 `HTTP 422`로 폴백 → 사용자에게 무의미
- `humanizePydanticMsg` 헬퍼로 자주 보이는 영문 msg 4종을 한글로 매핑

### 3. status별 사용자 메시지 정규화
- `lib/auth-errors.ts > friendlyAuthError`가 LoginPage/SignupPage 공유
- BE 응답이 한글이면 그대로(401), 영문/구조적이면 한글 폴백(409 중복, 422, 5xx)

### 4. Google OAuth FE 주석 정리
- BE는 `POST /api/v1/auth/google` 라우트 노출 중. `api.ts`의 "BE 미구현" 주석 제거
- 실제 UI 활성화(소셜 버튼)는 Phase 4로 미룸

---

## 변경된 파일

| 파일 | 변경 |
|---|---|
| `vite.config.ts` | `server.proxy` 추가 (`/api`, `/health`, `/shared`) |
| `.env.local` | `VITE_API_BASE`를 빈 값으로 (proxy 사용), BE 참조 주석 정리 |
| `src/types/api.ts` | `ApiErrorDetailItem` 신설, `ApiError.detail`에 array 케이스 추가 |
| `src/lib/api.ts` | `humanizePydanticMsg` + `extractErrorMessage` 배열 처리, google 주석 정리 |
| `src/lib/auth-errors.ts` | 신규 — `friendlyAuthError(err, mode)` 헬퍼 |
| `src/components/auth/LoginPage.tsx` | catch 블록에서 `friendlyAuthError` 사용 |
| `src/components/auth/SignupPage.tsx` | catch 블록에서 `friendlyAuthError` 사용 |

---

## BE 응답 패턴 정찰 결과

| 시나리오 | HTTP | body | 처리 |
|---|---|---|---|
| 회원가입 정상 | 201 | `TokenResponse` JSON | 기존 흐름 OK |
| 이메일 중복 | 409 | `{"detail":"email already exists"}` (영문) | `friendlyAuthError` → "이미 가입된 이메일입니다" |
| 로그인 실패 | 401 | `{"detail":"이메일 또는 비밀번호가 올바르지 않습니다"}` (한글) | 그대로 노출 |
| 짧은 비번 로그인 | 401 | (한글) | 그대로 노출 |
| 이메일 형식 위반 | 422 | Pydantic detail 배열 (영문 msg) | `humanizePydanticMsg`로 한글 변환 |
| 필수 필드 누락 | 422 | Pydantic detail 배열 | 동일 |
| 토큰 만료 / 위변조 | 401 | `{"detail":"유효하지 않은 인증"}` | `authStore.init`의 `setOnUnauthorized` → 토스트 + 로그아웃 |

---

## 검증 결과

### 코드 레벨 (자동)
- [x] `tsc --noEmit` 통과
- [x] `vitest run` — 13/13 tests passed
- [x] vite proxy via curl — `/health` 200, `/api/v1/chats` 401, `/api/v1/auth/login` 422 확인

### 브라우저 레벨 (수동 — 미실행)
다음 시나리오는 dev 서버 `http://localhost:5174`에서 사용자가 검증해야 함:
- [ ] `/signup` 이메일 형식 위반 → `email: 이메일 형식이 올바르지 않습니다` 토스트
- [ ] `/signup` 중복 이메일 → `이미 가입된 이메일입니다`
- [ ] `/login` 잘못된 비번 → `이메일 또는 비밀번호가 올바르지 않습니다`
- [ ] 정상 로그인 → 메인 화면 진입
- [ ] localStorage 토큰 위변조 → 새로고침 시 토스트 + `/login` 리다이렉트

테스트 계정 예시:
- email: `claude_test_1778575930@example.com` / pw: `testpass1234` (Phase 1 정찰 중 생성)

---

## 다음 Phase

- **Phase 2 — 채팅 스토어 교체** (가장 큰 변경)
- `chatStore`(localStorage) → `apiChatStore`(BE) 스왑
- 영향 컴포넌트 8개:
  `App`, `ChatHeader`, `ChatMessages`, `ChatInputConnected`, `ChatSidebar`, `MessageBubble`, `StreamingMessage`, `BookmarkPanel`
- 검증 대상: SSE `/api/v1/chat/stream`, 메시지 페이징, optimistic send, 빈/로딩/에러 상태
