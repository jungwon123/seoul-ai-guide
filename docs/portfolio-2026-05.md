# 포트폴리오 — 서울 관광 AI 에이전트 (LocalBiz) FE 작업 정리

**프로젝트**: 서울 관광 AI 에이전트 (Vite + React + TypeScript + Zustand + Google Maps + Three.js)
**역할**: Frontend 전반 (SSE 채팅, 지도, 인터랙션, BE 연동, 성능)
**기간**: 2026-05-13 ~ 2026-05-26 (약 2주)
**PR**: 26건 머지 (#64 ~ #89)

---

## 0. 한눈에 보는 결과 요약

| 영역 | 핵심 임팩트 |
|---|---|
| 3D 지도 성능 | 진입 시 메인 스레드 블로킹 5-20s → 1s 이내 / 외부 API 호출 ~1000회/세션 → 0~1회 |
| 인터랙션 폴리시 | GSAP 도입 6개 신규 효과 (stagger reveal, FLIP, ScrollTrigger, spring) |
| BE 신규 API 연동 | 일정 탭(Google Calendar 직조회), 장소 북마크, 이미지 업로드 — 7개 엔드포인트 |
| 데이터 일관성 버그 | 채팅↔지도 카테고리 불일치, 폴리라인 즐겨찾기 포함, MapBlock 카테고리 누락 등 5건 수정 |
| Prod 누출 차단 | MSW Service Worker 잔존 + mock JSON import 4곳 가드 → 실사용자 데이터로만 동작 |
| 인프라 대응 | BE Ephemeral IP 폐기 → Static IP 마이그레이션, Vercel 4.5MB 우회 |
| 코드 정리 | 미사용 코드 ~120줄, mock 의존 7곳 제거 |

---

## 1. 3D 지도 성능 최적화 — 5초 동결을 1초 안으로

### Situation
초기 3D 지도(Three.js + OSM Overpass) 가 코스 추천을 받은 직후 "3D 보기" 토글을 누르면 **수 초간 UI 가 얼고 카메라 조작 불가**. 사용자 입장에서 "고장난 줄" 느낌. 외곽 자치구는 종종 빈 채로 표시.

### Task
- 빌딩 데이터 fetch + geometry 빌드 + 렌더 파이프라인 전체에서 병목 식별
- 외부 Overpass API 의존도 낮추기
- 메인 스레드 블로킹 제거

### Action

#### 병목 분석
| 단계 | 측정 비용 | 메인 스레드 블로킹 |
|---|---|---|
| WebGL/Scene 초기화 | 200-500ms | once |
| Ground OSM 타일 9-16장 fetch | 1-3s | 비동기 |
| **Building Overpass fetch** | 200ms ~ 30s (cold) | 비동기 |
| **Building geometry 빌드 (수천 동 × ExtrudeGeometry)** | **5-20s** | 🔴 **메인 블로킹** |
| Place marker (Group 3 mesh/place) | 100-300ms | 블로킹 (소) |

#### 검토한 옵션
| 옵션 | 장점 | 단점 |
|---|---|---|
| A. Building 빌드를 Web Worker 로 | 메인 스레드 영향 0 | three.js 가 worker 친화적 아님, 메시지 직렬화 비용 |
| B. Chunked async + setTimeout(0) yield | 구현 단순, 즉시 효과 | worker 만큼 빠르진 않음 |
| C. Building 자체를 안 그리고 마커만 | 부담 0 | 3D 의미 자체가 약해짐 |
| D. Google Photorealistic 3D Tiles 교체 | 모든 부담 Google 이 흡수 | 신 기술/비용/API 권한 |

#### 선택: B (즉시) → 이후 D (재설계 문서) 로 단계화
- B: ROI 가장 큼. Web Worker 보다 임팩트 70% 정도지만 구현 비용 1/10.
- chunked async + 거리 컬링(1.5km) + 마커 InstancedMesh 3종 통합을 한 PR 에 묶음
- C 는 디자인이 "3D 도시 느낌" 의 의미를 잃어서 채택 안 함
- D 는 비용/권한 협의 필요 → 별도 설계 문서로 남겨 컨펌 받는 흐름

#### 구현 (PR #79, #80, #84)
- **PR #68**: viewport 단위 빌딩 fetch 폐기 → 코스 stop 좌표 반경 500m 만 fetch
- **PR #69**: 자치구 25개로 데이터 분할, **IndexedDB 영구 캐시 (TTL 30일)** 직접 작성
- **PR #70**: 자치구 polygon GeoJSON (서울 열린데이터 기반 54KB) + ray-casting point-in-polygon 으로 좌표→자치구 정확 매핑
- **PR #79**: chunked async (200개씩 yield) + cancel 토큰 (buildGeneration) + 거리 컬링 + 마커 InstancedMesh
- **PR #80**: OSM 타일 영구 캐시 (Cache API + ImageBitmap), 코스 응답 시점 백그라운드 prefetch
- **PR #84**: target stop 빌딩만 빨강 + 가까운 N개 파랑 + CSS2DRenderer 라벨 → 렌더 빌딩 수 1000 → 11

### Result
| 지표 | 이전 | 이후 |
|---|---|---|
| 첫 진입 시 메인 스레드 블로킹 | **5-20s** | **<1s** (chunked yield) |
| 진입 후 카메라 조작 반응성 | freeze 동안 입력 무시 | 빌드 중에도 반응 |
| Overpass live 호출 / 코스 1회당 | 모든 stop × N (~5-10회) | 첫 자치구 1회, 이후 IDB hit |
| 두 번째 진입 (재방문) ground 로딩 | 1-3s OSM 재요청 | <100ms (Cache API hit) |
| Focus 모드 렌더 빌딩 수 | 수백 ~ 수천 | **11개** (target + 10) |
| 사용자 시선 유도 (target 식별) | 색 다양해 분간 어려움 | 빨강 + 라벨로 즉시 |

추가로 자치구 정적 JSON ship 빌드 스크립트(`scripts/build-district-buildings.mjs`) 작성 — Overpass 접근 가능한 환경에서 25개 자치구 사전 데이터 생성 가능. 후속 작업 인프라.

### Trade-off / 한계
- **자치구 polygon 은 단순화된 GeoJSON** — 매우 좁은 경계 케이스에선 잘못된 자치구로 매핑 가능. centroid fallback 으로 완화
- **Three.js 유지** — 재설계 옵션(Google Photorealistic 3D Tiles, PR #88 문서) 제시했지만 비용/권한 협의 필요해 이번 사이클은 보류

---

## 2. SSE 채팅 흐름 개선 — 답변 받자마자 동작하도록

### Situation
BE 가 SSE 로 토큰 스트리밍하는 동안 FE 가 진행 상태를 알릴 수 없었고, 답변이 도착해도 **북마크/피드백/공유 버튼이 새로고침 전까지 안 보이는 버그** + **저장 클릭 시 422 에러**. 사용자가 "방금 받은 답변을 저장하려는데 안 됨" 경험.

### Task
- 진행 상태 메시지 표시
- 어시스턴트 메시지가 BE 에 저장되자마자 클라이언트 ID 와 BE ID 동기
- 저장 호출 시 정수 ID 보장

### Action

#### 원인 분석 (PR #65, #77)
- BE PR #81 에서 SSE `done` 이벤트에 `message_id` 추가했는데 FE 핸들러가 무시
- `MessageBubble.handleBookmark` 가 `message.id` (FE 로컬 string `"msg-..."`) 를 BE 로 그대로 전송 → 정수 파싱 실패 422

#### 검토한 옵션
| 옵션 | 장점 | 단점 |
|---|---|---|
| A. 메시지 전송 → BE 저장 → 응답으로 ID 받기 (별도 API) | RESTful | 라운드트립 추가, 스트리밍과 어긋남 |
| B. SSE done 에 ID 끼워 보내기 (BE 협의 후 FE 캡처) | 1 round-trip, 자연스러움 | BE 변경 필요 (이미 됨) |
| C. FE 가 받은 직후 별도 GET 으로 messageId 매칭 | 단순 | 추가 API, latency |

#### 선택: B
- BE 가 이미 done.message_id 보내고 있어서 FE 만 수정하면 됨
- 가장 적은 작업, 가장 자연스러운 UX

#### 구현
- **PR #65**: `DoneBlock.message_id?: number` 타입 + chatStore `done` 핸들러에서 `beMessageId` 캡처 → `agentMsg.messageId` 에 우선 적용
- **PR #76**: `currentStatus` state 추가, `status` 핸들러에서 BE 진행 메시지 ("코스를 계획하고 있어요...") 캡처 → TypingIndicator 에 표시. `text_stream` 첫 delta 도착 시 자동 클리어
- **PR #77**: `MessageBubble` 이 `message.id` 대신 `message.messageId` (BE int) 사용. 액션 행 가드 조건도 `typeof messageId === 'number'` 로 강화
- **PR #87**: TypingIndicator `··· 텍스트` → `텍스트 ···` 순서 변경, BE 메시지 trailing "..." regex 제거

### Result
| 지표 | 이전 | 이후 |
|---|---|---|
| 답변 받자마자 저장 클릭 → 422 | 발생 | 정상 동작 |
| 저장/피드백/공유 버튼 첫 노출 시점 | 페이지 새로고침 후 | 즉시 |
| TypingIndicator 진행 정보 | 점 3개만 (의미 X) | "코스를 계획하고 있어요" 등 단계 표시 |

### Trade-off
- `message.messageId` 가 number 아닐 때 액션 행 전체를 hide — 일관성 우선. (이전엔 클릭 후 422 토스트가 돼서 UX 더 나쁨)
- BE 가 `done.message_id` 안 보내는 케이스는 fallback (로컬 ID) 이지만 그 경우 액션 행은 숨김. 운영상 BE 가 보내는 게 정상이라 영향 미미

---

## 3. 인터랙티브 폴리시 — GSAP 3단계 도입

### Situation
정적 CSS keyframe 으로만 구성된 UI → 답변 카드가 한꺼번에 페이드인, 사이드바는 linear translateX, 북마크 토글은 색만 바뀜. "비싸 보이지" 않음.

### Task
바닥부터 라이브러리 도입해서 ROI 큰 효과부터 정착시키기.

### Action

#### 검토한 옵션
| 옵션 | 장점 | 단점 |
|---|---|---|
| A. Framer Motion | React 친화, declarative | 번들 무거움 (~50KB), declarative 한계 |
| B. GSAP + @gsap/react | 강력함, ScrollTrigger/FLIP 무료 | imperative 라 React 와 결합 주의 필요 |
| C. CSS keyframe 더 정교화 | 의존성 0 | 복잡한 timeline / FLIP / scroll trigger 표현 어려움 |

#### 선택: B (GSAP)
- ScrollTrigger / FLIP 같이 CSS 로 못 하는 효과 다 가능
- 번들 ~53KB gzipped (Lottie 이미 50KB 와 비슷한 비용)
- `useGSAP` hook 으로 cleanup 자동화

#### Phase 별 구현
- **Phase 1 (PR #71)**: MessageBubble 답변 자식 섹션 stagger reveal (text → places → itinerary → blocks → actions), ItineraryCard stops stagger
- **Phase 2 (PR #72)**: ChatSidebar `back.out(1.3)` spring 슬라이드, 북마크 ☆ 클릭 시 amber 파티클 6개 burst
- **Phase 3 (PR #73)**: PlaceCard 클릭 시 카드 클론이 지도 마커 위치로 축소·이동 (FLIP), ScrollTrigger 로 채팅 메시지 viewport 진입 시 fade-in-up
- **Hotfix (PR #74)**: 사이드바가 안 보이는 버그 — 원인은 React inline `style.transform` 과 GSAP 가 transform 소유권 경쟁. inline style 제거 + `useGSAP` first-run 가드로 해소

### Result
- **6개 신규 인터랙션** 추가 (목록 위)
- **prefers-reduced-motion 가드** 모든 진입점
- 사용자가 받는 "고급스러움" 차이 — 정성 평가지만 사이드바 spring + 북마크 파티클은 사용자 시연 시 가장 반응 좋음

### Trade-off / 학습
- **React inline style 과 GSAP transform 충돌** — Phase 2 직후 hotfix 로 학습. 이후로는 GSAP 가 transform 단독 관리하도록 inline style 안 쓰는 패턴 정착
- **FLIP cross-component** 은 단순히 두 컴포넌트 위치 알면 되는 게 아니라 두 패널 좌표계 매핑 필요 → Google Maps OverlayView projection 활용해서 lat/lng → px 변환 함수를 mapStore 에 등록하는 방식으로 해결
- 번들 비용 ~53KB → ROI 큰 효과 6개로 만회

---

## 4. BE 신규 API 연동 — 캘린더 / 장소 북마크 / 이미지 업로드

### Situation
3개의 BE 신규 엔드포인트가 동시에 들어옴. 각각 다른 UX 요구사항.

### Task
- **장소 북마크**: localStorage 단일 디바이스 → BE 동기화
- **일정 탭**: Google Calendar 직조회 + 우리 앱 만든 이벤트 구분 (source)
- **이미지 검색**: BE 가 query 텍스트에서 URL 파싱 → GCS 업로드 후 URL 끼우는 흐름

### Action

#### 4-1. 장소 북마크 (PR #66)

검토:
| 옵션 | 트레이드오프 |
|---|---|
| A. localStorage 만 (기존) | 빠르고 BE 무관, 단 디바이스 간 동기 안 됨 |
| B. BE 전면 동기 (localStorage 폐기) | 일관성 보장, 비로그인/네트워크 실패 시 무동작 |
| C. 하이브리드 — optimistic local + BE sync | 즉시 반응 + 다음 loadFromServer 에서 진실 복원 |

선택: C. `placeBookmarkIds: Record<place_id, BE bookmark_id>` 추가 → toggle/add/remove 가 fire-and-forget BE 호출, 실패는 silent 후 진실은 다음 fetch 에서 자연 복원. loadFromServer 에서 `Promise.allSettled` 로 메시지/장소 북마크 병렬 fetch.

결과:
- 디바이스 간 북마크 동기 가능
- UI 시그니처 유지 → PlaceCard/PlaceCarousel/PlaceOverlayItem/BookmarkPanel 사용처 수정 0
- 비로그인/네트워크 실패 시 silent fallback (로컬 캐시)

#### 4-2. 일정 탭 — Google Calendar 직조회 (PR #82)

이전엔 BE 에 조회 엔드포인트 자체가 없어서 일정 탭이 항상 "일정 없음". 채팅 → BE Google Calendar API 로 이벤트 생성은 되는데, FE 측에선 그 이벤트 다시 못 봄.

검토:
| 옵션 | 트레이드오프 |
|---|---|
| A. FE 단독 localStorage 미러 (calendar SSE 블록 → store) | BE 변경 0, 디바이스/외부 변경 동기 안 됨 |
| B. BE GET /events (Google 직조회) | Google 이 진실, 외부 수정도 반영, BE 작업 작음 |
| C. BE 자체 DB 저장 + Google 양방향 | 풍부한 메타 보존, BE 작업 큼, 동기 코스트 |

→ BE 요청 문서 작성 (PR #81). BE 가 **옵션 B** 채택해서 신규 엔드포인트 만듦.

FE 구현:
- 4상태 분기: 비로그인 / **notConnected (403)** / loading / error (재시도) / empty / populated
- `source==='localbiz'` 인 이벤트만 "LocalBiz" 배지 표시 (BE extendedProperties 활용 — 우리가 요청 문서에서 제안한 방식)
- 삭제 → optimistic + BE DELETE → 실패 시 롤백

결과: 일정 탭이 살아남. 사용자 다른 기기에서도 동일하게 보임.

#### 4-3. 이미지 검색 UI (PR #82, #89)

상황: BE `image_search_node` 가 query 텍스트에서 https URL regex 파싱. 사용자 사진은 핸드폰 안에 있는데 URL 이 없음.

검토 (4가지 옵션 문서 작성 후 BE 와 합의):
| 옵션 | 결정 |
|---|---|
| A. BE 가 multipart 업로드 받고 GCS 저장 후 URL 반환 | **채택** — 가장 정석, FE 단순 |
| B. Presigned URL (FE 가 직접 S3 PUT) | BE 트래픽 절약하지만 BE 작업 비슷 |
| C. 외부 호스팅 (Cloudinary 등) | 외부 의존/프라이버시 |
| D. base64 data URL | DB 비대화 위험 |

BE: `POST /api/v1/upload/image` (multipart) → `{ image_url, expires_in_seconds: 3600 }`.

FE 구현:
- ChatInput 좌측 사진 아이콘 + `<input type="file" capture="environment">` (모바일 카메라 직접 호출)
- 클라이언트 검증 (jpg/png/webp, 10MB) — 서버 422 도달 전 차단
- 미리보기 thumbnail + 업로드 spinner + cleanup effect (blob URL revoke)
- 텍스트 없이 사진만 → "이 사진과 비슷한 곳 추천해줘" auto-prefix
- 받은 image_url 을 chat query 본문에 `\n{url}` 끼움 (BE regex 파싱)

후속 (PR #89): prod 에서 4-10MB 사진 업로드 시 **413 발생**. 원인은 **Vercel proxy 의 4.5MB body limit**. BE 가 vercel.app CORS 허용해 둠 → uploadApi 만 절대 BE URL 직접 호출로 우회.

```ts
const UPLOAD_BASE = (import.meta.env.VITE_UPLOAD_BASE) ??
  (import.meta.env.DEV ? '' : 'https://34.50.44.75.nip.io');
```

### Result
3개 엔드포인트 모두 prod 동작. 사용자 디바이스 간 일관 + 큰 사진 업로드 성공.

### Trade-off
- **장소 북마크 fire-and-forget**: BE 실패 시 UI 는 성공처럼 보이고 다음 새로고침에서 진실 복원. 짧은 불일치 허용 → 즉각적인 반응성 우선
- **이미지 업로드 Vercel 우회**: prod 에서만 절대 URL. dev 는 vite proxy 유지 → 환경별 다른 라우팅이라 작은 mental overhead. 환경 변수로 덮어쓰기 가능하게 해서 향후 BE IP 변경 대응

---

## 5. 데이터 일관성 / 채팅↔지도 시각 동기

### Situation
사용자가 "채팅에서는 5개가 다 관광인데 지도에서는 2개 관광 + 3개 문화" 라는 정확한 버그 리포트. UI 두 군데가 같은 데이터를 다르게 보여줌 → 신뢰도 손상.

### Task
세 군데 (채팅 ItineraryCard / 지도 ItineraryStopsList / 지도 마커) 가 같은 우선순위로 카테고리 결정하도록.

### Action

**원인 분석 (PR #75)**: 세 경로가 카테고리 소스를 다르게 사용 중.
| 컴포넌트 | 사용하던 소스 |
|---|---|
| ItineraryCard (채팅) | `mocks/places.json` 만 (BE stop.category 무시) |
| ItineraryStopsList (지도) | `stop.category ?? 'tourism'` |
| GoogleMap 마커 | `mapStore.getPlacesForItinerary` — mock 매칭 우선 → 없으면 stop.category |

→ 같은 stop 의 카테고리가 경로마다 다르게 결정됨.

#### 해결 — 공통 helper 통일
```ts
// lib/stop-category.ts
function deriveStopCategory(stop) {
  if (stop.category) return stop.category;          // 1) BE normalize
  const mock = ALL_PLACES.find(p => p.id === stop.placeId);
  if (mock) return mock.category;                    // 2) mock fallback
  return 'tourism';                                  // 3) default
}
```

세 사용처 모두 이 helper 호출. mapStore 의 mock 매칭 path 도 매칭된 객체의 category 를 derive 결과로 override.

#### MapBlock 카테고리 (PR #86) — 별도 발견

채팅 인라인 미니맵의 핀이 다 같은 색. BE `MarkerItem` 이 `{place_id, lat, lng, label}` 만 들고 카테고리 없음 → `category: 'tourism'` 하드코딩.

→ BlockRenderer 에 `places?: Place[]` prop 추가, MapBlock 이 `place_id` 로 lookup 해서 같은 메시지의 풍부한 Place 정보 (카테고리/이미지/이름) 복원.

#### 폴리라인 즐겨찾기 제외 (PR #83) — 함께 발견

코스 폴리라인이 즐겨찾기 핀까지 갈지자로 이어짐. 원인은 `routeMarkers = markers.filter(p => !p.isBookmark)` 누락. 한 줄 수정.

### Result
| 케이스 | 이전 | 이후 |
|---|---|---|
| 같은 stop 의 채팅 카드 vs 지도 마커 색 | 다름 | 동일 |
| 채팅 미니맵 핀 색 | 항상 tourism | 카테고리별 다름 |
| 코스 폴리라인 | 즐겨찾기까지 이어짐 | 코스 stop 만 연결 |

### Trade-off
- **mock fallback 유지**: SSE 가 category 안 보낼 가능성 / 레거시 mock 일정 호환 위해. 완전히 BE-only 로 가면 fallback 없어 깨질 수 있음 → 안전망 유지

---

## 6. 프로덕션 mock 데이터 누출 차단

### Situation
배포된 prod 사이트에서 사용자가 "왜 자꾸 mock 장소가 보이지?" 호소. 사용자가 로그인하고 채팅 안 했는데도 일정/북마크/장소 카드가 떠있음.

### Task
4가지 누출 경로 식별 + 차단.

### Action

#### 원인 4가지

1. **MSW Service Worker 잔존** (가장 흔한 원인)
   - `main.tsx` 의 unregister 분기가 DEV 에서만 동작. 과거 dev 방문 시 등록된 `mockServiceWorker.js` 가 prod 페이지의 fetch 까지 가로채서 mock 응답 반환
2. **BookingPanel** — `bookings = bookingsData as Booking[]` 직접 import
3. **bookmarkStore** — `DEFAULT_PLACE_IDS = ['place-001'...]` 신규 사용자 시드
4. **MapPanel** — `congestionPoints` 가 mock places.json 의 혼잡도 데이터로 heatmap 그림

#### 검토한 옵션
| 옵션 | 트레이드오프 |
|---|---|
| A. mocks/* JSON import 전면 폐기 | 깔끔, 단 코드 변경 큼 (lookup table 용도까지 영향) |
| B. import.meta.env.DEV 가드 | 작은 diff, 명시적, 후속 정리 가능 |
| C. CI 검사 추가 | 미래 누출 방지, 즉시 효과 없음 |

#### 선택: B (즉시) + C (별도)
- MSW: `!import.meta.env.DEV || VITE_DISABLE_MSW === 'true'` 둘 다에서 SW unregister → 과거 잔존 SW 가 다음 prod 진입 시 자동 정리
- BookingPanel/bookmarkStore/MapPanel: `import.meta.env.DEV ? mock : 빈/empty`
- mock JSON lookup 용도(places.json 을 placeId→Place 변환 fallback 으로 사용) 는 의도적 보존 — placeBookmarkItemToPlace 같은 곳에선 필요

### Result
| 누출 경로 | 차단 |
|---|---|
| MSW SW | prod 진입 시 명시적 unregister |
| Mock bookings | EmptyState 표시 |
| 시드 4 북마크 | 빈 배열로 시작 |
| Mock 혼잡도 heatmap | 빈 배열, 진짜 BE 데이터로 대체 (PR #85) |

### Trade-off
- **mocks/*.json import 완전 제거 안 함**: lookup table 용도라 화면엔 안 나오고 번들에만 포함. 후속 정리 후보로 남김 (코드 변경 큰 작업이라 별도 우선순위)

---

## 7. 혼잡도 시각화 — DEV 모드에서만 보이던 heatmap 을 prod 활성화

### Situation
PlaceCard 의 한산/보통/혼잡 pill 은 prod 동작 중이지만, **지도 자체에는 혼잡도 시각 없음**. 카드 안 봐도 알 수 있게 만드는 게 목표.

### Task
지도 마커 + heatmap 모두 실제 BE 데이터 기반으로 prod 작동.

### Action (PR #85, 워크트리 병렬 에이전트)

#### 검토
| 옵션 | 트레이드오프 |
|---|---|
| A. 마커에 작은 색 점 (도장) | 가벼움, 즉시 인지 |
| B. heatmap circle overlay (toggle) | 영역 단위 직관, 토글 비용 |
| C. 마커 자체 색을 카테고리 대신 혼잡도로 | 카테고리 정보 손실 |
| D. 둘 다 (A+B) | 정보량 풍부, 시각 복잡 가능 |

#### 선택: A + B
- 마커 좌하단 14px 점 (항상) + heatmap 토글 (필요 시) — 두 정보 레이어 분리
- 색은 PlaceCard pill 과 같은 토큰 (`CONGESTION_CONFIG`) — 카드↔지도 시각 일치

#### 구현 (병렬 에이전트 + 워크트리 분리)
사용자 요청으로 "워크트리 분리해서 동시 진행" → `Agent isolation: worktree` 로 백그라운드 에이전트 spawn. 본 워크트리에서는 3D focus 작업 진행, 에이전트는 혼잡도 구현 → PR 생성. 메인 에이전트가 review 후 머지.

이전 `import.meta.env.DEV ? mock : []` 가드 제거 → `displayMarkers.filter(p => !!p.congestion)` 로 실데이터 기반.

### Result
- prod 에서 마커 좌하단 색 점 + heatmap circle 모두 실제 BE 데이터로 동작
- `placesData` mock import 1곳 더 제거 (번들 슬림)
- 워크트리 병렬 작업 → 메인 흐름 안 끊고 ~3분만에 완료

### Trade-off
- **heatmap 반경 고정 (low 150m / medium 250m / high 400m)**: BE 가 area_proxy 단위로 보내는데 실제 동네 크기랑 어긋날 수도. 충분히 작은 차이라 무시
- **워크트리 분리 작업**: 메인이 진행하던 3D focus 작업 + 에이전트 혼잡도가 같은 파일(MapPanel.tsx) 만질 가능성 → 사전 영역 분리 (3D 는 ThreeMap/three-scene, 혼잡도는 GoogleMap/MapPanel heatmap 부분) 로 충돌 회피

---

## 8. 인프라 대응 — BE 호스트 마이그레이션 / Vercel 한계 우회

### 8-1. Ephemeral IP → Static IP (PR #64)
- 증상: BE 가 갑자기 연결 끊김 (timeout)
- 원인: GCE Ephemeral IP 가 인스턴스 재시작 시 변경됨. BE 팀이 Static IP 로 재할당 (`34.22.91.75 → 34.50.44.75.nip.io`)
- FE: `vite.config.ts` 프록시 3곳 + `vercel.json` rewrites 3곳 동시 갱신. nip.io 와일드카드 SSL 인증서 활용

### 8-2. Vercel 4.5MB body limit (PR #89)
- 증상: prod 에서 5MB+ 사진 업로드 시 413
- 원인: Vercel proxy/rewrite 의 request body 제한
- 해결: upload 만 절대 BE URL 호출로 우회. 다른 API 들은 small JSON 이라 그대로 vercel rewrite 사용

### Result
- BE 호스트 변경 대응 ~10분 (PR + 빌드 + 자동 배포)
- 사진 업로드 prod 동작 회복

---

## 9. UI 사용성 개선 (작지만 중요)

- **PR #67 — 온보딩 관심사 단계 제거**: 6개 카테고리 그리드 선택값을 어디서도 안 쓰는 dead UI. 117줄 → 25줄, 사용자 클릭 1회 절약
- **PR #83 — 모바일 사이드바 액션 아이콘 노출**: `opacity-0 group-hover:opacity-100` 으로 hover 시에만 보이던 edit/delete 아이콘이 모바일에선 영영 안 보임. 항상 표시로 변경
- **PR #74 — 사이드바 GSAP transform 충돌 hotfix**: PR #72 직후 발견. inline `style.transform` 과 GSAP 가 transform 소유권 경쟁 → React 가 GSAP 적용을 매 렌더마다 덮어씀 → 사이드바 안 보임. inline style 제거 + `useGSAP` first-run 가드로 해결

---

## 10. 협업/문서화 패턴

### 10-1. BE 요청 문서 패턴
1차 분석 → 옵션 정리 → 우리가 선호하는 옵션 + 이유 → BE 결정 필요한 항목 체크리스트 → 즉시 가능한 FE Phase 1 / BE 도입 후 Phase 2 분리.

이 패턴이 통한 사례:
- **PR #81 (캘린더 BE 요청)** → BE 가 옵션 B 채택 + `source==='localbiz'` 구분 방식 그대로 도입
- **이미지 업로드 옵션 4가지** → BE 가 옵션 A (GCS multipart) 채택

### 10-2. 작업 워크로그
`docs/work-log-2026-05-18.md` 에 PR 단위 정리 (어떤 변경, 왜, 후속 작업). 다음 사이클 진입 시 컨텍스트 회복 빠름.

### 10-3. 설계 문서 → 컨펌 → 구현 분리
- `docs/design-image-alternative.md` (4 옵션 + 추천 조합)
- `docs/design-3d-google-photorealistic-tiles.md` (마이그레이션 4단계 + 비용 분석)
- 사용자 컨펌 받기 전엔 구현 안 시작 → 후회 작업 줄임

---

## 11. 정량 종합

| 지표 | 값 |
|---|---|
| 머지된 PR | 26건 |
| 평균 PR 사이클 | 작성 → 검증 → PR → 머지 ~20분 |
| 신규 라이브러리 도입 | 2개 (gsap, @gsap/react) |
| 신규 코드 파일 | 12개 (focus-buildings, seoul-districts, buildings-cache, tile-cache, prefetch-3d, gsap-setup, flip-to-marker, stop-category, MapBlock, Google3DMap 설계 등) |
| 삭제/대체된 코드 | ~250줄 (MapMarkersBlock, INTERESTS 등) |
| 삭제된 mock 의존 | 4 곳 (BookingPanel, bookmarkStore 시드, MapPanel congestionPoints, ItineraryCard 카테고리 결정) |
| 차단된 prod 누출 | 4 경로 (MSW SW + 3개 mock JSON) |
| 신규 BE API 연동 | 7개 엔드포인트 (place-bookmarks 3, calendar 2, upload 1, 기타) |
| 테스트 | 13/13 유지 (회귀 0) |
| 번들 변화 | gsap ~53KB 추가 / mock 의존 일부 제거 / Three.js 그대로 |

---

## 12. 회고 — 다음에 했더라면

1. **3D 재설계** — Three.js 자체 빌딩 시스템 대신 Google Photorealistic 3D Tiles 였으면 ~1500줄 코드 절약. 그러나 빌링 권한 협의가 필요해서 설계 문서로 남김. 다음 사이클에서 진행
2. **이미지 업로드** — BE 환경변수(GCS bucket) 설정이 사용자 환경에 의존 → FE 가 검증 가능한 영역 밖이라 prod 검증이 느림. 다음엔 PR 머지 전 BE 팀 환경 사전 확인 protocol 정착
3. **MSW Service Worker 누출** — 한 번 prod 에서 발견한 후 hooks 로 CI 검사 추가했으면 좋았음. 후속 작업 후보
4. **워크트리 분리 작업** — 첫 사용 시 worktree path 가 cwd 로 잡혀서 Vite 캐시가 깨지는 부작용 발견. 이후 작업 시 worktree 종료 후 항상 메인 cwd 복귀하는 패턴 명시
5. **카테고리 일관성 같은 종류 버그** — 한 데이터를 여러 컴포넌트가 각자 다른 로직으로 가공할 때 발생. helper 함수로 단일 결정 지점 + ESLint custom rule 같은 걸로 미래 방지 가능
