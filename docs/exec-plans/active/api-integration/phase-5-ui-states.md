# Phase 5 — 4상태 UI 보강 + openapi-typescript 도입

**브랜치**: `feat/api-integration`
**전제**: Phase 1·2·3·4 통과

---

## 결정사항

### 1. 사이드바·북마크 패널 4상태 분기 (`docs/ui-detail-specs.md` 가이드)
- **Loading**: store가 BE에서 받아오는 중. 항목이 비어있고 첫 페인트일 때 skeleton 표시
- **Error**: BE 실패 시 한글 메시지 + "다시 시도" 버튼
- **Empty**: 정상 응답인데 데이터 0건일 때 기존 EmptyState 노출
- **Populated**: 평시 리스트

캐시 정책: 로컬 데이터가 있으면 그대로 리스트 노출(낙관적). 비어있을 때만 로딩/에러 분기. 이는 새로고침 시 깜빡임을 막고 BE 오류 상황에서도 마지막 좋은 상태를 유지하기 위함.

### 2. 작업 범위 — 메시지 북마크와 채팅 사이드바만
- ChatSidebar 빈 상태 → 4상태 분기
- BookmarkPanel `MessageBookmarks` → 4상태 분기
- 장소 북마크(`PlaceBookmarks`)는 localStorage 기반이라 BE 로딩/에러 없음 → 변경 없음

### 3. `openapi-typescript` 도입 — 자동 생성만, 수동 타입은 보존
- `pnpm add -D openapi-typescript`
- `package.json` 스크립트 `openapi:gen` 추가 (대상 URL은 `OPENAPI_URL` 환경변수로 override)
- 초기 산출물 `src/types/openapi.ts` 커밋 (1470 lines)
- 기존 `src/types/api.ts`는 그대로 사용 — 점진 교체는 별도 작업

---

## 변경된 파일

| 파일 | 변경 |
|---|---|
| `src/stores/chatStore.ts` | `chatsLoading`/`chatsError` 신규 + `loadFromServer`에서 set, `friendlyApiError` 사용 |
| `src/stores/bookmarkStore.ts` | `messageBookmarksLoading`/`messageBookmarksError` 신규 + `loadFromServer`에서 set |
| `src/components/chat/ChatSidebar.tsx` | sessions가 비었을 때 loading skeleton / error+재시도 / empty 분기 |
| `src/components/bookmark/BookmarkPanel.tsx` | `MessageBookmarks`가 동일 4상태 분기 |
| `package.json` | `openapi:gen` 스크립트, `openapi-typescript` devDep |
| `src/types/openapi.ts` | **신규 자동생성** — BE OpenAPI 3 스펙 → TypeScript |

---

## openapi-typescript 사용법

```bash
# 기본 (dev BE)
pnpm openapi:gen

# 다른 BE 대상
OPENAPI_URL=http://localhost:8000/openapi.json pnpm openapi:gen
```

산출물(`src/types/openapi.ts`)에서 끌어쓰기 예시:
```ts
import type { components, operations } from '@/types/openapi';

// BE가 반환하는 정확한 응답 모양
type TokenResp = components['schemas']['TokenResponse'];

// 라우트 핸들러의 요청/응답 매핑
type LoginOp = operations['login_api_v1_auth_login_post'];
```

향후 `src/types/api.ts`를 이 자동생성 타입으로 점진 교체. 단 변환 어댑터
(`messageItemToMessage` 등)는 BE 모양과 FE 레거시 모양 사이 매핑이라 그대로 유지.

---

## 검증 결과

### 자동
- [x] `tsc --noEmit` 통과 (생성된 openapi.ts 포함)
- [x] `vitest run` — 13/13 tests passed
- [x] `pnpm openapi:gen` — 189ms, 45KB 결과 생성

### 브라우저 수동 (BE 영속화 풀린 후 검증)
- [ ] 로그인 직후 사이드바: skeleton → 리스트 (또는 empty/error)
- [ ] 사이드바 BE 실패: "다시 시도" 버튼 클릭 → 재로드
- [ ] BookmarkPanel "대화" 탭: 동일 4상태 동작

---

## 마무리

5개 phase 작업이 모두 끝났습니다. 산출물:

| 분류 | 항목 |
|---|---|
| **infra** | vite proxy (`/api`, `/health`, `/shared`) |
| **인증** | `friendlyApiError`/`friendlyAuthError` 헬퍼, 422 한글 변환 |
| **chat** | `loadFromServer`/`loadSession`/`deleteSession`/`renameSession` BE 통합, 4상태 UI |
| **bookmark** | 메시지 북마크 BE 통합 (장소 북마크는 보류), 4상태 UI |
| **share/calendar** | 코드 검토 완료, 에러 한글화 |
| **type 자동화** | `openapi-typescript` + `openapi:gen` 스크립트 |
| **차단/이슈** | `/chat/stream` 영속화, `message_id` integer, DELETE 307, Calendar `client_id` |

BE 이슈 3건 해결되면 라이브 검증 후 prod 머지 가능 상태.
