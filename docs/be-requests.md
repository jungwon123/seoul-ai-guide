# BE 요청 사항 정리

FE 작업 중 발견한 BE 측 변경/요청 사항. 각 항목은 **발생 시점, 증상, 원인, 요청, 우선순위, 상태**로 정리.

---

## 1. Google Calendar OAuth 환경변수 (Resolved)

**상태**: 🟢 BE 작업 완료 (PR #69 머지됨, 2026-05-13)

**증상**: 캘린더 연동 클릭 시 Google에서 "Error 400: invalid_request — Missing required parameter: client_id"

**원인**: BE의 OAuth URL 생성 시 `settings.google_calendar_client_id`가 빈 값. GCE dev BE 서버(`http://34.22.91.75:8000`) 환경변수에 `GOOGLE_CALENDAR_*` 3개가 미설정.

**BE 변경 (PR #69 `f5a7197`)**:
- `.github/workflows/deploy-dev.yml`에 GitHub Secrets로부터 환경변수 3개 자동 주입 + BE 재시작
  - `GOOGLE_CALENDAR_CLIENT_ID`, `_SECRET`, `_REDIRECT_URI`
- `google_calendar_auth.py`에 client_id 미설정 시 503 명시적 반환 (디버깅 친화)
- `80a1390` 추가 커밋: env upsert로 변경 (기존 값도 갱신)

**FE 측 작업 완료**:
- GCP Console "승인된 리디렉션 URI"에 `https://seoul-ai-guide.vercel.app/api/v1/auth/google/calendar/callback` 등록

**확인 필요**: dev 머지 후 자동 배포가 통과했는지 → 캘린더 연동 시도해서 동작 확인.

---

## 2. References 블록 필드명 통일 (Active)

**상태**: 🔴 BE팀 요청 필요. FE 폴백 적용해서 임시 동작.

**증상**: 채팅 응답의 "추천 사유 / 인용" 카드가 비어 보임 (`""` 빈 따옴표만 표시).

**원인**: 인텐트별로 references 블록 필드명이 다름:
- **BE Pydantic 스키마** (`backend/src/models/blocks.py:255`):
  ```python
  class ReferenceItem(BaseModel):
      source_type: str = ""
      source_id: Optional[str] = None
      snippet: str = ""
      url: Optional[str] = None
  ```
- **EVENT_RECOMMEND/EVENT_SEARCH 실제 응답** (필드명 다름):
  ```json
  {"title": "개포2문화센터", "url": "...", "source": "서울시시설대관"}
  ```

→ FE는 `source_type`/`snippet` 기대 → BE가 `source`/`title` 보냄 → 빈 표시.

**요청**: EVENT_RECOMMEND/EVENT_SEARCH 노드도 표준 `ReferenceItem` 스키마(`source_type`/`snippet`) 따르도록 통일.

**FE 측 임시 대응**: `src/components/chat/blocks/ReferencesBlock.tsx`의 `normalizeRef`가 두 변형 모두 흡수. BE 통일 후 폴백 제거.

---

## 3. Places 블록에 congestion 필드 (Resolved)

**상태**: 🟢 BE 작업 완료 (PR #70 OPEN, dev 머지 대기). FE 어댑터 사전 적용 완료.

**증상**: PlaceCard의 혼잡도 뱃지, 지도 혼잡도 오버레이가 실 BE 데이터로 동작 안 함 (mock에서만 동작).

**원인**: BE의 `PlaceBlock` 스키마에 혼잡도 필드 없음.

**BE 변경 (PR #70 `fd6cf98`, `47782b8`)**:
- `CongestionInfo` Pydantic 모델 신규 — **3단계** (`low`/`medium`/`high`), FE 요청 그대로 반영
- `PlaceBlock.congestion: Optional[CongestionInfo]` 필드 추가
- `crowdedness_node.py`에 `fetch_congestion_by_district(pool, district)` 헬퍼 추가 — area_proxy 폴백
- `place_search_node.py` / `place_recommend_node.py`에 congestion 주입 로직: district 유니크 추출 → 병렬 fetch → 각 place에 매핑, 실패 시 graceful
- `_classify_level` 함수에서 매우혼잡 등급 제거, 3단계로 통합 (한산/보통/혼잡)
- 별도 커밋 `47782b8`로 매우혼잡 테스트 케이스 제거

**FE 측 사전 작업 완료**:
- `src/types/api.ts`: `CongestionBlockInfo` 타입 추가, `PlaceBlockData.congestion?` 필드 추가
- `src/stores/chatStore.ts`: `singlePlaceBlockToPlace` 어댑터가 BE `updated_at` (snake_case) → FE `updatedAt` (camelCase) 변환
- 기존 mock 데이터(`updatedAt` 직접 들어옴) 폴백도 흡수
- PR #70 머지 후 FE 추가 작업 없이 자동 활성화

**확인 필요**: PR #70 머지 → dev 자동 배포 → 사용자 측에서 "강남 카페 추천해줘" 같은 추천 받아서 PlaceCard에 혼잡도 뱃지 / 지도 혼잡도 오버레이 실데이터로 표시 확인.

---

## 4. EVENT 블록 lat/lng 공식 스키마 추가 (Active)

**상태**: 🔴 BE팀 요청 필요. FE는 비공식 필드를 optional로 흡수 중.

**증상**: EVENT_RECOMMEND 응답으로 받은 행사들이 지도에 마커로 안 떴음 (현재는 픽스 완료, 단 fragile).

**원인**: BE Pydantic `EventItem` 스키마에는 `lat`/`lng` 없음. 하지만 BE 실제 응답엔 `lat`/`lng` 들어와 있음 (비공식).

**요청**: `EventItem` 스키마에 `lat`/`lng` 공식 추가 + 다음 필드명 정합성도 확인:
```python
class EventItem(BaseModel):
    event_id: str
    title: str
    # ...
    lat: Optional[float] = None  # ← 공식 추가
    lng: Optional[float] = None  # ← 공식 추가
```

**추가 확인 필요한 EventItem 필드명 불일치**:
- BE 스키마: `start_date`, `end_date`, `image_url`, `homepage_url`
- BE 실제 응답: `date_start`, `date_end`, `poster_url`, `detail_url`

→ 스키마와 실제 응답의 필드명 정합 통일 요청.

**FE 측 대응**: `EventItem` 타입에 `lat?`/`lng?` optional 추가 (`src/types/api.ts:154-155`). 다른 필드 차이는 미반영 — 정합 필요.

---

## 5. Thread Title 자동 생성 (Active)

**상태**: 🟢 FE 우회 적용 중. BE 진짜 픽스 권장.

**증상**: 대화 사이드바에 새 대화 제목이 "새 대화"로 고정.

**원인**: BE가 thread 생성 시 자동으로 title을 안 매김 (`sse.py:127`에서 기본값 "새 대화" 하드코딩). `ChatListItem.title === null` 반환 → FE가 fallback으로 "새 대화" 표시.

**요청**: 첫 user 메시지 받을 때 BE가 자동으로 thread.title 생성 (LLM 1-shot 요약 권장 — 예: "광장시장 맛집 추천").

**FE 측 임시 대응**: `src/stores/chatStore.ts`의 `sendMessage`에서 첫 메시지 후 `chatsApi.rename(sessionId, generatedTitle)` 호출. 단순 자르기 품질이라 BE LLM 요약이 더 나음.

**BE 자동 생성 도입 시**: FE의 `existingIdx < 0 && acc.length > 0` 블록 제거.

---

## 6. Course `photo_url` 채우기 (Future)

**상태**: 🔵 BE Phase 2 작업. 우선순위 낮음.

**증상**: 코스 카드 정거장 이미지가 비어 보임 (회색 박스 + 카테고리 첫 글자).

**원인**: BE `CoursePlaceInfo.photo_url`이 Phase 1에서 미구현 (`blocks.py`에 "Phase 1 생략" 주석).

**요청**: BE Phase 2 작업 때 Google Places photo API 또는 자체 이미지 DB로 채우기.

**FE 측 대응**: photo_url 없으면 카테고리 첫 글자 + 컬러 배경으로 그레이스풀 폴백 표시 중.

---

## 7. CROWDEDNESS 전용 시각화 블록 (Future)

**상태**: 🔵 선택적. 현재 텍스트 응답으로 동작은 함.

**현재 상태**: CROWDEDNESS 인텐트는 `text_stream`만 emit. 사용자가 "강남 지금 혼잡해?" 물으면 텍스트로 답변. 시각화(게이지/차트) 없음.

**요청 (선택)**: CROWDEDNESS 응답에 구조화 블록 추가:
```python
{
  "type": "crowdedness",
  "area": "강남구 역삼동",
  "level": "high",
  "ratio": 1.35,
  "current_population": 12500,
  "avg_population": 9250,
  "updated_at": "2026-05-13T14:32:00+09:00",
  "is_stale": false
}
```

→ FE에 큰 게이지 카드 / 차트 추가 가능.

**우선순위**: 낮음 (#3의 places-level congestion이 더 효율). 추후 강화.

---

## 8. Category 한글↔영문 매핑 (Resolved — FE 흡수)

**상태**: 🟢 FE 폴백 적용 완료. BE 통일은 nice-to-have.

**현상**: BE가 place.category를 한글로 보냄("쇼핑", "관광지" 등). FE는 영문 enum 기대 (`tourism`/`shopping`/`culture`/`food`).

**FE 측 대응**: `src/lib/utils.ts`의 `normalizeCategory(raw)` 유틸이 한글/영문 모두 매핑.
- food: 음식/맛집/카페/식당/술집/주점/...
- shopping: 쇼핑/쇼핑몰/상점/...
- culture: 문화/공연/전시/박물관/...
- tourism: 관광/공원/명소/...

**(선택) BE 요청**: BE가 category를 영문 enum으로 통일하면 FE 폴백 제거 가능. 우선순위 낮음.

---

## 9. 대화 북마크 422 — DoneBlock에 message_id 추가 (Active)

**상태**: 🔴 BE 요청 필요. 현재 응답 직후 북마크 시 422 발생.

**증상**: 사용자가 응답 받자마자 북마크 누르면 **422 Unprocessable Entity**. 새로고침/탭 전환 후엔 정상.

**원인**:
- `BookmarkCreateRequest.message_id: int` (BE schema)
- FE는 SSE 응답 후 BE에 저장된 메시지의 진짜 `message_id`를 알 방법이 없어서, fresh local string id(`"msg-1234567890-agent"`)를 그대로 보냄
- Pydantic int validation 실패 → 422
- 새로고침하면 `loadFromServer`가 히스토리에서 real int id로 메시지 재로드 → 북마크 가능

**원인 파일**: `backend/src/models/blocks.py:308`의 `DoneBlock`에 `message_id` 필드 없음.

**요청**:
```python
class DoneBlock(BaseModel):
    type: str = "done"
    status: str = "done"
    error_message: Optional[str] = None
    message_id: Optional[int] = None       # ← 신규 (assistant 메시지 id)
    user_message_id: Optional[int] = None  # ← (선택) user 메시지 id
```

→ FE는 `done` 이벤트 받을 때 local agent 메시지의 `messageId`를 BE id로 즉시 교체. 사용자가 응답 직후 북마크해도 정상 동작.

**FE 측 작업 (BE 머지 후)**:
- `chatStore.ts`의 `done` 핸들러에서 `data.message_id`로 local 메시지 id 갱신 한 줄 추가.

---

## 10. 장소 북마크 BE API 신규 (Active)

**상태**: 🔴 BE 신규 작업 필요. 현재 FE는 localStorage만 사용.

**증상/현황**: 사용자가 PlaceCard ★ 누른 장소가 **현재 브라우저에만 저장**됨. 디바이스 간 동기화 X, 캐시 지우면 사라짐, 계정 따라가지 않음.

**원인**: BE에 장소 북마크 endpoint 미구현. 대화 북마크(`bookmarks` 테이블)는 메시지 컨텍스트 강제(`thread_id` + `message_id` 필수)라 장소 단독 북마크에 부적합.

**요청**: **별도 테이블 + 별도 endpoint 3종** 신규 구현.

### 엔드포인트 설계

**POST `/api/v1/users/me/place-bookmarks`** — 추가
```python
class PlaceBookmarkCreateRequest(BaseModel):
    place_id: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., max_length=200)
    # 시점 스냅샷
    category: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    rating: Optional[float] = None
    image_url: Optional[str] = None
    summary: Optional[str] = Field(None, max_length=500)
    # 발견 출처 (선택)
    source_thread_id: Optional[str] = None
    source_message_id: Optional[int] = None
```

**GET `/api/v1/users/me/place-bookmarks`** — 목록 (cursor 페이지네이션, `created_at DESC` 정렬)

**DELETE `/api/v1/users/me/place-bookmarks/{bookmark_id}`** — 삭제 (soft delete, 대화 북마크와 일관)

### DB 테이블

```sql
CREATE TABLE place_bookmarks (
  bookmark_id     BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(user_id),
  place_id        VARCHAR(100) NOT NULL,
  name            VARCHAR(200) NOT NULL,
  category        VARCHAR(50),
  address         TEXT,
  district        VARCHAR(50),
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  rating          REAL,
  image_url       TEXT,
  summary         TEXT,
  source_thread_id  VARCHAR(100),
  source_message_id BIGINT,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE(user_id, place_id)
);

CREATE INDEX idx_place_bookmarks_user_created
  ON place_bookmarks(user_id, created_at DESC)
  WHERE is_deleted = FALSE;
```

### 핵심 결정 사항

1. **`(user_id, place_id)` UNIQUE** — 중복 시 **idempotent 200 OK** 반환 권장 (FE 마이그레이션 친화)
2. **시점 스냅샷 보관** — places 테이블 데이터가 변해도(휴업/폐점/이름 변경) 북마크엔 영향 X
3. **`source_thread_id`/`source_message_id`** — 어느 대화에서 발견했는지 추적 (분석/UX, 선택)
4. **Soft delete** — 대화 북마크와 패턴 통일
5. **Auth** — JWT 필수, 비로그인은 401

### FE 측 작업 (BE 완성 후)

1. `src/lib/api.ts`에 `placeBookmarksApi` 추가 (대화 북마크 패턴 그대로)
2. `bookmarkStore.toggle`/`add`/`remove`에 BE 호출 + optimistic 패턴 (대화 북마크 `toggleMessage` 참고)
3. `loadFromServer`에서 장소 북마크 동시 fetch
4. 로그인 직후 기존 localStorage 데이터 → BE 일괄 migrate (idempotent라 안전)

---

## 11. 캘린더 OAuth callback — FE 페이지 redirect (Active)

**상태**: 🔴 BE 한 줄 수정 필요. 현재 사용자가 raw JSON 페이지 봄.

**증상**: 캘린더 연동 OAuth 흐름 자체는 정상 완료. 단, 마지막에 **`{"message":"Google Calendar 연동이 완료되었습니다."}` JSON이 그대로 브라우저에 표시**됨. FE의 "연동 완료" 페이지(`CalendarConnected`)가 안 보임.

**원인**: `backend/src/api/google_calendar_auth.py:175`
```python
return {"message": "Google Calendar 연동이 완료되었습니다."}
```
→ FastAPI가 dict를 JSON 응답으로 직렬화. 브라우저는 raw JSON 페이지 표시.

**요청**:
```python
from fastapi.responses import RedirectResponse

# 성공 시
return RedirectResponse(
    url="https://seoul-ai-guide.vercel.app/calendar/connected",
    status_code=302,
)

# 에러 시 (선택)
return RedirectResponse(
    url=f"https://seoul-ai-guide.vercel.app/calendar/connected?error={error_code}",
    status_code=302,
)
```

production / dev / local 환경별 FE base URL은 `FE_BASE_URL` 같은 환경변수로 분리 권장.

**FE 측**: `src/main.tsx:65`에 `<Route path="/calendar/connected">` 이미 존재. `?error=` 쿼리 파라미터 처리도 `CalendarConnected.tsx`에 완성됨. BE redirect만 추가되면 즉시 동작.

---

> **혼잡도(congestion) 연동 요청은 별도 문서로 분리**: `docs/be-request-congestion.md` 참고 (코스 stop congestion 주입 + 장소 congestion 데이터 점검).

---

## 해소된 이슈 (Resolved — 기록용)

### R1. text_stream 블록 필드명 (라이브 vs 저장본)
- BE 라이브 SSE: `delta`
- BE DB 저장본: `content`
- FE 어댑터가 `delta ?? content ?? ''` 로 둘 다 처리. 추가 BE 작업 불필요.

### R2. CourseStop nested 스키마
- BE: `{order, arrival_time, duration_min, place: {place_id, name, location: {lat,lng}}, transit_to_next, recommendation_reason}`
- FE 어댑터 재작성으로 정합 완료. BE 변경 불필요.

### R3. map_route 스키마
- BE: `{bounds, center, suggested_zoom, markers[], polyline: {type, segments[{from_order, to_order, mode, coordinates}]}}`
- FE 타입/렌더러 BE 스키마 따라 재작성. BE 변경 불필요.

---

## 부록 — BE 인텐트 ↔ 블록 컨트랙트 정리

발견한 BE 송출 패턴 (BE팀 표준 컨트랙트와 차이 있을 수 있음):

| 인텐트 | 블록 | 좌표 |
|---|---|---|
| PLACE_SEARCH | `intent` → `text_stream` → `places` → `map_markers` → `done` | ✅ |
| PLACE_RECOMMEND | `intent` → `text_stream` → `places` → `map_markers` → `references` → `done` | ✅ |
| EVENT_SEARCH | `intent` → `text_stream` → `events` (+optional `references`) → `done` | ⚠️ 비공식 |
| EVENT_RECOMMEND | `intent` → `text_stream` → `events` → `references` → `done` | ⚠️ 비공식 |
| COURSE_PLAN | `intent` → `text_stream` → `course` → `map_route` → `done` | ✅ |
| DETAIL_INQUIRY | `intent` → `text_stream` → `place` (단건) → `done` | ✅ |
| BOOKING | `intent` → `text_stream` → `done` | — |
| CALENDAR | `intent` → `text_stream` → `calendar` → `done` | — |
| FAVORITE | **미구현 → GENERAL 폴백** | — |
| REVIEW_COMPARE | `intent` → `text_stream` → `chart` → `analysis_sources` → `done` | — |
| ANALYSIS | `intent` → `text_stream` → `analysis_sources` → `done` | — |
| COST_ESTIMATE | **미구현 → GENERAL 폴백** | — |
| CROWDEDNESS | `intent` → `text_stream` → `done` | — |
| IMAGE_SEARCH | `intent` → `text_stream` → `place` / `places` / `disambiguation` → `done` | ✅ (place/places 시) |
| GENERAL | `intent` → `text_stream` → `done` | — |
