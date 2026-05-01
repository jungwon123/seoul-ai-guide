# 디자인 패턴 레퍼런스

> 모든 블록 컴포넌트가 일관된 시각 언어를 유지하기 위한 패턴 정의.
> DESIGN.md 토큰을 기반으로 하며, 신규 컴포넌트 구현 시 이 문서를 먼저 참고.
> 관련: `docs/DESIGN.md` (토큰), `docs/REACT_BEST_PRACTICE.md` (코드 규칙)

---

## 1. 카드 패턴 (Card)

모든 인라인 블록(place, events, course, chart, calendar)은 동일한 카드 셸을 공유.

### 기본 카드 셸

```css
.block-card {
  background: var(--bg-surface);           /* #FFFFFF */
  border: 1px solid var(--border);         /* #E8E8E4 */
  border-radius: 16px;
  overflow: hidden;
}

/* 호버/탭 피드백 — 인터랙티브 카드만 */
.block-card--interactive:hover {
  border-color: var(--border-strong);      /* #D4D4CE */
  box-shadow: var(--shadow-md);            /* 0 4px 12px rgba(0,0,0,0.08) */
  transform: translateY(-1px);
  transition: all 0.15s ease;
}
```

### 카드 내부 구조

```
┌─ Card ──────────────────────────────┐
│ ┌─ Header ────────────────────────┐ │  border-bottom: 1px solid var(--border)
│ │ [아이콘] 제목         [액션버튼] │ │  padding: 12px 16px
│ └─────────────────────────────────┘ │  font: 14px/600 Pretendard
│ ┌─ Body ──────────────────────────┐ │
│ │ 콘텐츠 영역                     │ │  padding: 12px 16px
│ └─────────────────────────────────┘ │
│ ┌─ Footer ────────────────────────┐ │  border-top: 1px solid var(--border)
│ │ [버튼1]  |  [버튼2]             │ │  각 버튼 flex-1, 12px/500
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 블록별 카드 적용

| 블록 | Header 아이콘 | Footer 버튼 | interactive |
|------|--------------|-------------|-------------|
| `place` | 카테고리 색상 닷 | [지도] [예약] | O |
| `events` | 카테고리 아이콘 | [상세보기] [지도] | O |
| `course` | Clock 아이콘 | [3D 경로] [일정 추가] | X |
| `chart` | BarChart 아이콘 | 없음 | X |
| `calendar` | Calendar 아이콘 | [캘린더에서 보기] | X |
| `references` | (카드 아님, pill 목록) | - | - |

---

## 2. 뱃지 패턴 (Badge)

서비스 전반에 사용되는 상태 뱃지를 4가지 유형으로 통일.

### 2.1 상태 뱃지 (Status)

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
}
```

| 유형 | 배경 | 텍스트 | 사용처 |
|------|------|--------|--------|
| 긍정 (success) | `#ECFDF5` | `#059669` | 예약 확정, 일정 추가 완료, 영업 중 |
| 경고 (warning) | `#FFFBEB` | `#D97706` | D-day 임박, 리뷰 적음, 추정치 |
| 부정 (danger) | `#FEF2F2` | `#DC2626` | 예약 취소, 영업 종료, 매우 혼잡 |
| 중립 (neutral) | `var(--bg-subtle)` | `var(--text-secondary)` | 카테고리, 출처, 정보성 |

### 2.2 D-day 뱃지

```
D-7 이상   → neutral  "D-12"
D-1 ~ D-6  → warning  "D-4"
D-day      → danger   "D-Day"
진행 중     → success  "진행중"
종료       → neutral (회색) "종료"
```

### 2.3 혼잡도 뱃지

| 레벨 | 색상 | 텍스트 |
|------|------|--------|
| 여유 | success | 여유 |
| 보통 | warning | 보통 |
| 혼잡 | danger | 혼잡 |
| 매우 혼잡 | `#1A1A18` bg + `#FFFFFF` text | 매우 혼잡 |

### 2.4 의도 분류 뱃지 (Intent)

```css
.intent-badge {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-subtle);
  padding: 2px 8px;
  border-radius: 6px;
}
```

매핑:
```
PLACE_SEARCH    → "장소 검색"
PLACE_RECOMMEND → "장소 추천"
EVENT_SEARCH    → "행사 검색"
COURSE_PLAN     → "코스 설계"
BOOKING         → "예약"
CROWDEDNESS     → "혼잡도"
COST_ESTIMATE   → "비용 견적"
ANALYSIS        → "리뷰 분석"
IMAGE_SEARCH    → "이미지 검색"
```

---

## 3. 버튼 패턴 (Button)

### 3.1 카드 Footer 버튼

