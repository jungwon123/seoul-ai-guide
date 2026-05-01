# UI 상세 설계 명세

> `frontend-publishing-guide.md`의 보완 문서.
> 각 블록 컴포넌트의 **4가지 상태, 엣지 케이스, 반응형, 접근성, 마이크로 인터랙션**을 정의.
> Vercel Web Interface Guidelines 준수.

---

## 0. 공통 규칙

### 0.1 모든 블록의 4가지 상태

모든 인라인 블록 컴포넌트는 반드시 다음 4상태를 처리:

```
┌─ Loading ─────────────────────────┐
│  ┌───────────────────────────────┐│
│  │  ░░░░░░░░░░░░░  스켈레톤     ││
│  │  ░░░░░░░░                    ││
│  └───────────────────────────────┘│
└───────────────────────────────────┘

┌─ Error ───────────────────────────┐
│  ⚠️ 장소 정보를 불러올 수 없습니다  │
│  [다시 시도]                       │
└───────────────────────────────────┘

┌─ Empty ───────────────────────────┐
│  검색 결과가 없습니다.              │
│  다른 키워드로 검색해보세요.         │
└───────────────────────────────────┘

┌─ Populated (정상) ────────────────┐
│  [실제 콘텐츠]                     │
└───────────────────────────────────┘
```

**스켈레톤 규칙:**
- `background: var(--bg-subtle)` + `animate-pulse` (Tailwind)
- 실제 콘텐츠와 동일한 레이아웃 유지 (CLS 방지)
- 텍스트: 높이 14px 라운드 바, 너비 60~80% 랜덤
- 이미지: `aspect-ratio: 16/9` 회색 영역

**에러 메시지 규칙 (Web Interface Guidelines):**
- 에러 메시지에 **다음 행동**을 포함 ("다시 시도", "다른 키워드로 검색")
- 기술적 에러 코드는 숨기고 사용자 친화적 메시지만 표시

---

### 0.2 반응형 브레이크포인트

```
모바일 (기본):   < 640px   — 단일 컬럼, 풀 너비
태블릿:          640~1024px — 단일 컬럼, 최대 너비 640px 센터
데스크톱:        > 1024px   — 채팅 420px + 컨텍스트 패널
```

현재는 **모바일 퍼스트** 단일 뷰. 데스크톱 2단 레이아웃은 Phase 3.

---

### 0.3 접근성 공통 (Web Interface Guidelines)

```tsx
// 모든 아이콘 버튼에 aria-label 필수
<button aria-label="지도에서 보기"><MapPin size={16} /></button>

// 장식용 아이콘은 aria-hidden
<Clock size={14} aria-hidden="true" />

// 비동기 업데이트 알림 (스트리밍 완료, 예약 결과 등)
<div aria-live="polite">예약이 확정되었습니다</div>

// 카드 내 인터랙티브 요소: button 또는 a 사용 (div onClick 금지)
// focus-visible 스타일 필수
<button className="focus-visible:ring-2 focus-visible:ring-brand">

// 숫자 정렬이 필요한 곳 (시간, 가격)
<span className="tabular-nums">{price}</span>
```

---

### 0.4 텍스트 오버플로 처리

```tsx
// 장소명 (1줄 truncate)
<p className="truncate">{place.name}</p>

// 요약 텍스트 (2줄 clamp)
<p className="line-clamp-2">{place.summary}</p>

// flex 내부 텍스트 truncate 시 min-w-0 필수
<div className="flex min-w-0">
  <span className="truncate">{longText}</span>
</div>
```

---

### 0.5 애니메이션 (Web Interface Guidelines)

```css
/* prefers-reduced-motion 존중 필수 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* transition: all 금지 — 명시적 속성만 */
/* 나쁜 예 */ transition: all 0.15s;
/* 좋은 예 */ transition: border-color 0.15s, box-shadow 0.15s;

/* transform + opacity만 애니메이션 (리페인트 최소화) */
```

---

## 1. PlaceCard 상세 설계

