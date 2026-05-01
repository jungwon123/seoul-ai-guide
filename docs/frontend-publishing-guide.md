# 프론트엔드 퍼블리싱 가이드라인

> 기획서 v4 기반. 각 기능별 UI 설계 방향, 필요 데이터, UX 권장사항 정리.
> FE 담당: 이정원 | 작성일: 2026-04-06

---

## 0. UI 아키텍처 원칙

기획서 핵심: **"단일 채팅 페이지. 장소 카드·지도·차트·캘린더를 채팅창 인라인 표시"**

```
┌─────────────────────────────────────────┐
│  Header (세션 관리 + 설정)               │
├─────────────────────────────────────────┤
│                                         │
│  채팅 메시지 스크롤 영역                  │
│                                         │
│  ┌─ text block ──────────────────────┐  │
│  │ 마크다운 텍스트 (스트리밍)          │  │
│  └───────────────────────────────────┘  │
│  ┌─ places block ────────────────────┐  │
│  │ [카드1] [카드2] [카드3] → 수평 스크롤│  │
│  └───────────────────────────────────┘  │
│  ┌─ map block ───────────────────────┐  │
│  │ 인라인 지도 (마커 + 경로)           │  │
│  └───────────────────────────────────┘  │
│  ┌─ chart block ─────────────────────┐  │
│  │ 레이더/바 차트                     │  │
│  └───────────────────────────────────┘  │
│                                         │
├─────────────────────────────────────────┤
│  ChatInput (텍스트 + 이미지 업로드)      │
└─────────────────────────────────────────┘
```

### 지도를 별도 페이지로 빼지 않는 이유

기획서 명시: "모든 기능은 채팅 창 하나에서 처리". 지도는 **채팅 인라인 블록**으로 표시.
단, 지도 블록 우상단에 **"전체 화면" 버튼**을 두어 풀스크린 오버레이로 확장 가능하게 처리.

```
[인라인 지도 블록] → 탭하면 → [풀스크린 지도 오버레이]
                                 ├── 3D 토글
                                 ├── 경로 네비게이션
                                 └── 닫기 → 채팅으로 복귀
```

---

## 1. 기능별 퍼블리싱 가이드라인

---

### 1.1 채팅 UI (Phase 1) ✅ 구현 완료

**블록 타입**: `text`

**현재 상태**: Mock 스트리밍 구현 완료. WebSocket 연동 필요.

**변경 필요사항**:
- Mock `streamResponse()` → WebSocket `wss://api/ws/chat/{chat_id}` 전환
- typed 블록 파서 구현 (서버가 `{type: "text", content: "..."}` 형태로 전송)
- `intent` 블록 수신 시 의도 분류 뱃지 표시 (선택적)

**필요 데이터 (WebSocket)**:
```ts
// Server → Client 블록 스트림
interface StreamBlock {
  type: 'intent' | 'text' | 'place' | 'places' | 'events' | 'course'
      | 'map_markers' | 'map_route' | 'chart' | 'calendar'
      | 'references' | 'analysis_sources' | 'done';
  content: unknown; // type별 상이
}

// text 블록은 토큰 단위 스트리밍
interface TextStreamBlock {
  type: 'text';
  content: string;   // 누적 또는 delta
  streaming: boolean; // true면 진행 중
}
```

**UX 권장**:
- 의도 분류 뱃지는 메시지 상단에 작고 투명하게 (예: `🔍 장소 검색`)
- `done` 블록 수신 전까지 입력 비활성화
- 스트리밍 중 스크롤 자동 하단 고정 (현재 구현됨)

---

### 1.2 장소 검색 / 장소 추천 (Phase 1)

**블록 타입**: `place` (단일), `places` (리스트)

**UI 설계**: 수평 스크롤 카드 캐러셀 (현재 `PlaceCarousel` 활용)

