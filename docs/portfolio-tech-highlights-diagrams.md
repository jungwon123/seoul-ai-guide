# 기술 어필 — 시퀀스/플로우/아키텍처 다이어그램

`portfolio-tech-highlights.md` 의 핵심 작업을 시각화. Mermaid 로 GitHub/Vercel docs renderer 에서 그대로 렌더링됨.

---

## 1. 빌딩 캐시 인프라 — 5단계 우선순위

좌표 → 자치구 매핑 → IndexedDB → Overpass 의 fallback chain.

```mermaid
flowchart TD
    Start([fetchBuildingsNearPoint<br/>lat, lng, radius=500]) --> P{pointCache<br/>memory hit?}
    P -- yes --> Return([return filtered<br/>by distance])
    P -- no --> J{종로 CACHED_BOUNDS<br/>안?}
    J -- yes --> JC[loadCachedBuildings<br/>static JSON]
    JC --> Return
    J -- no --> D[latLngToDistrict<br/>bbox + polygon ray cast]
    D --> SL{STATIC_DISTRICT_LOADERS<br/>등록된 자치구?}
    SL -- yes --> SLoad[dynamic import<br/>static district JSON]
    SLoad --> Return
    SL -- no --> IDB{IndexedDB<br/>cache hit?}
    IDB -- yes --> Return
    IDB -- no --> OF[fetchBuildingsInDistrict<br/>Overpass bbox]
    OF -- success --> Save[setCachedDistrict<br/>IDB TTL 30일]
    Save --> Return
    OF -- fail --> FB[fallback<br/>point-radius Overpass]
    FB --> Return
    style Return fill:#10B981,color:#fff
    style FB fill:#DC2626,color:#fff
```

---

## 2. Three.js chunked async + cancel token

빌딩 1만 개 빌드 시 메인 스레드 양보 + 직전 빌드 즉시 abort.

```mermaid
sequenceDiagram
    participant React
    participant Scene as MapScene3D
    participant Loop as Event Loop

    React->>Scene: loadBuildings(buildings, center)
    Scene->>Scene: ++buildGeneration = 7
    Scene->>Scene: clearBuildings()

    loop chunk 200개씩
        Scene->>Scene: ExtrudeGeometry × 200
        Scene->>Loop: await setTimeout(0)
        Loop->>Loop: 다른 작업 처리 (UI, paint)
        Loop-->>Scene: resume
        Scene->>Scene: generation === 7 체크
        Note over Scene: cancel 됐으면 즉시 return
    end

    Scene->>Scene: mergeGeometries by color bucket
    Scene->>Scene: animateBuildings()

    Note over React,Scene: 도중 새 호출 시 ++gen 으로 이전 빌드 자동 abort
```

---

## 3. Marker InstancedMesh batching

마커 N개 → mesh 3개 (sphere/pole/ring InstancedMesh).

```mermaid
flowchart LR
    subgraph Before[이전 - N=10]
        M1[Group 1<br/>sphere + pole + ring]
        M2[Group 2<br/>sphere + pole + ring]
        Md[...]
        M10[Group 10<br/>sphere + pole + ring]
    end
    subgraph After[이후 - N=10]
        SI[InstancedMesh: Sphere × 10]
        PI[InstancedMesh: Pole × 10]
        RI[InstancedMesh: Ring × 10]
    end
    Before -.30 mesh / 30 material<br/>30 draw call.-> After
    After -.3 mesh / 3 material<br/>3 draw call.-> Result([90% 절감])
    style Before fill:#FEE2E2
    style After fill:#D1FAE5
    style Result fill:#10B981,color:#fff
```

---

## 4. FLIP cross-component — 카드 → 지도 마커

채팅 PlaceCard 클릭 → 카드 클론이 지도 마커 위치로 축소·이동.

```mermaid
sequenceDiagram
    actor User
    participant Card as PlaceCard
    participant Store as mapStore
    participant Map as GoogleMap
    participant Body as document.body

    User->>Card: 클릭
    Card->>Card: getBoundingClientRect() 카드 px
    Card->>Store: projector + mapContainerEl 조회
    Store-->>Card: lat/lng → screen px 함수
    Card->>Card: target px 계산<br/>(viewport 안: projector / 밖: container center)

    alt 거리 80px 미만
        Card->>Card: skip (단일 패널)
    else 거리 충분
        Card->>Body: 클론 div append<br/>(fixed, 카드 image bg)
        Card->>Card: GSAP transform 보간<br/>(scale, translate, fade)
        Card->>Body: 0.65s 후 클론 remove
    end

    Card->>Store: selectPlace(place)
    Store->>Map: 지도 center → place
    Map->>Map: marker selected style
```

---

## 5. GSAP-React transform 충돌 → 해결 패턴