### 1.1 레이아웃 (모바일 기준 너비 ~350px)

```
┌─ PlaceCard ────────────────────────────────────┐
│ ┌──────────────────────────────────────────────┐│
│ │              [이미지 16:9]              [♡]  ││  aspect-ratio: 16/9
│ │                                              ││  ♡: absolute top-8 right-8
│ │  ┌──────┐                                    ││
│ │  │카테고리│  ← 좌하단 뱃지                    ││  absolute bottom-8 left-8
│ │  └──────┘                                    ││
│ └──────────────────────────────────────────────┘│
│ ┌─ Body ───────────────────────────────────────┐│
│ │  상호명                          ⭐ 4.5 (32) ││  14px/600  +  11px/500 muted
│ │  종로구 · 한식                                ││  12px/400 text-secondary
│ │  🟢 영업 중 · 09:00~22:00                    ││  11px/500 success badge
│ │                                              ││
│ │  💬 "분위기가 좋고 커피가 맛있어요"            ││  12px/400 muted italic (추천이유)
│ │  💰 2인 기준 약 3~5만원                       ││  12px/400 muted
│ └──────────────────────────────────────────────┘│
│ ┌─ Footer ─────────────────────────────────────┐│
│ │     [지도에서 보기]    |    [예약하기 ↗]      ││
│ └──────────────────────────────────────────────┘│
└────────────────────────────────────────────────┘
```

### 1.2 상태별 처리

| 상태 | 표시 |
|------|------|
| 이미지 없음 | 카테고리별 그라디언트 placeholder (bg-subtle + 카테고리 아이콘 중앙) |
| rating 없음 | 별점 영역 숨김 (빈 공간 아님) |
| business_hours 없음 | 영업 상태 줄 전체 숨김 |
| booking_url 없음 | "예약하기" 버튼 숨김, "지도에서 보기" full width |
| price_estimate 없음 | 가격 줄 숨김 |
| recommendation_reason 없음 | 추천 이유 줄 숨김 |
| name 매우 긴 경우 (>30자) | 1줄 truncate + 말줄임표 |
| summary 매우 긴 경우 | 2줄 line-clamp |

### 1.3 접근성

```tsx
<article aria-label={`${place.name} - ${place.category}`}>
  <img
    src={place.photo_url}
    alt={`${place.name} 외관`}
    width={350} height={197}      // CLS 방지: 명시적 크기
    loading="lazy"                 // 뷰포트 밖이면 lazy
  />
  <button aria-label={`${place.name} 즐겨찾기 ${isFav ? '해제' : '추가'}`}>
    {isFav ? <HeartFilled /> : <Heart />}
  </button>
  <footer>
    <button aria-label={`${place.name} 지도에서 보기`}>지도에서 보기</button>
    {place.booking_url && (
      <a
        href={place.booking_url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${place.name} 예약 페이지 (외부 사이트)`}
      >
        예약하기 <ExternalLink size={12} aria-hidden="true" />
      </a>
    )}
  </footer>
</article>
```

### 1.4 마이크로 인터랙션

```
이미지 hover:
  transform: scale(1.02), 0.3s ease
  overflow: hidden으로 카드 밖 안 나감

즐겨찾기 탭:
  ♡ → ♥ 전환 시 scale(1.3) → scale(1.0) 바운스, 0.3s

카드 탭 (본체):
  border-color → var(--brand) 0.15s
  해당 마커가 지도에서 bounce 1회

예약 버튼 탭:
  토스트: "외부 사이트로 이동합니다" 2초 표시
```

---

## 2. PlaceCarousel 상세 설계

### 2.1 레이아웃

```
┌─ PlaceCarousel (overflow-x: auto, snap) ──────────────────────────┐
│                                                                     │
│  [PlaceCard 280px] 12px [PlaceCard 280px] 12px [PlaceCard 280px]   │
│                                                                     │
│  ← 스크롤 인디케이터 (3/5) →                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 스크롤 동작