```
┌──────────────────────────────────────────┐
│  [📍 장소 검색 결과]                      │
│  ┌────────┐ ┌────────┐ ┌────────┐  →    │
│  │ 이미지  │ │ 이미지  │ │ 이미지  │       │
│  │ 상호명  │ │ 상호명  │ │ 상호명  │       │
│  │ ⭐ 4.5 │ │ ⭐ 4.2 │ │ ⭐ 4.8 │       │
│  │ 카테고리│ │ 카테고리│ │ 카테고리│       │
│  │ [지도] [예약]│ ...   │ ...    │       │
│  └────────┘ └────────┘ └────────┘       │
└──────────────────────────────────────────┘
```

**필요 데이터**:
```ts
interface PlaceBlock {
  type: 'place';
  content: {
    place_id: string;
    name: string;
    category: string;           // "카페" | "음식점" | "관광지" 등
    sub_category?: string;      // "이탈리안" | "한식" 등
    address: string;
    district: string;           // "종로구"
    lat: number;
    lng: number;
    rating?: number;            // Google Places 평점
    photo_url?: string;         // Google Places Photos API URL
    business_hours?: Record<string, string>; // {"월": "09:00-22:00", ...}
    phone?: string;
    booking_url?: string;       // 예약 딥링크
    attributes?: {              // 가변 속성
      parking?: boolean;
      wifi?: boolean;
      pet_friendly?: boolean;
    };
    price_level?: number;       // 1~4 (Google)
    price_estimate?: string;    // "2인 기준 약 3~5만원" (LLM 추정)
    recommendation_reason?: string; // 추천 이유 (place_recommend일 때)
  };
}
```

**UX 권장**:
- 카드 탭 → 인라인 지도 블록 자동 스크롤 (해당 마커 하이라이트)
- 추천 결과는 `recommendation_reason`을 카드 하단에 1줄로 표시
- 이미지 없는 장소 → 카테고리별 기본 일러스트 (현재 placeholder 패턴 유지)
- 영업 중/종료 뱃지: `business_hours` 파싱하여 실시간 표시

---

### 1.3 행사/축제 검색 (Phase 1)

**블록 타입**: `events`

**UI 설계**: 세로 카드 리스트 (수평 스크롤 아님 — 행사는 정보량이 많아 세로가 적합)

```
┌──────────────────────────────────┐
│  🎭 행사 검색 결과                │
│  ┌──────────────────────────────┐│
│  │ [포스터]  제목               ││
│  │           📅 4/10~4/15      ││
│  │           📍 세종문화회관     ││
│  │           💰 30,000원~      ││
│  │           D-4  [상세보기]    ││
│  └──────────────────────────────┘│
│  ┌──────────────────────────────┐│
│  │ ...                          ││
│  └──────────────────────────────┘│
└──────────────────────────────────┘
```

**필요 데이터**:
```ts
interface EventsBlock {
  type: 'events';
  content: {
    event_id: string;
    title: string;
    category: string;        // "공연" | "전시" | "축제" | "강좌"
    place_name: string;
    address: string;
    lat?: number;
    lng?: number;
    date_start: string;      // "2026-04-10"
    date_end: string;        // "2026-04-15"
    price?: string;          // "30,000원" | "무료"
    poster_url?: string;     // 포스터 이미지
    detail_url: string;      // 외부 상세 페이지
    summary?: string;        // LLM 생성 1~2줄 요약
    source: string;          // "KOPIS" | "서울시" | "네이버"
  }[];
}
```

**UX 권장**:
- D-day 뱃지 자동 계산 (D-4, D-day, 진행중, 종료)
- 종료된 행사는 회색 처리 + "종료됨" 뱃지
- 포스터 이미지가 있으면 좌측 썸네일, 없으면 카테고리 아이콘
- `[상세보기]` → `detail_url` 외부 링크 (새 탭)
- `[지도에서 보기]` → 인라인 지도 블록 스크롤

---

### 1.4 코스 추천 (Phase 1)

**블록 타입**: `course` + `map_route`