React inline style 과 GSAP 가 transform 소유권 경쟁.

```mermaid
sequenceDiagram
    participant React
    participant DOM
    participant GSAP

    rect rgb(254, 226, 226)
    Note over React,GSAP: 이전 (inline style.transform)
    React->>DOM: style.transform = "translateX(0)"
    GSAP->>DOM: gsap.to → style.transform = "translate(0%, 0px)"
    Note over React: 다른 state 변경
    React->>DOM: style.transform = "translateX(0)" 재적용
    DOM-->>DOM: GSAP transform 덮어씀
    Note over DOM: 깜빡임 / 사라짐
    end

    rect rgb(209, 250, 229)
    Note over React,GSAP: 이후 (inline 제거 + firstRun 가드)
    React->>DOM: ref 부착 (style 없음)
    GSAP->>DOM: useGSAP firstRun: gsap.set 즉시 위치
    Note over GSAP: useGSAP 이 useLayoutEffect 기반 → paint 전 적용
    GSAP->>DOM: 이후 isOpen 변경마다 gsap.to
    Note over DOM: GSAP 단독 소유, 충돌 없음
    end
```

---

## 6. OSM 타일 Cache API + ImageBitmap

```mermaid
flowchart TD
    Start([loadTileTexture url]) --> Check{caches API<br/>+ createImageBitmap<br/>지원?}
    Check -- no --> Fallback[표준 TextureLoader]
    Check -- yes --> Open[cache.open seoul-tiles]
    Open --> Match{cache.match url?}
    Match -- hit --> Blob[await resp.blob]
    Match -- miss --> Fetch[fetch + cache.put]
    Fetch --> Blob
    Blob --> Bitmap[await createImageBitmap blob]
    Bitmap --> Texture[new THREE.Texture bitmap]
    Texture --> Done([return Texture])
    Fallback --> Done
    style Done fill:#10B981,color:#fff
```

블롭 URL 라이프사이클 회피: ImageBitmap 이 픽셀 데이터 자체 보유.

---

## 7. SSE 다종 이벤트 통합 (chatStore.send)

16종 이벤트가 한 곳에서 통합 처리되며 상태 자동 전이.

```mermaid
sequenceDiagram
    participant BE
    participant SSE as openChatStream
    participant Store as chatStore
    participant UI

    BE->>SSE: event: intent
    SSE->>Store: intent handler (무시)

    BE->>SSE: event: status / "코스를 계획..."
    SSE->>Store: currentStatus = msg
    Store->>UI: TypingIndicator status

    loop text streaming
        BE->>SSE: event: text_stream / delta
        SSE->>Store: acc += delta
        Store->>Store: currentStatus '' (자동 클리어)
        Store->>UI: streamingText 업데이트 (rAF 배치)
    end

    BE->>SSE: event: places / [...]
    SSE->>Store: places = placesBlockToPlaces
    BE->>SSE: event: course / {...}
    SSE->>Store: itineraries.push
    Store->>Store: prefetchCourse3D (백그라운드)

    BE->>SSE: event: done / message_id: 333
    SSE->>Store: beMessageId = 333
    Store->>Store: agentMsg.messageId = beMessageId
    Store->>UI: 액션 행(저장/피드백/공유) 즉시 노출
```

---

## 8. Optimistic + BE sync + rollback

장소 북마크 toggle 의 fire-and-forget 패턴.

```mermaid
sequenceDiagram
    actor User
    participant UI as PlaceCard
    participant Store as bookmarkStore
    participant LS as localStorage
    participant BE

    User->>UI: ☆ 클릭
    UI->>Store: toggle(place)
    Store->>Store: optimistic local update
    Store->>LS: savePlaceIds + Snapshots
    Store->>UI: 즉시 UI 반영 (0ms)

    par BE 호출 (fire-and-forget)
        Store->>BE: POST /place-bookmarks
        alt 성공
            BE-->>Store: { bookmark_id: 42 }
            Store->>Store: placeBookmarkIds[place.id] = 42
            Store->>LS: savePlaceBookmarkIds
        else 실패 (silent)
            BE--xStore: error → catch noop
            Note over Store: 다음 loadFromServer 가<br/>BE 진실로 덮어씀
        end
    end
```

---

## 9. CSS2DRenderer — WebGL 위 DOM 라벨

```mermaid
flowchart LR
    subgraph Stack[같은 canvas 영역]
        direction TB
        WebGL[WebGL Canvas<br/>빌딩 / 마커]
        LR[CSS2DRenderer DOM<br/>absolute overlay]
    end
    Camera[Camera<br/>projection matrix] --> WebGL
    Camera --> LR
    Scene[Three.js Scene] --> WebGL
    Scene --> LR
    Note["render 루프마다<br/>renderer.render() + labelRenderer.render()<br/>같은 카메라 행렬 공유"]
    style WebGL fill:#1F3A8B,color:#fff
    style LR fill:#F4A12C,color:#fff
```