```css
.carousel {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;           /* Firefox */
  padding: 0 16px;                 /* 양쪽 여백 */
}

.carousel::-webkit-scrollbar { display: none; }

.carousel > * {
  scroll-snap-align: start;
  flex-shrink: 0;
  width: 280px;
}
```

### 2.3 엣지 케이스

| 케이스 | 처리 |
|--------|------|
| 장소 1개 | 캐러셀 아님, 단일 카드 full width (max 350px) |
| 장소 2개 | 캐러셀, 2번째 카드 peek (20px 보임) |
| 장소 10개+ | 캐러셀 + 하단에 "N개 더 보기" 텍스트 |
| 스크롤 인디케이터 | 5개 이하: 닷, 6개+: "3/10" 텍스트 |

### 2.4 성능 (Web Interface Guidelines)

```tsx
// 10개 이상이면 뷰포트 밖 카드 lazy 렌더
// content-visibility: auto 적용
<div style={{ contentVisibility: 'auto', containIntrinsicSize: '280px 320px' }}>
  <PlaceCard place={place} />
</div>

// 이미지는 모두 loading="lazy" (첫 2개 제외)
```

---

## 3. EventCard 상세 설계

### 3.1 레이아웃 (세로 리스트)

```
┌─ EventCard ────────────────────────────────────┐
│ ┌──────┐  ┌───────────────────────────────────┐│
│ │포스터 │  │  🎭 공연                          ││  카테고리 뱃지 (neutral)
│ │80×106 │  │  뮤지컬 시카고                     ││  15px/600 title, 1줄 truncate
│ │(3:4)  │  │  📅 4/10(목)~4/15(화)             ││  12px/400 muted
│ │       │  │  📍 세종문화회관                   ││  12px/400 muted, 1줄 truncate
│ │       │  │  💰 30,000원~                     ││  12px/400 muted
│ │       │  │                                   ││
│ │       │  │  D-4 🟡                           ││  D-day 뱃지 (warning)
│ └──────┘  └───────────────────────────────────┘│
│ ┌─ Footer ─────────────────────────────────────┐│
│ │    [상세보기 ↗]    |    [지도에서 보기]        ││
│ └──────────────────────────────────────────────┘│
└────────────────────────────────────────────────┘
```

### 3.2 상태별 처리

| 상태 | 표시 |
|------|------|
| 포스터 없음 | 카테고리 아이콘 중앙 배치 (80x106 bg-subtle 영역) |
| 가격 없음 | 가격 줄 숨김 |
| 좌표 없음 | "지도에서 보기" 버튼 숨김 |
| 날짜 범위 = 하루 | "4/10(목)" (범위 표시 안 함) |
| 종료된 행사 | 카드 전체 `opacity: 0.5` + "종료" 뱃지 (neutral) |
| 제목 매우 긴 경우 | 1줄 truncate |
| 주소 매우 긴 경우 | 1줄 truncate |

### 3.3 D-day 계산 로직

```ts
function getDdayBadge(dateStart: string, dateEnd: string): { text: string; variant: BadgeVariant } {
  const now = new Date();
  const start = new Date(dateStart);
  const end = new Date(dateEnd);

  if (now > end) return { text: '종료', variant: 'neutral' };
  if (now >= start) return { text: '진행중', variant: 'success' };

  const daysUntil = Math.ceil((start.getTime() - now.getTime()) / 86400000);
  if (daysUntil === 0) return { text: 'D-Day', variant: 'danger' };
  if (daysUntil <= 6) return { text: `D-${daysUntil}`, variant: 'warning' };
  return { text: `D-${daysUntil}`, variant: 'neutral' };
}
```

### 3.4 접근성

```tsx
<article aria-label={`${event.title} - ${event.category} - ${ddayText}`}>
  <img
    src={event.poster_url}
    alt={`${event.title} 포스터`}
    width={80} height={106}
    loading="lazy"
  />
  <time dateTime={event.date_start}>
    {formatDateRange(event.date_start, event.date_end)}
  </time>
  <a
    href={event.detail_url}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={`${event.title} 상세 페이지 (외부 사이트)`}
  >
    상세보기 <ExternalLink size={12} aria-hidden="true" />
  </a>
</article>
```

