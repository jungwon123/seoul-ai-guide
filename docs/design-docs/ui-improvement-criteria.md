# UI 개선 기준 (ui-improvement-criteria.md)

Claude가 UI를 **능동적으로 개선**할 때 판단하는 기준입니다.
`claude-gc.yml` 의 UI 개선 태스크가 이 문서를 근거로 작동합니다.

"더 좋은 UI"는 주관적이므로, Claude가 개선할 수 있는 범위를 **명확하게 한정**합니다.

---

## 개선 가능 범위 (Claude가 자율적으로 수정 가능)

### ✅ 1. 접근성 (Accessibility)
기준이 명확하므로 Claude가 자율 수정 가능.

```tsx
// 개선 전
<button onClick={handleClick}>
  <Icon />
</button>

// 개선 후
<button onClick={handleClick} aria-label="지도에서 보기">
  <Icon />
</button>
```

- 인터랙티브 요소에 `aria-label` 누락 → 추가
- 이미지에 `alt` 누락 → 추가
- 색상 대비가 WCAG AA 미달 → DESIGN.md 토큰 기준으로 교체
- 키보드 포커스 스타일 없는 버튼 → `focus-visible` 스타일 추가

### ✅ 2. 일관성 (Consistency)
DESIGN.md 토큰과 다른 값을 쓰는 경우 → 토큰으로 교체.

```tsx
// 개선 전 — 하드코딩된 색상
<div style={{ color: '#4fffb0' }}>

// 개선 후 — 디자인 토큰
<div style={{ color: 'var(--color-brand-primary)' }}>
```

- 하드코딩된 색상/폰트/여백 → CSS Variables로 교체
- 버튼 스타일이 컴포넌트마다 다름 → 공통 Button 컴포넌트로 통일

### ✅ 3. 빈 상태 누락 (Missing Empty State)
데이터가 없을 때 아무것도 안 보이는 컴포넌트 → EmptyState 추가.

```tsx
// 개선 전
const PlaceList = ({ places }) => (
  <div>{places.map(p => <PlaceCard key={p.id} place={p} />)}</div>
)

// 개선 후
const PlaceList = ({ places }) => {
  if (places.length === 0) return <EmptyState message="에이전트에게 장소를 추천받아보세요" />
  return <div>{places.map(p => <PlaceCard key={p.id} place={p} />)}</div>
}
```

### ✅ 4. 로딩 스켈레톤 누락
에이전트 응답 대기 중 아무것도 없는 컴포넌트 → Skeleton 추가.

### ✅ 5. 모바일 반응형 누락
`docs/DESIGN.md` 브레이크포인트 기준으로 대응 안 된 컴포넌트 → 반응형 스타일 추가.

---

## 개선 불가 범위 (사람이 결정해야 하는 것)

### ❌ 레이아웃 구조 변경
패널 위치, 분할 방식 등 — `docs/FRONTEND.md` 에 정의된 레이아웃을 Claude가 임의로 바꾸지 않는다.

### ❌ 디자인 콘셉트 변경
컬러 시스템, 폰트, 전체적인 무드 — `docs/DESIGN.md` 에 정의된 방향을 Claude가 바꾸지 않는다.

### ❌ 신규 기능 추가
없던 기능을 Claude가 스스로 추가하지 않는다. 기능 추가는 항상 이슈 → 사람 승인 → 구현 순서를 따른다.

### ❌ 애니메이션 전면 교체
기존 애니메이션을 Claude가 임의로 다른 스타일로 바꾸지 않는다. 단, **누락된 애니메이션 추가**는 가능.

---

## 개선 우선순위

Claude가 동시에 여러 개선점을 발견했을 때의 처리 순서:

```
1순위  접근성 문제 (aria, alt, 대비)     → 즉시 수정 PR
2순위  빈 상태 / 로딩 누락               → 즉시 수정 PR
3순위  디자인 토큰 불일치                → cleanup PR에 포함
4순위  반응형 누락                       → 별도 PR
5순위  성능 개선 (memo, lazy 등)         → tech-debt 이슈 등록
```

---

## claude-gc.yml 에서의 활용

매일 자정 가비지 컬렉션 실행 시 Claude는 이 문서를 읽고:

1. 개선 가능 범위 1~5번 항목 순서대로 스캔
2. 발견된 문제를 직접 수정
3. PR 본문에 이 문서의 어떤 기준을 적용했는지 명시

```
## 개선 내역
- [접근성] MapPanel 마커 버튼에 aria-label 추가 (ui-improvement-criteria.md #1)
- [일관성] ChatInput 색상 하드코딩 → var(--color-brand-primary) 교체 (#2)
- [빈 상태] CalendarPanel EmptyState 추가 (#3)
```