**UI 설계**: 타임라인 카드 (현재 `ItineraryCard` 확장) + 인라인 지도

```
┌──────────────────────────────────┐
│  🗺️ 홍대 카페 전시 코스          │
│                                  │
│  ① 10:00  카페 온도 ──── 60분    │
│     │      🚶 도보 8분            │
│  ② 11:08  플랫폼엘 ──── 45분    │
│     │      🚇 지하철 15분         │
│  ③ 12:08  세종문화회관 ─ 90분    │
│     │      🚶 도보 5분            │
│  ④ 13:43  광장시장 ──── 60분     │
│                                  │
│  총 3시간 43분 · 도보 1.2km      │
│  [3D 경로 보기] [일정 추가]       │
└──────────────────────────────────┘
┌──────────────────────────────────┐
│  [인라인 지도]                    │
│  ①──②──③──④ 경로 폴리라인       │
│  번호 뱃지 마커                   │
│                    [전체 화면 ↗]  │
└──────────────────────────────────┘
```

**필요 데이터**:
```ts
interface CourseBlock {
  type: 'course';
  content: {
    title: string;
    total_duration: number;     // 총 소요시간 (분)
    total_distance?: number;    // 총 이동거리 (m)
    stops: {
      order: number;
      place_id: string;
      place_name: string;
      category: string;
      lat: number;
      lng: number;
      arrival_time: string;     // "10:00"
      duration: number;         // 체류시간 (분)
      transport_to_next: 'walk' | 'subway' | 'bus' | 'taxi';
      travel_time_to_next: number;  // 이동시간 (분)
      travel_distance_to_next?: number; // 이동거리 (m)
      photo_url?: string;
    }[];
  };
}

interface MapRouteBlock {
  type: 'map_route';
  content: {
    center: { lat: number; lng: number };
    zoom: number;
    markers: {
      order: number;
      lat: number;
      lng: number;
      label: string;   // 장소명
    }[];
    polyline: [number, number][]; // OSRM 실제 도보 경로 좌표
  };
}
```

**UX 권장**:
- 타임라인 카드와 지도 블록은 항상 쌍으로 표시
- 타임라인 경유지 탭 → 지도에서 해당 마커 하이라이트 + 팝업
- `[3D 경로 보기]` → 풀스크린 3D 오버레이 (현재 구현됨)
- `[일정 추가]` → Google Calendar 연동 (Phase 1)

---

### 1.5 예약 연동 (Phase 1)

**블록 타입**: 별도 블록 없음 — `place` 카드 내 `[예약하기]` 버튼

**UI 설계**: 딥링크 기반 외부 연동 (자체 예약 폼 아님)

```
PlaceCard 내부:
  [예약하기] → booking_url 외부 이동

카테고리별 딥링크 대상:
  음식점  → 네이버 예약 / 캐치테이블
  행사    → 인터파크 / YES24 / KOPIS
  공공시설 → 서울시 공공서비스예약
  숙박    → 여기어때 / 야놀자
  관광지  → 해당 사이트 직접 링크
```

**필요 데이터**: `place.booking_url` (string)

**UX 권장**:
- `booking_url` 없는 장소는 버튼 숨김 (disabled 아님)
- 외부 이동 시 "외부 사이트로 이동합니다" 토스트 표시
- 현재 `BookingCard` (Mock 예약 폼) → 딥링크 버튼으로 단순화

---

### 1.6 일정 추가 — Google Calendar (Phase 1)

**블록 타입**: `calendar`

**UI 설계**: 코스 카드 하단 `[일정 추가]` 버튼 → 결과 토스트

```
사용자: "이 코스 내일 일정에 추가해줘"
    ↓
에이전트: course 블록 표시 + calendar 블록
    ↓
calendar 블록:
  ┌────────────────────────────┐
  │ ✅ Google Calendar에 추가됨  │
  │ 📅 2026-04-07 10:00~14:00 │
  │ 홍대 카페 전시 코스          │
  │ [캘린더에서 보기]            │
  └────────────────────────────┘
```

