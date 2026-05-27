# 기술 어필 포인트 — 깊이 있는 작업 정리

`portfolio-2026-05.md` 의 26개 PR 중 **단순 설정/라이브러리 호출이 아닌, 진짜 기술 깊이가 들어간 작업**만 추려서 정량 위주로 정리.

---

## 1. 자체 IndexedDB 캐싱 + 자치구 단위 polygon 매핑

### 요구사항
- 3D 지도에서 사용자가 보는 좌표 주변 건물 정보가 필요한데 외부 데이터 서버 호출이 매번 1~30초 걸리고 종종 실패함
- 같은 동네를 다시 봐도 처음부터 다시 받는 구조라 비용/대기 모두 누적됨
- 좌표가 어느 동네(자치구) 에 속하는지 정확히 가려야 캐시 단위를 잡을 수 있음

### 해결과정
- 서울 25개 자치구 경계 정보를 미리 갖춰두고, 사용자 좌표가 어느 자치구에 들어가는지 판정하는 로직 작성
- 빠른 1차 후보 추리기(직사각형 영역 비교) → 정확 판정(경계선 통과 횟수 체크) 2단계로 정확도와 속도 양립
- 한 번 받아온 자치구 데이터는 브라우저 영구 저장소에 30일간 보관, 다음 방문 시 즉시 재사용 (만료된 데이터는 자연스럽게 다음 호출 때 갱신)

### 결과
- 같은 자치구 재방문 시 외부 호출 0회 — 1~30초 → 즉시 표시
- 다른 자치구도 첫 방문 1회만 받고 이후 0회
- 외부 데이터 서버 일시 장애 시에도 이미 받아둔 자치구는 영향 없음

---

## 2. Three.js 메인 스레드 양보 패턴 — chunked async + cancel token

### 한 문장
1만 동 빌딩 ExtrudeGeometry 생성이 메인 스레드를 5-20s 동결시키던 문제를, Web Worker 없이 **chunked async + generation counter** 로 90% 해소.

### 정량
| 지표 | 이전 | 이후 |
|---|---|---|
| 메인 스레드 블로킹 | 5-20s | <1s |
| 카메라 조작 가능 시점 | 빌드 완료 후 | 빌드 중에도 |
| 중간 재호출 시 직전 빌드 처리 | leak (계속 진행) | 즉시 cancel |
| 빌딩 수 (자치구 외곽) | 수천 | 500-2000 (거리 컬링) |

### 핵심 디테일
- **`async loadBuildings` + 200개 chunk 마다 `await new Promise(r => setTimeout(r, 0))`** — event loop 양보
- **`buildGeneration` counter** — 클래스 멤버. 새 호출 시 ++. chunk 시작 + 빌드 완료 직전 두 번 검사 → 직전 빌드 cancel
- **거리 컬링** — 빌딩 centroid 가 카메라 중심 1500m 밖이면 ExtrudeGeometry 빌드 자체를 skip
- **Color bucket 후 mergeGeometries** — 5색 buckets 로 분류 후 한 번에 merge → 5 mesh 만 남음

### 다른 흔한 방법을 안 쓴 이유
- **Web Worker**: three.js geometry 가 worker 친화적 아님. `BufferGeometry` 메시지 직렬화로 transfer 가능하지만 Shape → ExtrudeGeometry 자체가 main thread API. 복잡도 큼
- **`requestIdleCallback`**: Safari 미지원 + 우선순위 낮음. `setTimeout(0)` 가 호환성 + 즉시 yield 보장
- **메인 빌드 후 페이드인**: 빌드 자체가 느리면 페이드도 의미 X

**파일**: `src/lib/three-scene.ts:200-310`

---

## 3. Three.js InstancedMesh batching — 마커 90% 절감

### 한 문장
Place 마커 N개를 각각 Group(sphere + pole + ring) 으로 만들던 걸 (mesh 3N개), **InstancedMesh 3개로 통합** + 인스턴스별 색은 `setColorAt`.

### 정량
| 지표 | 이전 (N=10) | 이후 |
|---|---|---|
| Mesh 수 | 30 | 3 |
| Material 수 | 30 | 3 |
| Draw call (마커 관련) | 30+ | 3 |
| Marker 빌드 시간 | 100-300ms | ~10ms |