```css
.card-action {
  flex: 1;
  padding: 10px 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--brand);                     /* #1C6EF2 */
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
}

.card-action:hover {
  background: var(--brand-subtle);         /* #EEF4FF */
}

/* 구분선 */
.card-action + .card-action {
  border-left: 1px solid var(--border);
}
```

### 3.2 외부 링크 버튼

외부 사이트로 이동하는 버튼은 항상 화살표 아이콘 포함.

```tsx
<button>
  상세보기 <ExternalLink size={12} />
</button>
```

### 3.3 Primary 액션 (CTA)

```css
.btn-primary {
  background: var(--brand);
  color: white;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
}

.btn-primary:hover {
  background: #1558CC;
}
```

사용처: 전송 버튼, Google 로그인, 확인 등 1개 화면에 최대 1개.

---

## 4. 인라인 지도 패턴 (Inline Map)

채팅 안에 삽입되는 지도 블록의 통일 규칙.

```css
.inline-map {
  height: 250px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--border);
  position: relative;
}

/* 확장 버튼 */
.inline-map__expand {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  background: white;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  box-shadow: var(--shadow-sm);
}
```

**규칙:**
- 인라인 상태: 스크롤/줌 **비활성** (채팅 스크롤과 충돌 방지)
- 탭하면 풀스크린 오버레이로 확장 → 모든 인터랙션 활성
- 마커 팝업은 풀스크린에서만 표시
- 인라인에서는 마커 + 경로만 보여주고 "N개 장소" 오버레이 텍스트

---

## 5. 인터랙션 패턴 (Interaction)

### 5.1 탭 동작 통일

| 대상 | 탭 동작 |
|------|---------|
| PlaceCard 본체 | 인라인 지도에서 해당 마커 하이라이트 |
| PlaceCard 버튼 | 각 버튼 고유 액션 (지도/예약) |
| EventCard 본체 | 없음 (버튼으로만 인터랙션) |
| 인라인 지도 | 풀스크린 확장 |
| 타임라인 경유지 | 인라인 지도 해당 마커로 이동 |
| 차트 | 없음 (정보 표시 전용) |

### 5.2 스와이프 동작

| 대상 | 스와이프 |
|------|----------|
| PlaceCarousel | 좌우 수평 스크롤 |
| EventCard 리스트 | 없음 (세로 스크롤) |
| 풀스크린 지도 | 핀치 줌 + 패닝 |

### 5.3 확장/축소 패턴

```
접기/펼치기 (analysis_sources):
  ▶ 분석 상세 보기          ← 기본 접힘
  ▼ 분석 상세 보기          ← 탭하면 펼침
    │ 내용...
    └─────────

애니메이션: height auto, 0.2s ease
```

---

## 6. 타이포그래피 매핑

| 용도 | 폰트 | 굵기 | 크기 | 색상 |
|------|------|------|------|------|
| 카드 제목 | Pretendard | 600 | 14px | `--text-primary` |
| 카드 본문 | Pretendard | 400 | 13px | `--text-primary` |
| 카드 메타 (시간, 거리) | Pretendard | 500 | 11px | `--text-muted` |
| 뱃지 텍스트 | Pretendard | 500 | 11px | (뱃지 색상별) |
| 카드 Footer 버튼 | Pretendard | 500 | 12px | `--brand` |
| 채팅 본문 | Pretendard | 400 | 14px | `--text-primary` |
| 채팅 타임스탬프 | Pretendard | 400 | 11px | `--text-muted` |
| 차트 라벨 | Pretendard | 500 | 11px | `--text-secondary` |
| 차트 제목 | Pretendard | 600 | 14px | `--text-primary` |

---

## 7. 카테고리 색상 매핑

장소 카드 마커, 카드 포인트 색상에 사용.

| 카테고리 | 색상 | Hex |
|----------|------|-----|
| 관광지 (tourism) | 블루 | `#2563EB` |
| 음식점 (food) | 레드 | `#DC2626` |
| 카페 (cafe) | 브라운 | `#92400E` |
| 문화 (culture) | 퍼플 | `#7C3AED` |
| 쇼핑 (shopping) | 오렌지 | `#EA580C` |
| 공연/전시 (performance) | 핑크 | `#DB2777` |
| 축제 (festival) | 틸 | `#0D9488` |
| 공공시설 (public) | 그레이 | `var(--text-secondary)` |

사용 규칙:
- 마커 핀: 해당 색상 100%
- 카드 카테고리 닷: 해당 색상 100%, 6px 원
- 카드 카테고리 뱃지 배경: 해당 색상 8% opacity
- 카드 카테고리 뱃지 텍스트: 해당 색상 100%

---

## 8. 간격 시스템 (Spacing)