**필요 데이터**:
```ts
interface CalendarBlock {
  type: 'calendar';
  content: {
    status: 'created' | 'failed';
    title: string;
    date: string;           // "2026-04-07"
    start_time: string;     // "10:00"
    end_time: string;       // "14:00"
    calendar_link?: string; // Google Calendar 웹 링크
    error?: string;         // 실패 시 메시지
  };
}
```

**UX 권장**:
- 성공 시 초록 뱃지 + 캘린더 링크
- 실패 시 "Google 로그인이 필요합니다" + 로그인 버튼
- 현재 `.ics` 다운로드 → Phase 2에서 Google Calendar MCP 직접 연동

---

### 1.7 지도 표시 (Phase 1)

**블록 타입**: `map_markers`, `map_route`

**UI 설계**: 채팅 인라인 지도 (높이 250px) + 전체 화면 확장

```
인라인 지도 블록 (Leaflet):
  ┌──────────────────────────────┐
  │  [마커들 + 경로 폴리라인]      │
  │                              │
  │              [2D/3D] [확장 ↗] │
  └──────────────────────────────┘

전체 화면 (탭 시):
  ┌──────────────────────────────┐
  │  Header: "지도" + [닫기]      │
  │  ┌──────────────────────────┐│
  │  │                          ││
  │  │  풀스크린 지도            ││
  │  │  + 경유지 팝업            ││
  │  │  + 3D 토글               ││
  │  │  + 네비게이션 HUD        ││
  │  │                          ││
  │  └──────────────────────────┘│
  │  [선택된 장소 카드]           │
  └──────────────────────────────┘
```

**필요 데이터**:
```ts
interface MapMarkersBlock {
  type: 'map_markers';
  content: {
    center: { lat: number; lng: number };
    zoom: number;
    markers: {
      place_id: string;
      lat: number;
      lng: number;
      label: string;
      category?: string;
      order?: number;     // 코스일 때 번호
    }[];
  };
}
```

**UX 권장**:
- 인라인 지도는 스크롤 제스처 비활성 (실수 방지) → 탭하면 전체 화면
- 코스 경로는 번호 뱃지 마커 (①②③) + 실선 폴리라인
- 장소 검색 결과는 카테고리별 색상 마커 (현재 구현됨)

---

### 1.8 혼잡도 분석 (Phase 2)

**블록 타입**: `text` + `chart`

**UI 설계**: 바 차트 (시간대별) + 현재 혼잡도 뱃지

```
┌──────────────────────────────────┐
│  📊 홍대입구역 실시간 혼잡도      │
│                                  │
│  현재: 🟡 보통 (14:00 기준)       │
│                                  │
│  ┌────────────────────────────┐  │
│  │  ██                        │  │  10시
│  │  ████                      │  │  12시
│  │  ██████████ ← 지금         │  │  14시
│  │  ████████████████          │  │  18시 (피크)
│  │  ██████████                │  │  20시
│  └────────────────────────────┘  │
│                                  │
│  💡 18시가 가장 혼잡해요.         │
│     16시 이전 방문을 추천합니다.   │
└──────────────────────────────────┘
```

**필요 데이터**:
```ts
interface ChartBlock {
  type: 'chart';
  content: {
    chart_type: 'bar' | 'radar' | 'line';
    title: string;
    data: {
      label: string;    // "10시", "12시" 등
      value: number;    // 0~100
      highlight?: boolean; // 현재 시간대
    }[];
    summary?: string;   // "18시가 가장 혼잡합니다"
  };
}
```

**UX 권장**:
- 혼잡도 레벨 뱃지: 🟢 여유 / 🟡 보통 / 🔴 혼잡 / ⚫ 매우 혼잡
- 현재 시간대 바 하이라이트
- Recharts `BarChart` 사용 (기획서 명시)
- 5분 갱신이지만 채팅 응답은 1회성 — 실시간 업데이트 불필요