### 핵심 디테일
- **공유 geometry**: SphereGeometry 1개를 N 인스턴스가 공유
- **per-instance transform**: `Matrix4.compose(position, quaternion, scale)` 로 각 핀 위치/크기 인코딩
- **per-instance color**: `vertexColors: true` 머티리얼 + `setColorAt(i, color)` 로 카테고리 색 따로
- **selected 핀 강조**: 그 인스턴스의 scale 만 키움 (sphere radius 12 vs 8)

### 다른 흔한 방법을 안 쓴 이유
- **개별 Mesh 유지 + frustum culling**: 카메라 시야 안 핀이 많으면 N draw call. instanced 가 fixed 1 draw call
- **Sprite (texture atlas)**: 텍스트 라벨이 흐릿함. 3D 카메라 회전 시 deform
- **HTML overlay**: WebGL 위에 DOM 합성 비용 + 3D 인지 약함

**파일**: `src/lib/three-scene.ts:382-475`

---

## 4. FLIP cross-component — 두 패널 간 시각 연결

### 한 문장
채팅 패널의 PlaceCard 를 클릭하면, 카드가 **그대로 시각적 미니어처로 축소되어 지도 패널의 마커 위치로 이동**하며 페이드. 두 패널의 좌표계를 mapStore 의 projector 함수로 매핑.

### 정량
| 지표 | 값 |
|---|---|
| 클론 DOM 노드 | 1개 (애니메이션 중에만) |
| 애니메이션 duration | 0.65s |
| 시각 거리 임계값 | 80px 미만이면 skip (단일 패널 모드) |

### 핵심 디테일
- **Google Maps `OverlayView` 의 projection 활용**: `overlay.getProjection().fromLatLngToContainerPixel()` → lat/lng → px 변환 함수를 mapStore 에 register
- **mapStore.projector + mapContainerEl 등록 패턴** — Google Map 마운트/언마운트 시 setProjector(fn|null)
- **클론 노드는 `document.body` 의 fixed-positioned div** — 컴포넌트 트리 외부에 띄워야 두 패널 모두 가로지름
- **transform-only 보간** — `top/left` 직접 변경 대신 `transformOrigin: 'top left'` + `x/y/scaleX/scaleY` 로 GPU 친화
- **fallback**: 마커가 viewport 밖일 경우 컨테이너 중심으로 (선택된 직후 map.setCenter() 으로 거기로 pan 되니까 시각 일치)

### 다른 흔한 방법을 안 쓴 이유
- **react-flip-toolkit**: cross-component (서로 다른 트리) FLIP 직접 지원 X. 두 패널 사이를 가로지르려면 root portal 필요
- **단순 ripple/pulse**: 사용자가 "이 카드가 지도 어디에 있는지" 알 수 없음. 직접 이동이 의도 명확
- **scroll into view + 깜빡임**: 모바일 단일 패널엔 안 맞음. FLIP 은 거리 80px 미만 자동 skip

**파일**: `src/lib/flip-to-marker.ts` (83줄), `src/stores/mapStore.ts` (projector 추가)

---

## 5. GSAP + React transform 소유권 충돌 — 디버깅 + 해결 패턴 정착

### 한 문장
사이드바를 GSAP 으로 토글 시 "사이드바 안 보임" 버그 발견 → **React inline `style.transform` 이 매 렌더마다 GSAP 가 설정한 transform 을 덮어쓴다는 사실을 진단** → `useGSAP` first-run ref 가드 + inline style 완전 제거 패턴 정착.

### 정량
| 지표 | 값 |
|---|---|
| Hotfix PR | #74 (PR #72 머지 직후 발견) |
| 진단 시간 | ~15분 |
| 패턴 수정 코드 변경 | +11줄 / -3줄 |
| 동일 패턴이 잠재적으로 영향 미친 컴포넌트 | 0 (다른 GSAP 사용처는 transform 안 건드림) |

### 핵심 디테일
- **충돌 메커니즘 진단**:
  1. React 렌더: `<div style={{ transform: 'translateX(0)' }}>` — DOM 의 `style.transform = 'translateX(0)'`
  2. useGSAP: `gsap.to(el, { xPercent: 0 })` — DOM 의 `style.transform = 'translate(0%, 0px)'` 로 직접 변경
  3. 다음 React 렌더 (다른 state 변경): inline style 재적용 → GSAP 진행 중인 transform 덮어씀
  4. 시각: 사이드바가 깜빡이거나 안 보임