---

## 4. InlineMap 상세 설계

### 4.1 레이아웃

```
┌─ InlineMap ─────────────────────────────────────┐
│                                                  │
│  [Leaflet 지도]                                  │  height: 250px
│  ①────②────③ 경로 폴리라인                       │  border-radius: 16px
│                                                  │
│  ┌─────┐                          ┌────────────┐│
│  │N개   │                          │ [확장 ↗]   ││  좌하단: 장소 수
│  │장소  │                          │ [2D/3D]    ││  우상단: 컨트롤
│  └─────┘                          └────────────┘│
└──────────────────────────────────────────────────┘
```

### 4.2 인라인 vs 풀스크린

| 기능 | 인라인 (250px) | 풀스크린 |
|------|---------------|----------|
| 드래그/패닝 | ❌ 비활성 | ✅ |
| 핀치 줌 | ❌ 비활성 | ✅ |
| 마커 팝업 | ❌ (마커만 표시) | ✅ (탭 시 팝업) |
| 경로 폴리라인 | ✅ 표시 | ✅ 표시 |
| 3D 토글 | ❌ | ✅ |
| 네비게이션 HUD | ❌ | ✅ |
| 장소 수 뱃지 | ✅ "3개 장소" | ❌ (마커로 충분) |

### 4.3 인라인 지도 제스처 처리 (Web Interface Guidelines)

```css
.inline-map {
  touch-action: pan-y;              /* 세로 스크롤만 통과 */
  -webkit-tap-highlight-color: transparent;
}

/* 탭 한 번 → 풀스크린, 더블탭 → 무시 (줌 방지) */
```

### 4.4 상태별 처리

| 상태 | 표시 |
|------|------|
| 마커 0개 | 렌더링 안 함 (블록 자체 숨김) |
| 마커 1개 | 지도 중앙 마커, 줌 16 |
| 마커 2~10개 | fitBounds로 모든 마커 포함 |
| 마커 10개+ | fitBounds + "10개 장소" 뱃지 |
| 경로 있을 때 | 폴리라인 + 번호 뱃지 마커 |
| 타일 로딩 중 | bg-subtle + 스피너 |
| 타일 로딩 실패 | "지도를 불러올 수 없습니다" + [다시 시도] |

### 4.5 마커 디자인

```
일반 마커 (장소 검색):
  ● 카테고리 색상 원 (12px)
  │ 아래 그림자

코스 마커 (경로):
  ① 번호 뱃지 (24px 원, 흰 배경 + brand 텍스트 + brand 보더)
  │ 아래 그림자
```

---

## 5. ChartBlock 상세 설계

### 5.1 바 차트 (혼잡도)

```
┌─ ChartBlock ───────────────────────────────────┐
│ ┌─ Header ────────────────────────────────────┐│
│ │ 📊 홍대입구역 실시간 혼잡도   🟡 보통        ││
│ └─────────────────────────────────────────────┘│
│ ┌─ Body ──────────────────────────────────────┐│
│ │                                             ││
│ │  Recharts BarChart                          ││  height: 200px
│ │  - 바 색상: var(--brand) 기본               ││  barRadius: 4px
│ │  - 하이라이트 바: var(--brand) 100%          ││
│ │  - 나머지 바: var(--brand) 30%              ││
│ │  - X축: 시간, Y축: 숨김                     ││
│ │  - 툴팁: "14시: 보통 (52/100)"              ││
│ │                                             ││
│ └─────────────────────────────────────────────┘│
│ ┌─ Summary ───────────────────────────────────┐│
│ │ 💡 18시가 가장 혼잡해요.                     ││  13px/400 text-secondary
│ │    16시 이전 방문을 추천합니다.               ││  padding: 12px 16px
│ └─────────────────────────────────────────────┘│
└────────────────────────────────────────────────┘
```