---

### 1.9 비용 견적 (Phase 2)

**블록 타입**: `text` (구조화된 텍스트)

**UI 설계**: 비용 요약 카드

```
┌──────────────────────────────────┐
│  💰 홍대 카페 전시 코스 예상 비용  │
│                                  │
│  카페 온도        ☕  5,000원     │
│  플랫폼엘 전시    🎫 15,000원     │
│  점심 (광장시장)  🍜  8,000원     │
│  교통비           🚇  2,500원     │
│  ─────────────────────────────  │
│  총 예상 비용     💳 30,500원     │
│                                  │
│  ⚠️ 블로그 리뷰 기반 추정치입니다  │
│  출처: 네이버 블로그 (3건)        │
└──────────────────────────────────┘
```

**필요 데이터**: `text` 블록 내 마크다운 테이블 또는 별도 구조화 블록 (BE와 협의 필요)

**UX 권장**:
- 추정치임을 명확히 표시 (⚠️ 주의 문구)
- 출처 표기 (Google price_level / 블로그 / LLM 추정)
- 코스 비용은 코스 카드 하단에 요약 1줄로도 표시

---

### 1.10 리뷰 비교 (Phase 2)

**블록 타입**: `chart` (레이더) + `analysis_sources`

**UI 설계**: 레이더 차트 + 접기/펼치기 상세

```
┌──────────────────────────────────┐
│  📊 카페 온도 vs 스타벅스 리뷰 비교│
│                                  │
│       분위기                      │
│      ╱    ╲                      │
│   접근성    맛                    │
│      ╲    ╱                      │
│       가성비                      │
│                                  │
│  🔵 카페 온도  🟠 스타벅스         │
│                                  │
│  ▼ 분석 상세 보기                 │
│  ┌──────────────────────────────┐│
│  │ 분위기: 카페 온도 4.5 > 3.8   ││
│  │ 맛: 카페 온도 4.2 > 3.5      ││
│  │ 가성비: 스타벅스 4.0 > 3.2    ││
│  │ ...                          ││
│  │ 📎 원본 리뷰: "조용하고..."   ││
│  └──────────────────────────────┘│
└──────────────────────────────────┘
```

**필요 데이터**:
```ts
// chart 블록 (레이더)
interface RadarChartBlock {
  type: 'chart';
  content: {
    chart_type: 'radar';
    title: string;
    datasets: {
      label: string;      // "카페 온도"
      color: string;      // "#2563EB"
      values: {
        axis: string;     // "분위기" | "맛" | "가성비" | "서비스" | "청결" | "접근성"
        score: number;    // 1~5
      }[];
    }[];
  };
}

// 분석 출처 (접기/펼치기)
interface AnalysisSourcesBlock {
  type: 'analysis_sources';
  content: {
    places: {
      name: string;
      review_count: number;
      source_breakdown: { google: number; naver: number };
      sample_reviews: string[];  // 원본 리뷰 1~2개
    }[];
    analyzed_at: string;
  };
}
```

**UX 권장**:
- Recharts `RadarChart` 사용
- 6개 지표: 맛(taste), 서비스(service), 분위기(atmosphere), 가성비(value), 청결(cleanliness), 접근성(accessibility)
- `analysis_sources`는 기본 접힘 → "상세 보기" 탭으로 펼침
- 리뷰 수가 적으면 "⚠️ 리뷰 N건 기반 (참고용)" 경고

---

### 1.11 이미지 기반 장소 찾기 (Phase 2)

**블록 타입**: `place` (결과) — 입력은 이미지 업로드

**UI 설계**: ChatInput에 이미지 첨부 기능 추가