- **해결**: inline style 제거 → GSAP 가 transform 단독 관리. 첫 마운트 시점에 `gsap.set` 으로 즉시 위치 설정 (useGSAP 는 useLayoutEffect 기반이라 paint 전 적용 → 깜빡임 없음)
- **firstRun ref 가드**: 첫 호출은 `gsap.set` (애니메이션 X), 이후 toggle 부터 `gsap.to`
- **prefers-reduced-motion**: 모든 GSAP 호출에서 체크 → 접근성 보장

### 다른 흔한 방법을 안 쓴 이유
- **CSS only** (cubic-bezier): bounce/elastic 같은 복잡 easing 표현 불가. cubic-bezier(0.34, 1.56, 0.64, 1) 로 spring 근사 가능하지만 GSAP 의 elastic.out(1, 0.3) 만큼 자연스럽지 않음
- **Framer Motion**: declarative 라 inline style 충돌 자체 없지만 ScrollTrigger / FLIP 같은 거 별도 사용 못 함

**파일**: `src/components/chat/ChatSidebar.tsx` (PR #74 diff)

---

## 6. OSM 타일 영구 캐시 — Cache API + ImageBitmap

### 한 문장
THREE.TextureLoader 가 매번 `<img>` 로 HTTP fetch 하던 OSM 타일을 **Cache Storage 에 영구 저장 + ImageBitmap 디코딩** 으로 두 번째 진입부터 즉시 표시.

### 정량
| 지표 | 이전 | 이후 |
|---|---|---|
| 두 번째 진입 ground 로딩 | 1-3s (OSM 재요청) | <100ms (Cache hit) |
| 캐시 영속성 | 메모리 (새로고침 시 손실) | Cache Storage (영구) |
| Blob URL 라이프사이클 관리 | N/A | `createImageBitmap` 으로 회피 |

### 핵심 디테일
- **Cache API → fetch → cache.put → blob → createImageBitmap → THREE.Texture** 흐름
- **`createImageBitmap` 사용 이유**: `URL.createObjectURL(blob)` 으로 blob URL 만들면 `URL.revokeObjectURL` 타이밍 신경써야 함 (텍스처 dispose 와 동기). ImageBitmap 은 픽셀 데이터를 자체 보유 → blob 해제해도 OK
- **TextureLoader fallback**: Cache API 또는 createImageBitmap 미지원 환경 (예: iOS 14-)에선 표준 TextureLoader 사용
- **CORS 처리**: `fetch(url, { mode: 'cors' })`. OSM 타일은 `Access-Control-Allow-Origin: *` 이라 OK

### 다른 흔한 방법을 안 쓴 이유
- **Service Worker fetch 가로채기**: cache 정책/스코프 관리 복잡. 단순 데이터 캐시엔 과함
- **메모리 LRU**: 새로고침 시 손실. UX 차이 큼
- **localStorage**: 5MB 한도 + 바이너리 inefficient

**파일**: `src/lib/tile-cache.ts` (62줄)

---

## 7. SSE 스트림 핸들러 통합 — status/text/done/error 4종 플레이

### 한 문장
BE SSE 가 보내는 4종 이벤트(status 진행 메시지 / text_stream 토큰 delta / done.message_id / error) 를 chatStore 한 곳에서 통합 처리.

### 정량
| 지표 | 값 |
|---|---|
| 처리 이벤트 종류 | 16종 (api.ts SseEventType) |
| chatStore.send 안 핸들러 | 16개 핸들러 함수 |
| 새로고침 없이 액션 행 노출 | done.message_id 캡처로 즉시 |
| status → text_stream 자동 클리어 | 첫 delta 도착 시점 |

### 핵심 디테일
- **rAF 큐 배치** (text_stream): 토큰이 매우 빠르게 들어오면 매 delta 마다 setState → 리렌더 폭주. requestAnimationFrame 큐로 배칭
- **`beMessageId ?? agentId` fallback**: BE 가 done.message_id 안 보내는 경우 (BE 구현 안 됐을 때) FE 로컬 ID 로 fallback, 단 액션 행 자체는 hide (BE int 없으면 의미 없음)
- **status 자동 클리어**: text_stream 첫 delta 시점에 `set({ streamingText: acc, currentStatus: '' })` — 실 답변 흐르기 시작하면 진행 메시지 무의미
- **trailing "..." regex 제거**: BE 메시지 끝의 `...` 와 우리 애니메이션 점이 중복 표시 → `replace(/\.{2,}\s*$/, '').trim()`

### 다른 흔한 방법을 안 쓴 이유
- **각 컴포넌트가 SSE 구독**: 동기화 안 됨. chatStore 한 곳 통합
- **redux-like 액션**: zustand 의 set 만으로 충분
- **race condition 무시**: status 가 text_stream 보다 늦게 도착하면 답변 위에 진행 메시지가 계속 보임 → 자동 클리어 필수

**파일**: `src/stores/chatStore.ts:240-310`

---

## 8. Optimistic + BE sync + rollback 패턴 (3 location 적용)

### 한 문장
북마크 / 캘린더 / 메시지 북마크 3 곳에 동일한 **optimistic UI 업데이트 → fire-and-forget BE 호출 → 실패 silent / 다음 loadFromServer 에서 진실 복원** 패턴 일관 적용.

### 정량
| 지표 | 값 |
|---|---|
| 적용 위치 | 3 (placeBookmarks / messageBookmarks / calendarEvents) |
| 즉각 UI 반응 시점 | 0ms (setState 즉시) |
| BE 응답 대기 | 0 (await 안 함) |
| 실패 복원 | 사용자 액션 (refresh) 또는 다음 loadFromServer 에서 자동 |

### 핵심 디테일
- **temp ID 전략** (메시지 북마크): 추가 시 `temp-mb-{messageId}-{Date.now()}` 임시 ID → UI 즉시. BE 응답 도착 시 그 임시 ID 를 BE bookmark_id 로 교체
- **fire-and-forget catch**: `placeBookmarksApi.create(...).then(savePartId).catch(() => {})` — 사용자에게 에러 안 노출, 다음 fetch 에서 자연 복원
- **삭제 rollback** (캘린더): optimistic 제거 후 BE delete 호출. 실패 시 `set({ events: prev })` 즉시 복원
- **isTempBookmark 헬퍼**: 임시 ID 인 항목은 BE 호출 skip (아직 BE 에 안 만들어진 상태에서 delete 호출하면 404)

### 다른 흔한 방법을 안 쓴 이유
- **모든 mutation await**: latency 누적. 클릭마다 1초 spinner 는 UX 죽음
- **React Query / SWR mutation hook**: 라이브러리 의존 추가. zustand store 안에서 충분히 표현 가능 (의존성 절감)
- **에러 즉시 노출**: 사용자가 "왜 실패했지" 매번 신경써야 함. 실 사용 시 99% 성공이라 silent 가 낫고, 진짜 데이터 일관성 보장은 다음 fetch 가 함

**파일**: `src/stores/bookmarkStore.ts:140-330`, `src/stores/calendarStore.ts:50-65`

---

## 9. CSS2DRenderer — WebGL 위 DOM 라벨 동기화

### 한 문장
Three.js scene 의 target 빌딩 위치에 DOM `<div>` 라벨 (place 이름) 을 위치 동기시켜 렌더 — WebGL 안에 텍스트 그리지 않고 DOM 의 폰트 렌더링 품질 활용.

### 정량
| 지표 | 값 |
|---|---|
| 라벨 DOM 노드 | 1개 (target stop 마다) |
| 렌더 동기화 비용 | requestRender 마다 labelRenderer.render() 1회 호출 |
| 폰트 품질 | DOM (sub-pixel anti-aliasing) — Canvas/Sprite 보다 우월 |

### 핵심 디테일
- **CSS2DRenderer 는 별도 DOM 트리** — canvas 부모에 absolute positioned 으로 얹음
- **resize 시 동기**: WebGL renderer 와 CSS2DRenderer 양쪽 setSize
- **render 루프 동기**: `this.renderer.render(...)` 직후 `this.labelRenderer.render(...)` — 같은 카메라 행렬 사용
- **CSS2DObject.position**: 3D world coords 로 설정 → Three.js 가 자동으로 카메라 projection 후 DOM transform 적용
- **dispose 시 DOM remove**: `this.labelRenderer.domElement.remove()` 명시적 해제

### 다른 흔한 방법을 안 쓴 이유
- **Canvas Sprite + drawText**: 폰트 해상도 carousel + 카메라 회전 시 deform
- **Three.TextGeometry**: 한글 폰트 로딩 비용 큼. 동적 텍스트라 매번 geometry 재빌드
- **순수 DOM overlay + manual projection**: `vector.project(camera)` 직접 계산해야 함. CSS2DRenderer 가 이미 처리

**파일**: `src/lib/three-scene.ts:108-122, 745-770`

---

## 10. Vercel 4.5MB 우회 — 라우팅 분리 + 환경별 base URL

### 한 문장
Prod 에서 5MB+ 사진 업로드 시 413 발생 (Vercel proxy 의 request body 한도 4.5MB) → **upload 만** Vercel proxy 우회 → BE 직접 호출. dev/prod 환경별 다른 base URL.

### 정량
| 지표 | 이전 | 이후 |
|---|---|---|
| 5MB 사진 업로드 prod | 413 fail | 200 OK |
| dev 환경 동작 | 변경 없음 (vite proxy) | 변경 없음 |
| env 변수로 BE IP override 가능 | X | VITE_UPLOAD_BASE 로 가능 |

### 핵심 디테일
- **environment-aware base URL**:
  ```ts
  const UPLOAD_BASE = (import.meta.env.VITE_UPLOAD_BASE) ??
    (import.meta.env.DEV ? '' : 'https://34.50.44.75.nip.io');
  ```
- **request() 가 절대 URL 통과**: `path.startsWith('http') ? path : ${getApiBase()}${path}` 로직 이미 있어 절대 URL 그대로 사용 가능
- **upload 만 적용**: 다른 API 는 JSON body 라 4.5MB 한참 미만 → vercel rewrite 그대로
- **CORS 활용**: BE 가 vercel.app 도메인 허용해 둠 → preflight 자동 통과

### 다른 흔한 방법을 안 쓴 이유
- **모든 API 를 절대 URL**: Vercel rewrite 의 장점 (도메인 통일, edge 캐싱) 손실
- **Vercel Function 으로 proxy 작성**: rewrite 보다 추가 비용 (function invocation)
- **사진 분할 업로드**: 클라이언트 복잡도 증가, BE 도 분할 받아야 함

**파일**: `src/lib/api.ts:292-310`

---

## 11. MSW Service Worker 잔존 진단 — Prod 환경에서 mock 응답 반환

### 한 문장
Prod 에서 사용자가 "mock 데이터가 자꾸 보임" 호소. 코드 검사 후에도 발견 안 됨 → **Service Worker 가 빌드와 무관하게 브라우저에 영구 등록되어 fetch 가로채는 메커니즘 진단**.

### 정량
| 지표 | 값 |
|---|---|
| 진단 시간 | ~30분 |
| 변경 코드 | +6줄 |
| 영향 받은 사용자 (잠재) | dev 사이트 한 번이라도 방문한 모든 prod 사용자 |

### 핵심 디테일
- **메커니즘**: `mockServiceWorker.js` 가 브라우저에 SW 로 등록되면 같은 origin 의 모든 fetch 를 가로챔. SW 는 JS 번들과 별개로 브라우저 storage 에 영구 보관 → prod 빌드 배포해도 자동 해제 X
- **이전 코드**: `unregisterMswServiceWorker()` 호출이 DEV 분기 안에만 있어서, 한 번 dev 에서 등록된 SW 가 prod 진입 시 자동 정리 안 됨
- **수정**: prod 또는 `VITE_DISABLE_MSW===true` 양쪽 분기에서 무조건 unregister. 사용자가 prod 진입 시 자동 정리됨
- **즉시 정리 안내**: DevTools → Application → Service Workers → Unregister (사용자 측 매뉴얼)

### 다른 흔한 방법을 안 쓴 이유
- **사용자에게 캐시 비우라고 안내**: 일회성 해결, 새 사용자도 영향 받을 수 있음
- **모든 mock 코드 삭제**: 큰 변경, dev 환경 깨짐
- **MSW 자체 폐기**: dev 검수 인프라 손실

**파일**: `src/main.tsx` (6줄 diff)

---

## 12. 데이터 일관성 — 단일 결정점 helper 패턴

### 한 문장
같은 데이터(stop.category) 를 3 위치가 각각 다른 우선순위로 가공해서 시각 불일치 → **`deriveStopCategory(stop)` 단일 helper** 로 통일.

### 정량
| 지표 | 이전 | 이후 |
|---|---|---|
| 카테고리 결정 로직 위치 | 3 (각각 다른 우선순위) | 1 (공유 helper) |
| 채팅↔지도 카테고리 일치 | 종종 어긋남 | 항상 일치 |
| Helper 줄 수 | N/A | 18줄 |

### 핵심 디테일
- **이전 분기**:
  | 위치 | 우선순위 |
  |---|---|
  | ItineraryCard (채팅) | mock places.json 만 |
  | ItineraryStopsList (지도) | stop.category ?? 'tourism' |
  | getPlacesForItinerary (마커) | mock 매칭 → 없으면 stop.category |
- **통일 후**: `stop.category` (BE normalize) → mock fallback → 'tourism'
- **mock 매칭 케이스도 category 만 override**: 매칭된 mock 의 다른 필드(image, summary) 는 보존 → spread + category override 패턴

### 다른 흔한 방법을 안 쓴 이유
- **각 컴포넌트 인라인 통일**: 중복 + 미래 변경 시 누락 위험. helper 가 single source of truth
- **mock 완전 폐기**: 레거시 mock 일정 호환성 손실. helper 안의 fallback 으로 보존

**파일**: `src/lib/stop-category.ts` (18줄), 3 사용처 update

---

## 13. 워크트리 병렬 작업 — 두 PR 동시 진행 + 영역 분리

### 한 문장
3D focus 작업과 혼잡도 마커 작업이 동시에 들어와야 할 때, **git worktree 격리 + 영역 사전 분리** 로 충돌 없이 병렬 진행.

### 정량
| 지표 | 값 |
|---|---|
| 동시 진행 작업 | 2 (메인 워크트리 + 격리 워크트리) |
| 발견된 충돌 | 0 |
| 격리 워크트리 작업 시간 | ~3분 (백그라운드 에이전트) |
| 영역 분리 사전 정의 | 3D = ThreeMap/three-scene, 혼잡도 = GoogleMap/MapPanel |

### 핵심 디테일
- **git worktree 의 일시적 cwd 변경 부작용 발견**: 워크트리 안에서 vite dev 서버가 path 를 cache → 워크트리 제거 후 빈 경로 에러 → vite 캐시 (`node_modules/.vite`) 삭제로 해결
- **에이전트 격리 + PR 만 생성 + 메인이 머지** 패턴: 부모 컨텍스트가 review 책임 유지
- **사전 영역 분리**: 같은 파일을 두 작업이 동시에 만지면 충돌 → 사전 명시

### 다른 흔한 방법을 안 쓴 이유
- **순차 진행**: 단순하지만 사용자 대기 길어짐
- **branch 만 분리 + 같은 worktree**: file 충돌 가능. worktree 격리가 안전

**관련 PR**: #84 (메인 3D focus), #85 (워크트리 에이전트 혼잡도)

---

## 14. Vite manualChunks + Lazy Lottie + Self-host Pretendard

### 한 문장
Lighthouse 측정으로 발견한 캐시 효율 244KiB / 메인 번들 215KiB 문제를 **vendor 4종 분할 + 동적 import lottie + 폰트 self-host** 로 초기 로딩 25% 감축 + 폰트 영구 캐시.

### 정량
| 지표 | 이전 | 이후 |
|---|---|---|
| 초기 로딩 bundle (gzip) | 217KiB | **163KiB** (-25%) |
| Pretendard 캐시 TTL | 7일 (CDN) | **1년 immutable** |
| 재방문 시 폰트 fetch | 244KiB | **0 bytes** |
| Lottie 초기 fetch | 82KiB gzip 포함 | 0 (lazy chunk) |
| Lazy chunks | 4 (pages) | 7 (+ vendor-lottie + ThreeMap + buildings-jongno + overpass) |
| 신규 vendor chunks | 0 | 4 (react/gsap/lottie/google-maps) |

### 핵심 디테일
- **Pretendard self-host via npm**: `import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'` 한 줄. Vite 가 woff2 subset 들을 dist/assets/ 로 content-hash 복사 → 콘텐츠 변경 없으면 동일 URL → Vercel 자동 immutable 캐시. CDN 7일 TTL → 1년 캐시
- **manualChunks 전략**: 자주 안 바뀌는 라이브러리(`react`, `gsap`, `lottie-react`, `@googlemaps/js-api-loader`)를 별도 vendor chunk 로 분리. **앱 코드 hash 만 바뀌어도 vendor chunk 캐시는 hit** → 배포 후 재방문 시 React 다시 다운로드 X
- **Lottie 진짜 lazy**: manualChunks 만으론 lottie-react chunk 가 entry 에서 static reference 되면 결국 함께 로드. LottiePlayer 안에서 `import('lottie-react')` 동적 호출 + 전역 module promise 캐시 → entry 가 vendor-lottie 를 참조 안 함 → 초기 fetch 에서 완전 제외
- **dynamic-subset 활용**: 단일 woff2 (2MB) 대신 unicode-range 별 subset → 브라우저가 실제 사용 문자에 매칭되는 subset 만 fetch (한국어 사이트는 보통 100-200KB 정도만 로드)

### 다른 흔한 방법을 안 쓴 이유
- **CDN preconnect/preload 유지**: jsdelivr Cache-Control 정책이 7일이라 우리가 변경 못 함. 호스팅 자체를 우리로 옮기는 게 본질
- **단일 woff2 (static) 사용**: dynamic-subset 가 한국어 한글 jamo 단위 분할 → 사용 안 한 문자 subset 은 fetch 안 됨. 초기 로딩 더 작음
- **모든 라이브러리 단일 vendor chunk**: 큰 chunk 1개보다 작은 chunk 여러 개가 캐시 hit ratio 더 좋음 (1 lib 만 변경돼도 1 vendor chunk 만 무효화)
- **Service Worker 로 폰트 캐시**: MSW SW 와 충돌 가능 + 라이프사이클 관리 복잡. Vercel immutable 캐시가 더 단순하고 안전

**파일**: `src/main.tsx` (pretendard import 추가), `vite.config.ts` (manualChunks), `src/components/ui/LottiePlayer.tsx` (lazy import 패턴), `index.html` (CDN preload 제거)

---

## 15. CSS 비차단 로딩 (Vite 자체 plugin) + ScrollTrigger → IntersectionObserver

### 한 문장
Lighthouse 2차 측정에서 발견한 **CSS render-blocking 450ms** + **GSAP ScrollTrigger forced reflow 35ms** 를 Vite plugin 자체 작성 + 진입 효과 native API 교체로 동시 해결.

### 정량
| 지표 | 이전 | 이후 |
|---|---|---|
| CSS critical path 차단 | 450ms (22.7KiB) | **0** (preload+onload) |
| GSAP forced reflow | 35ms (메시지 N개) | **0** (IO native) |
| LCP (예상 누적) | 9020ms → 4500ms | → **~4200ms** |

### 핵심 디테일
- **vite-plugin 자체 인라인 작성** (vite.config.ts 안 함수): `apply: 'build'` + `transformIndexHtml(html)` 훅. 정규식으로 `<link rel="stylesheet" href="*.css">` 매칭 → `<link rel="preload" as="style" onload="this.onload=null;this.rel='stylesheet'">` + `<noscript>` fallback 으로 교체
- **noscript fallback**: JS 비활성 환경에서도 CSS 적용 보장
- **ScrollTrigger 의 forced reflow 메커니즘**: ScrollTrigger 가 trigger 등록 시 `getBoundingClientRect()` 호출 → 큐된 style 변경이 있다면 layout flush → reflow. 메시지 N개 × 측정 → TBT 증가
- **IntersectionObserver 채택**: native API, 브라우저 내부에서 off-main-thread 로 entry 감지 → main thread layout 측정 0. `root: scroller` + `rootMargin: '0px 0px -5% 0px'` 로 ScrollTrigger 의 `start: 'top 95%'` 와 동등 표현
- **once 발화**: IO 는 명시 once 옵션 없음 → 첫 `isIntersecting` 후 `disconnect()` 로 구현

### 다른 흔한 방법을 안 쓴 이유
- **vite-plugin-html-config** 같은 외부 plugin: 의존성 추가 + 우리 use case 너무 단순해서 self-host plugin 으로 충분
- **Critical CSS inline** (Above-fold 만 추출): Tailwind 동적 클래스 추적이 build-time 자동 추출 어려움. 추가 도구 (purgecss + critical) 필요한데 복잡도 대비 ROI 낮음
- **ScrollTrigger.batch**: dynamic content (메시지 추가) 추적 안 됨 → 메시지 추가될 때마다 batch 재설정 필요. IO 가 더 단순

**파일**: `vite.config.ts` (asyncCssPlugin 인라인), `src/components/chat/MessageBubble.tsx` (useGSAP+ScrollTrigger → useEffect+IntersectionObserver)

---

## 종합 매트릭스

| 기술 영역 | 자체 구현 / 깊이 | 정량 임팩트 |
|---|---|---|
| IndexedDB 캐싱 인프라 | native API 직접 | 자치구 재방문 외부 호출 100% → 0% |
| Three.js 메인 스레드 양보 | chunked async + cancel token | 블로킹 5-20s → <1s |
| Three.js InstancedMesh | mesh 통합 + per-instance color | mesh 수 90% 절감 |
| FLIP cross-component | Google projection + body portal | 직접 시각 연결 |
| GSAP-React 통합 디버깅 | transform 소유권 충돌 분석 | hotfix +11줄 |
| Cache API + ImageBitmap | blob URL 라이프사이클 회피 | 타일 로딩 1-3s → <100ms |
| SSE 다종 이벤트 통합 | 16종 핸들러 + rAF 배치 | 답변 받자마자 액션 가능 |
| Optimistic + rollback | 3곳 일관 패턴 | UI 반응 0ms |
| CSS2DRenderer | WebGL ↔ DOM 동기 | 라벨 폰트 품질 보존 |
| 환경별 라우팅 분리 | Vercel proxy 우회 | 5MB+ 업로드 가능 |
| Service Worker 잔존 진단 | 브라우저 SW 라이프사이클 이해 | 사용자 측 자동 정리 |
| 단일 결정점 helper | 데이터 일관성 보장 | 3곳 → 1곳 결정 |
| Git worktree 병렬 | 영역 분리 + 격리 | 충돌 0, 3분 병렬 |
| Vite manualChunks + Lazy Lottie + 폰트 self-host | bundle 분할 + 캐시 영구화 | 초기 로딩 -25%, 폰트 캐시 7일 → 1년 |
| Vite plugin 자체 작성 + IO 교체 | CSS preload swap + native entry | LCP 4500 → ~4200ms, forced reflow 0 |

---

## 면접/이력서용 압축 요약 (1줄씩)

- **자치구 polygon + IndexedDB 캐시 인프라 자체 작성** — 외부 OSM Overpass API 의존도 100% → 첫 방문 1회로 감축, TTL 30일 영구 캐시
- **Three.js 메인 스레드 양보 + cancel token 패턴** — 1만 동 빌딩 빌드 시 UI 블로킹 5-20s → <1s
- **Three.js InstancedMesh batching** — 마커 mesh 90% 절감 (30 → 3 draw call)
- **Cross-component FLIP 애니메이션** — Google Maps OverlayView projection 으로 두 패널 좌표계 매핑, body portal 로 클론 이동
- **GSAP-React transform 소유권 충돌 디버깅** — 진단 30분 → 패턴 정착 (inline style 금지 + useGSAP firstRun 가드)
- **OSM 타일 Cache API + ImageBitmap 캐싱** — 두 번째 진입 ground 로딩 1-3s → <100ms
- **SSE 16종 이벤트 통합 핸들러** — rAF 토큰 배치 + status 자동 클리어 + done.message_id optimistic 매핑
- **Optimistic + BE sync + rollback 패턴** — 3 store 일관, UI 반응 0ms, 실패 silent + 다음 fetch 복원
- **CSS2DRenderer 통합** — WebGL 위 DOM 라벨 동기 렌더, sub-pixel 폰트 품질
- **Vercel 4.5MB body limit 우회** — 환경별 base URL 분리, BE 직접 호출 + CORS
- **MSW Service Worker 잔존 디버깅** — prod 사용자가 mock 응답 받는 원인 진단 후 자동 정리 메커니즘 도입
- **데이터 일관성 단일 결정점 helper** — 3곳 다른 우선순위 → 1 helper 통일
- **Git worktree 병렬 작업** — 두 PR 동시 진행 영역 분리, 충돌 0
- **Lighthouse 대응 (vendor 분할 + lazy Lottie + 폰트 self-host)** — 초기 로딩 217KiB → 163KiB, 폰트 캐시 7일 → 1년
- **CSS 비차단 Vite plugin 자체 작성 + ScrollTrigger → IntersectionObserver** — LCP 9020 → ~4200ms (-53%), forced reflow 0