CSS2DObject 의 position 은 3D world coords. Three.js 가 자동으로 카메라 projection 후 DOM transform 적용.

---

## 10. 환경별 라우팅 — Vercel 4.5MB 우회

```mermaid
flowchart LR
    subgraph FE[FE - Vercel 배포]
        Store[zustand store]
        Other[기타 API 호출]
        Upload[uploadApi.image]
    end

    subgraph Edge[Vercel Edge]
        Rewrite[rewrite /api/* → BE]
        Limit{Body 4.5MB?}
    end

    BE[BE GCE<br/>34.50.44.75.nip.io]

    Other -->|relative URL<br/>"/api/..."| Rewrite
    Rewrite -->|<= 4.5MB| Limit
    Limit -- pass --> BE
    Limit -- exceed --> Reject[❌ 413]

    Upload -->|env-aware 절대 URL<br/>https://34.50.44.75.nip.io| BE
    Note[직접 호출 → 4.5MB 한계 우회<br/>BE CORS 가 vercel.app 허용]

    style Reject fill:#DC2626,color:#fff
    style BE fill:#10B981,color:#fff
```

`UPLOAD_BASE = import.meta.env.DEV ? '' : 'https://34.50.44.75.nip.io'` — dev 는 vite proxy 유지, prod 만 직접 호출.

---