```
채팅 입력:
  ┌──────────────────────────────┐
  │ [📷] 메시지를 입력하세요  [전송] │
  └──────────────────────────────┘

이미지 첨부 시:
  ┌──────────────────────────────┐
  │  ┌──────┐                    │
  │  │ 미리  │ "이 카페 어디야?"  │
  │  │ 보기  │                    │
  │  └──────┘              [전송] │
  └──────────────────────────────┘

결과:
  ┌──────────────────────────────┐
  │ 🔍 이미지로 장소를 찾았어요!   │
  │                              │
  │  [장소 카드]  (OCR: "온도")   │
  │  신뢰도: 높음 ✅              │
  │                              │
  │  또는                        │
  │  비슷한 장소 Top 3:           │
  │  [카드1] [카드2] [카드3]      │
  └──────────────────────────────┘
```

**필요 데이터**:
```ts
// Client → Server
interface ImageMessage {
  message?: string;          // "이 카페 어디야?"
  image: string;             // base64 또는 presigned URL
  user_id: string;
}

// Server → Client: 기존 place/places 블록 재사용
// + 추가 메타
interface ImageSearchResult {
  method: 'ocr' | 'vision';    // 어떤 경로로 찾았는지
  confidence: 'high' | 'medium' | 'low';
  ocr_text?: string;           // 추출된 간판 텍스트
}
```

**UX 권장**:
- 이미지 업로드 중 프로그레스 표시
- OCR로 찾으면 "간판 '온도'를 인식했어요" 표시
- Vision으로 찾으면 "비슷한 분위기의 장소 Top 3" 표시
- 결과 카드에 신뢰도 뱃지 (높음/보통/낮음)

---

### 1.12 출처 표시 (공통)

**블록 타입**: `references`

**UI 설계**: 메시지 하단 pill 목록

```
┌──────────────────────────────────┐
│  출처: [Google Places] [네이버]   │
│        [KOPIS] [서울 열린데이터]   │
└──────────────────────────────────┘
```

**필요 데이터**:
```ts
interface ReferencesBlock {
  type: 'references';
  content: {
    label: string;   // "Google Places"
    url?: string;    // 클릭 시 이동
  }[];
}
```

---

### 1.13 즐겨찾기 (Phase 3)

**블록 타입**: `place` 카드 내 하트 버튼

**UI 설계**: 장소 카드 우상단 ♡ 토글 + 즐겨찾기 패널

```
PlaceCard:
  ┌────────────────┐
  │ [이미지]    ♡/♥ │  ← 탭으로 토글
  │ 상호명          │
  │ ...             │
  └────────────────┘

즐겨찾기 패널 (헤더 아이콘):
  ┌──────────────────────────────┐
  │ ♥ 즐겨찾기 (12개)             │
  │ [카드1] [카드2] [카드3] ...   │
  └──────────────────────────────┘
```

**필요 데이터**: `POST/DELETE /api/v1/users/me/favorites/{place_id}`

---

## 2. 3D 길안내 PoC 현황

### 현재 구현 완료 (직선 경로)

| 항목 | 상태 | 설명 |
|------|------|------|
| Three.js 3D 건물 렌더링 | ✅ | Overpass API + 로컬 캐시 (종로 8,200건) |
| 경유지별 건물 로딩 | ✅ | 반경 500m 필터링 + fade 전환 |
| CatmullRom 곡선 경로 | ✅ | 경유지 간 **직선 보간** 곡선 |
| 카메라 fly-through | ✅ | 경유지별 45도 앵글 애니메이션 |
| 네비게이션 HUD | ✅ | 진행률, 현재 구간, 이전/다음/재생 |
| geometry 병합 | ✅ | 색상 버킷 5개로 draw call 최소화 |

### 카카오 MCP 연동 시 가능 (Phase 2)

| 항목 | 필요 | 설명 |
|------|------|------|
| 실제 도로 경로 폴리라인 | 카카오 내비게이션 MCP | 현재 직선 → 실제 도보/차량 경로로 교체 |
| 정확한 이동 시간 | 카카오 내비게이션 MCP | 현재 고정값 → 실시간 교통 반영 |
| 턴바이턴 안내 | 카카오 내비게이션 MCP | "200m 앞에서 좌회전" 등 |