### 5.2 레이더 차트 (리뷰 비교)

```
┌─ ChartBlock ───────────────────────────────────┐
│ ┌─ Header ────────────────────────────────────┐│
│ │ 📊 카페 온도 vs 스타벅스                     ││
│ └─────────────────────────────────────────────┘│
│ ┌─ Body ──────────────────────────────────────┐│
│ │                                             ││
│ │  Recharts RadarChart                        ││  height: 250px
│ │  - 6축: 맛/서비스/분위기/가성비/청결/접근성   ││  outerRadius: 80
│ │  - dataset 1: 실선 + 20% 채움               ││
│ │  - dataset 2: 점선 + 10% 채움               ││
│ │  - 축 라벨: 11px Pretendard 500             ││
│ │                                             ││
│ └─────────────────────────────────────────────┘│
│ ┌─ Legend ─────────────────────────────────────┐│
│ │ 🔵 카페 온도 (리뷰 23건)                     ││  12px/400
│ │ 🟠 스타벅스 (리뷰 45건)                      ││  뱃지: neutral
│ └─────────────────────────────────────────────┘│
│ ┌─ Collapsible: 분석 상세 ▶ ──────────────────┐│
│ │ (접기/펼치기 — AnalysisDetail)               ││
│ └─────────────────────────────────────────────┘│
└────────────────────────────────────────────────┘
```

### 5.3 Recharts 공통 설정

```tsx
const CHART_THEME = {
  colors: {
    primary: '#1C6EF2',     // var(--brand)
    secondary: '#EA580C',   // 비교 대상
    grid: '#E8E8E4',        // var(--border)
    text: '#6B6B63',        // var(--text-secondary)
  },
  font: {
    family: 'Pretendard Variable, -apple-system, sans-serif',
    size: 11,
  },
  bar: {
    radius: [4, 4, 0, 0],   // 상단만 라운드
    barSize: 24,
  },
  radar: {
    outerRadius: 80,
    fillOpacity: 0.2,
    strokeWidth: 2,
  },
};
```

### 5.4 접근성

```tsx
// 차트는 시각적 요소 — 스크린 리더용 텍스트 제공
<figure aria-label={chart.title}>
  <figcaption className="sr-only">
    {chart.summary || `${chart.title} 차트`}
  </figcaption>
  <ResponsiveContainer width="100%" height={200}>
    <BarChart data={chart.data} aria-hidden="true">
      ...
    </BarChart>
  </ResponsiveContainer>
</figure>
```

---

## 6. CalendarResultCard 상세 설계

### 6.1 성공 상태

```
┌─ CalendarResultCard ───────────────────────────┐
│  ✅ Google Calendar에 추가됨                    │  success 뱃지
│                                                │
│  📅 2026-04-07 (월)                            │  13px/500
│  ⏰ 10:00 ~ 14:00                              │  13px/400 muted
│  📌 홍대 카페 전시 코스                          │  14px/600
│                                                │
│  [캘린더에서 보기 ↗]                             │  brand 링크
└────────────────────────────────────────────────┘
```

### 6.2 실패 상태

```
┌─ CalendarResultCard ───────────────────────────┐
│  ❌ 일정 추가 실패                               │  danger 뱃지
│                                                │
│  Google 계정 로그인이 필요합니다.                 │  13px/400
│                                                │
│  [Google 로그인]                                │  Primary CTA 버튼
│  [.ics 파일로 내려받기]                          │  text 링크 (대안)
└────────────────────────────────────────────────┘
```

---

## 7. ChatInput 이미지 업로드 상세 설계

### 7.1 기본 상태

```
┌─ ChatInput ────────────────────────────────────┐
│  [📷]  메시지를 입력하세요…              [전송]  │
└────────────────────────────────────────────────┘
      ↑ 카메라/갤러리 선택                   ↑ 비활성 (빈 입력)
```

### 7.2 이미지 첨부 상태