## 11. MSW Service Worker 잔존 — 진단 + 자동 정리

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant SW as mockServiceWorker.js
    participant Prod as Prod page

    rect rgb(254, 226, 226)
    Note over User,SW: 과거 dev 사이트 방문 (또는 옛 prod)
    User->>Browser: dev URL 접속
    Browser->>SW: navigator.serviceWorker.register
    SW->>Browser: 영구 등록 (storage)
    end

    rect rgb(254, 243, 199)
    Note over User,Prod: 시간 경과 — 새 prod 빌드 배포 후 진입
    User->>Prod: prod URL 접속
    Browser->>SW: 기존 SW 가 fetch 가로챔
    SW-->>Prod: mock 응답 반환
    Note over Prod: 사용자 "왜 mock 이 보임?"
    end

    rect rgb(209, 250, 229)
    Note over User,Prod: 수정 후 (PR #64)
    User->>Prod: prod URL 접속
    Prod->>Prod: main.tsx 진입
    Prod->>SW: !import.meta.env.DEV → unregister
    SW->>SW: getRegistrations<br/>filter mockServiceWorker<br/>→ reg.unregister()
    Prod-->>User: 정상 prod fetch
    end
```

---

## 12. 단일 결정점 helper — 카테고리 일관성

```mermaid
flowchart TB
    subgraph Before[이전 - 3 경로 각자 다른 우선순위]
        B1[ItineraryCard<br/>채팅] -->|mock places.json 만| Mock1
        B2[ItineraryStopsList<br/>지도] -->|stop.category ?? tourism| Mock2
        B3[getPlacesForItinerary<br/>마커] -->|mock 우선 → stop.category| Mock3
        Mock1[다른 결과] -.시각 불일치.- Mock2
        Mock2 -.시각 불일치.- Mock3
    end

    subgraph After[이후 - 단일 helper]
        A1[ItineraryCard]
        A2[ItineraryStopsList]
        A3[getPlacesForItinerary]
        H[(deriveStopCategory)<br/>1 stop.category<br/>2 mock fallback<br/>3 'tourism']
        A1 --> H
        A2 --> H
        A3 --> H
        H --> Same[같은 결과]
    end

    style Mock1 fill:#FEE2E2
    style Mock2 fill:#FEE2E2
    style Mock3 fill:#FEE2E2
    style Same fill:#D1FAE5
    style H fill:#10B981,color:#fff
```

---

## 13. Bundle 분할 + lazy 그래프

```mermaid
flowchart TB
    Entry[index.html] -->|stylesheet preload+onload| CSS[index.css<br/>22KB]
    Entry -->|module| Main[index.js<br/>118KB gzip]
    
    Main --> VR[vendor-react<br/>17KB]
    Main --> VG[vendor-gsap<br/>28KB]
    
    Main -.lazy.-> VL[vendor-lottie<br/>82KB<br/>EmptyState/loading 시]
    Main -.lazy.-> MP[MapPanel<br/>8KB<br/>지도 탭 진입 시]
    Main -.lazy.-> CP[CalendarPanel<br/>2KB<br/>일정 탭 진입 시]
    Main -.lazy.-> BP[BookmarkPanel<br/>4KB<br/>북마크 탭 진입 시]
    
    MP -.lazy chunk.-> TM[ThreeMap<br/>150KB<br/>3D 토글 시]
    TM -.lazy chunk.-> OP[overpass<br/>21KB<br/>코스 진행 시]
    OP -.lazy chunk.-> BJ[buildings-jongno<br/>111KB<br/>종로 진입 시]
    
    style Main fill:#1F3A8B,color:#fff
    style VR fill:#3B82F6,color:#fff
    style VG fill:#3B82F6,color:#fff
    style VL fill:#F4A12C,color:#fff
    style MP fill:#F4A12C,color:#fff
    style CP fill:#F4A12C,color:#fff
    style BP fill:#F4A12C,color:#fff
    style TM fill:#F4A12C,color:#fff
    style OP fill:#F4A12C,color:#fff
    style BJ fill:#F4A12C,color:#fff
```

초기 critical path: `index.html → index.css + index.js + vendor-react + vendor-gsap ≈ 163KB gzip`. 나머지는 사용자 액션 시점에 fetch.

---

## 14. CSS 비차단 로딩 + IntersectionObserver

```mermaid
sequenceDiagram
    participant Build as Vite Plugin (build)
    participant HTML
    participant Browser
    participant Observer as IntersectionObserver

    rect rgb(243, 244, 246)
    Note over Build,HTML: build time
    Build->>HTML: transformIndexHtml
    Build->>HTML: link[rel=stylesheet] → preload+onload
    Build->>HTML: + noscript fallback
    end

    rect rgb(243, 244, 246)
    Note over HTML,Browser: runtime — CSS 비차단
    HTML->>Browser: parse
    Browser->>Browser: preload 시작 (non-blocking)
    Browser->>Browser: 즉시 paint (CSS 없이도 가능)
    Note over Browser: LCP critical path<br/>에서 CSS 차단 0
    Browser->>Browser: CSS arrive → onload<br/>this.rel='stylesheet'
    end

    rect rgb(243, 244, 246)
    Note over Browser,Observer: 메시지 진입 감지 — IO 채택
    Browser->>Observer: 메시지 DOM mount
    Observer->>Observer: native off-main-thread<br/>layout 측정 0
    Observer-->>Observer: isIntersecting 감지
    Observer->>Observer: gsap.from fade-in
    Observer->>Observer: disconnect (once)
    end
```

이전 ScrollTrigger 가 메시지 N개 layout 측정 → forced reflow 35ms. IO 로 0.

---

## 종합 — 데이터 흐름 마스터 다이어그램

```mermaid
flowchart TB
    User((사용자))
    
    subgraph FE[FE - Vercel React 19]
        Chat[ChatStore<br/>SSE 16종 통합]
        Map[mapStore + projector]
        BM[bookmarkStore<br/>optimistic]
        Cal[calendarStore<br/>4상태]
        
        UI1[ChatInput + 사진]
        UI2[MessageBubble<br/>IO 진입 효과]
        UI3[GoogleMap<br/>InstancedMesh 마커]
        UI4[ThreeMap lazy<br/>Focus 빌딩]
        UI5[CalendarPanel]
    end

    subgraph Cache[FE Cache 인프라]
        PC[pointCache memory]
        Tile[Cache API tile]
        IDB[(IndexedDB<br/>district 30일 TTL)]
        LS[(localStorage<br/>bookmarks)]
    end

    subgraph Vercel[Vercel Edge]
        Rewrite[rewrite /api/*]
    end

    subgraph BE[BE GCE]
        SSE[(SSE stream<br/>chat/intent/...)]
        REST[REST endpoints<br/>place-bookmarks<br/>calendar<br/>upload]
        GoogleCal[Google Calendar API]
        GCS[GCS bucket]
        Overpass[OSM Overpass<br/>외부]
    end

    User --> UI1
    UI1 -->|text + image| Chat
    Chat <-->|SSE| SSE
    Chat --> Map
    Chat --> BM
    UI1 -->|multipart| Rewrite
    Rewrite --> REST
    REST --> GCS
    UI2 --> Chat
    UI3 <--> Map
    UI4 --> IDB
    IDB -.miss.-> Overpass
    UI4 --> Tile
    UI5 --> Cal
    Cal -->|GET events| Rewrite
    Rewrite --> REST
    REST --> GoogleCal
    BM <--> LS
    BM <-->|GET/POST/DELETE| Rewrite

    style FE fill:#EFF6FF
    style Cache fill:#FEF3C7
    style Vercel fill:#F0FDF4
    style BE fill:#FEE2E2
```

이 다이어그램이 시스템 전체 데이터 흐름의 single source. 면접/리뷰 시 한 장으로 설명 가능.