```
4px  — 아이콘과 텍스트 간격, 뱃지 내부 패딩
8px  — 카드 내 요소 간격, 뱃지 좌우 패딩
12px — 카드 내부 패딩 (세로), 카드 간 간격
16px — 카드 내부 패딩 (가로), 섹션 간 간격
20px — 채팅 메시지 간 간격
```

---

## 9. 애니메이션 패턴

```css
/* 블록 등장 — 채팅 메시지와 동일 */
@keyframes blockIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.block-enter { animation: blockIn 0.2s ease-out; }

/* 접기/펼치기 */
.collapsible {
  overflow: hidden;
  transition: max-height 0.2s ease;
}

/* 뱃지 펄스 (D-day, 혼잡 등 주의 환기) */
@keyframes badgePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
.badge--urgent { animation: badgePulse 2s ease-in-out infinite; }
```

**규칙:**
- 모든 등장 애니메이션: 0.2s 이하 (DESIGN.md 준수)
- `transition`: border, shadow, background만 — transform 애니메이션은 등장 시만
- 로딩 스피너: `border-t` 회전만 사용 (DESIGN.md "네온/글로우 금지")

---

## 10. 블록 파서 → 컴포넌트 라우팅 패턴

WebSocket에서 typed 블록을 받아 렌더링하는 통일 패턴.

```tsx
// BlockRenderer.tsx — 단일 진입점
function BlockRenderer({ block }: { block: StreamBlock }) {
  switch (block.type) {
    case 'text':              return <TextBlock content={block.content} />;
    case 'intent':            return <IntentBadge intent={block.content} />;
    case 'place':             return <PlaceCard place={block.content} />;
    case 'places':            return <PlaceCarousel places={block.content} />;
    case 'events':            return <EventCardList events={block.content} />;
    case 'course':            return <ItineraryCard itinerary={block.content} />;
    case 'map_markers':       return <InlineMap markers={block.content} />;
    case 'map_route':         return <InlineMap route={block.content} />;
    case 'chart':             return <ChartBlock chart={block.content} />;
    case 'calendar':          return <CalendarResultCard result={block.content} />;
    case 'references':        return <ReferencesPills refs={block.content} />;
    case 'analysis_sources':  return <AnalysisDetail sources={block.content} />;
    case 'done':              return null;
    default:                  return null;
  }
}
```

**규칙:**
- 하나의 에이전트 응답 = `StreamBlock[]` 배열
- 각 블록은 `BlockRenderer`를 통해 독립 렌더링
- 블록 간 간격: `space-y-3` (12px)
- 알 수 없는 블록 타입: 무시 (에러 아님)

---

## 11. 관련 스킬/문서 인덱스

| 파일 | 역할 | 참조 시점 |
|------|------|-----------|
| `docs/DESIGN.md` | 컬러, 타이포, 그림자, "하지 말 것" | 컴포넌트 스타일링 시 |
| `docs/REACT_BEST_PRACTICE.md` | 컴포넌트 설계, 상태관리, 훅 규칙 | 코드 작성 시 |
| `docs/design-docs/ui-improvement-criteria.md` | 자율 개선 가능/불가 범위 | Claude 자율 수정 시 |
| `docs/frontend-publishing-guide.md` | 기능별 데이터 스키마 + 와이어프레임 | 신규 기능 구현 시 |
| **이 문서** (`design-patterns.md`) | 공통 시각 패턴 (카드, 뱃지, 버튼, 간격) | 모든 UI 작업 시 |
| `.claude/skills/web-design-guidelines` | 웹 인터페이스 접근성/UX 감사 | UI 리뷰 시 |
| `.claude/skills/vercel-react-best-practices` | React 성능 최적화 64개 규칙 | 성능 최적화 시 |
| `.claude/skills/vercel-composition-patterns` | 컴포넌트 합성 패턴 (boolean prop 회피 등) | 컴포넌트 설계 시 |

### 스킬 사용법

```bash
# UI 접근성/디자인 리뷰
/web-design-guidelines src/components/chat/PlaceCard.tsx

# React 성능 패턴 적용
/vercel-react-best-practices

# 컴포넌트 아키텍처 리뷰
/vercel-composition-patterns
```

---

## 체크리스트 (신규 블록 컴포넌트 구현 전)

- [ ] 카드 셸이 `.block-card` 패턴을 따르는가
- [ ] 뱃지가 4가지 유형(success/warning/danger/neutral) 중 하나인가
- [ ] 폰트 크기/굵기가 타이포그래피 매핑표와 일치하는가
- [ ] 카테고리 색상이 매핑표에 정의된 색상인가
- [ ] 간격이 4/8/12/16/20px 시스템을 따르는가
- [ ] 등장 애니메이션이 0.2s 이하인가
- [ ] 인터랙티브 요소에 `aria-label`이 있는가
- [ ] DESIGN.md "하지 말 것" 7가지를 위반하지 않는가