```
┌─ ChatInput ────────────────────────────────────┐
│  ┌────────┐                                    │
│  │ 미리보기│ ✕                                  │  60x60px, border-radius: 8px
│  │ 60x60  │                                    │  ✕: 제거 버튼 (absolute top-right)
│  └────────┘                                    │
│  [📷]  "이 카페 어디야?"                [전송]  │  전송 버튼 활성화 (이미지만으로도)
└────────────────────────────────────────────────┘
```

### 7.3 업로드 진행 상태

```
┌─ 사용자 메시지 ────────────────────────────────┐
│  ┌────────┐                                    │
│  │ 이미지  │  ← 업로드 중 overlay: progress bar  │
│  │ blur   │     25% ████░░░░░░░░░░             │
│  └────────┘                                    │
│  "이 카페 어디야?"                               │
└────────────────────────────────────────────────┘
```

### 7.4 파일 제한

```ts
const IMAGE_CONSTRAINTS = {
  maxSize: 5 * 1024 * 1024,        // 5MB
  acceptTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxDimension: 2048,               // 리사이즈 후 전송
};

// 초과 시 토스트: "5MB 이하의 이미지만 업로드 가능합니다"
```

### 7.5 접근성

```tsx
<label htmlFor="image-upload" aria-label="이미지 첨부">
  <Camera size={20} aria-hidden="true" />
</label>
<input
  id="image-upload"
  type="file"
  accept="image/jpeg,image/png,image/webp"
  className="sr-only"
  onChange={handleImageSelect}
/>
```

---

## 8. ReferencesPills 상세 설계

### 8.1 레이아웃

```
┌─ ReferencesPills ──────────────────────────────┐
│  출처:                                          │  11px/500 text-muted
│  ┌──────────────┐ ┌──────┐ ┌──────────────────┐│
│  │Google Places │ │네이버 │ │서울 열린데이터     ││  pill: 11px/400
│  └──────────────┘ └──────┘ └──────────────────┘│  gap: 6px, flex-wrap
└────────────────────────────────────────────────┘
```

### 8.2 pill 스타일

```css
.reference-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  text-decoration: none;
  transition: border-color 0.15s, color 0.15s;
}

/* URL이 있는 pill만 인터랙티브 */
a.reference-pill:hover {
  border-color: var(--brand);
  color: var(--brand);
}
```

---

## 9. AnalysisDetail (접기/펼치기) 상세 설계

### 9.1 접힌 상태

```
┌─ AnalysisDetail ───────────────────────────────┐
│  ▶ 분석 상세 보기                               │  12px/500 brand, cursor: pointer
└────────────────────────────────────────────────┘
```

### 9.2 펼친 상태

```
┌─ AnalysisDetail ───────────────────────────────┐
│  ▼ 분석 상세 보기                               │
│  ┌──────────────────────────────────────────┐  │
│  │  분위기  카페 온도 4.5  >  스타벅스 3.8   │  │  프로그레스 바 비교
│  │  ████████████████░░░  ████████████░░░░░  │  │
│  │  맛      카페 온도 4.2  >  스타벅스 3.5   │  │
│  │  ...                                     │  │
│  ├──────────────────────────────────────────┤  │
│  │  📎 원본 리뷰 (카페 온도)                 │  │  12px/400 muted
│  │  "조용하고 인테리어가 예뻐요. 라떼가..."   │  │  line-clamp-3
│  │                                          │  │
│  │  📎 원본 리뷰 (스타벅스)                  │  │
│  │  "접근성이 좋고 와이파이가 빠릅니다..."    │  │  line-clamp-3
│  ├──────────────────────────────────────────┤  │
│  │  분석 기준: Google 리뷰 23건 + 네이버 12건│  │  11px/400 muted
│  │  분석 시점: 2026-04-05                   │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

### 9.3 접기/펼치기 애니메이션

```tsx
// Web Interface Guidelines: transform + opacity만 애니메이션
// max-height 트랜지션 대신 grid 트릭 사용 (성능)
<div
  className="grid transition-[grid-template-rows] duration-200 ease-out"
  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