### 기획서 기준 변경 사항

기획서는 **Leaflet + OSRM** 조합을 사용. 우리 FE는 추가로 **Three.js 3D 뷰**를 구현한 상태.

```
기획서 기준 (2D):
  Leaflet 마커 + OSRM 실제 도보 경로 폴리라인
  → 이건 BE에서 OSRM polyline 좌표를 내려주면 바로 적용 가능

FE 추가 구현 (3D):
  Three.js 건물 렌더링 + 카메라 fly-through
  → OSRM polyline을 Three.js 경로로도 렌더링하면 실제 도로 따라 표시 가능
```

### GPS 연동 가능 여부

```
브라우저 Geolocation API:
  navigator.geolocation.watchPosition()
  → 위도/경도 실시간 제공 (정확도 ~10m)
  → Three.js GPS 마커 이동 (현재 updateGPSMarker 메서드 존재)

제한사항:
  - HTTPS 필수 (Vercel 배포 시 자동)
  - 실내에서 정확도 저하
  - 배터리 소모
  - 실제 네비 수준 UX는 네이티브 앱이 아니면 어려움

결론:
  "현재 위치 표시 + 경유지까지 직선 거리" → 가능 ✅
  "실시간 턴바이턴 네비게이션" → 카카오 MCP + 네이티브 앱 필요 ⚠️
```

---

## 3. 블록 타입 → 컴포넌트 매핑

| 블록 타입 | FE 컴포넌트 | 현재 상태 | 비고 |
|-----------|-------------|-----------|------|
| `text` | `MessageBubble` | ✅ 완료 | 마크다운 렌더 추가 필요 |
| `intent` | `IntentBadge` (신규) | ❌ | 선택적, 작은 뱃지 |
| `place` | `PlaceCard` | ✅ 완료 | booking_url 딥링크 추가 |
| `places` | `PlaceCarousel` | ✅ 완료 | |
| `events` | `EventCard` (신규) | ❌ | D-day 뱃지, 포스터 |
| `course` | `ItineraryCard` | ✅ 완료 | OSRM 폴리라인 연동 |
| `map_markers` | `InlineMap` (신규) | ❌ | 인라인 Leaflet 250px |
| `map_route` | `InlineMap` + polyline | ❌ | OSRM 좌표 렌더 |
| `chart` | `ChartBlock` (신규) | ❌ | Recharts 래퍼 |
| `calendar` | `CalendarResultCard` (신규) | ❌ | 성공/실패 카드 |
| `references` | `ReferencesPills` (신규) | ❌ | pill 목록 |
| `analysis_sources` | `AnalysisDetail` (신규) | ❌ | 접기/펼치기 |
| `done` | (렌더링 없음) | - | 스트림 종료 신호 |

---

## 4. 신규 컴포넌트 구현 우선순위

### Phase 1 (Week 3~4)

1. **WebSocket 블록 파서** — typed 블록 스트림 → 컴포넌트 라우팅
2. **InlineMap** — 채팅 인라인 Leaflet (250px) + 전체 화면 확장
3. **EventCard** — 행사 카드 (D-day, 포스터, 외부 링크)
4. **ReferencesPills** — 출처 pill 목록
5. **PlaceCard 확장** — booking_url 딥링크, 영업 상태 뱃지

### Phase 2 (Week 4~5)

6. **ChartBlock** — Recharts 래퍼 (bar, radar, line)
7. **AnalysisDetail** — 리뷰 분석 접기/펼치기
8. **CalendarResultCard** — Google Calendar 연동 결과
9. **ChatInput 이미지 업로드** — 미리보기 + 전송
10. **IntentBadge** — 의도 분류 뱃지 (선택적)

### Phase 2+ (Week 5~6)

11. **3D 뷰 OSRM 폴리라인 통합** — BE에서 받은 실제 경로를 Three.js에 렌더
12. **GPS 현재 위치 표시** — Geolocation API + 3D 마커