>
  <div className="overflow-hidden">
    {/* 내용 */}
  </div>
</div>
```

---

## 10. WebSocket 블록 스트리밍 UI 상태

### 10.1 스트리밍 중 전체 흐름

```
사용자 메시지 전송
    ↓
[입력창 비활성화 + 스피너]
    ↓
intent 블록 수신 → IntentBadge 표시 (fade in)
    ↓
text 블록 스트리밍 시작 → 글자 순차 표시 + 커서 blink
    ↓
places/course/map 블록 수신 → 해당 컴포넌트 fade in (blockIn 0.2s)
    ↓
references 블록 수신 → 하단 pills 표시
    ↓
done 블록 수신 → 커서 제거 + 입력창 활성화
```

### 10.2 블록 간 등장 타이밍

```
text 블록:      즉시 (토큰 단위 스트리밍)
place/places:   text 완료 후 0.1s delay → blockIn 0.2s
map:            places 완료 후 0.1s delay → blockIn 0.2s
chart:          text 완료 후 0.1s delay → blockIn 0.2s
references:     마지막 블록, 0.2s delay → fade in 0.15s
```

### 10.3 스트리밍 중단 처리

```
사용자가 새 메시지 전송:
  → 현재 스트리밍 중단 (WebSocket cancel 메시지)
  → 수신된 블록까지만 표시
  → 새 메시지 처리 시작

네트워크 끊김:
  → 3초 후 "연결이 끊어졌습니다" 토스트 (aria-live="assertive")
  → 자동 재연결 시도 (exponential backoff)
  → 재연결 성공: "연결되었습니다" 토스트 2초
```

---

## 11. 체크리스트 (신규 블록 구현 전)

### 기능 체크

- [ ] 4상태 (Loading/Error/Empty/Populated) 모두 구현했는가
- [ ] 스켈레톤이 실제 콘텐츠와 동일한 레이아웃인가
- [ ] 에러 메시지에 다음 행동이 포함되어 있는가
- [ ] 빈 상태에 안내 문구가 있는가

### 엣지 케이스 체크

- [ ] 텍스트 오버플로(truncate/line-clamp) 처리했는가
- [ ] 선택적 데이터(rating, photo, price 등) 없을 때 깨지지 않는가
- [ ] 데이터 1건일 때와 10건+ 일 때 레이아웃이 자연스러운가

### 접근성 체크 (Web Interface Guidelines)

- [ ] 아이콘 버튼에 `aria-label`이 있는가
- [ ] 장식 아이콘에 `aria-hidden="true"`가 있는가
- [ ] `<img>`에 `alt`, `width`, `height`가 있는가
- [ ] 인터랙티브 요소가 `<button>` 또는 `<a>`인가 (`<div onClick>` 아님)
- [ ] `focus-visible` 스타일이 있는가
- [ ] 비동기 결과에 `aria-live`가 있는가
- [ ] 외부 링크에 `target="_blank" rel="noopener noreferrer"`가 있는가
- [ ] 숫자에 `tabular-nums`가 적용되어 있는가

### 성능 체크

- [ ] 뷰포트 밖 이미지에 `loading="lazy"`가 있는가
- [ ] `transition: all` 대신 명시적 속성 트랜지션인가
- [ ] `prefers-reduced-motion`을 존중하는가
- [ ] 10개+ 리스트에 `content-visibility: auto` 또는 가상화가 있는가

### 디자인 패턴 체크

- [ ] `docs/design-patterns.md`의 카드 셸 패턴을 따르는가
- [ ] 뱃지가 4유형(success/warning/danger/neutral) 중 하나인가
- [ ] 간격이 4/8/12/16/20px 시스템을 따르는가
- [ ] 등장 애니메이션이 `blockIn 0.2s`인가
- [ ] DESIGN.md "하지 말 것" 7가지를 위반하지 않는가
