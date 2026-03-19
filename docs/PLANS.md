# PLANS.md

프론트엔드 UI 퍼블리싱 실행 계획 및 마일스톤.

---

## 현재 단계: Phase 1 — UI 퍼블리싱 (Mock)

백엔드/ERD 미설계 상태에서 전체 UI를 Mock 데이터로 구현.

---

## 마일스톤

### M1. 기반 세팅 ✅
- [x] Next.js + Tailwind + Zustand 프로젝트 초기화
- [x] 디자인 토큰 (CSS Variables) 설정
- [x] 공통 UI 컴포넌트 구현 (Button, Card, Modal, Badge)
- [x] Mock 데이터 파일 작성 (`/src/mocks/`)
- [x] 폰트 세팅 (Pretendard + DM Serif Display)

### M2. 채팅 UI ✅
- [x] 메시지 레이아웃 (풀스크린 싱글 뷰)
- [x] MessageBubble (user / agent)
- [x] AgentSwitcher (하단 시트 에이전트 선택)
- [x] 타이핑 인디케이터 애니메이션
- [x] ChatInput + 예시 질문 칩
- [x] 스트리밍 응답 (글자 순차 출력 + 커서 blink)
- [x] 채팅 히스토리 사이드바 (햄버거 메뉴)

### M3. 지도 UI ✅
- [x] 카카오맵 SDK 실연동
- [x] 장소 마커 (카테고리별 색상)
- [x] 경로 폴리라인
- [x] 장소 상세 카드
- [x] dynamic import (ssr: false)

### M4. 캘린더 UI ✅
- [x] 일정 카드 컴포넌트 (타임라인 UI)
- [x] .ics 파일 다운로드
- [x] 일정 추가/삭제

### M5. 예약 UI ✅
- [x] 예약 폼 모달 (3단계: 폼 → 확인 → 완료)
- [x] 예약 카드 (상태별 Badge)
- [x] 예약 패널

### M6. 온보딩 ✅
- [x] 스플래시 화면 (Seoul Edit)
- [x] 에이전트 선택 화면
- [x] 관심사 선택 화면
- [x] localStorage 저장

### M7. 통합 및 polish ✅
- [x] 모바일 퍼스트 레이아웃 (Seoul Flow)
- [x] AgentOrb (유기적 글로우 구체)
- [x] CompactOrb (헤더용 소형)
- [x] PlaceCarousel (수평 스크롤 카드)
- [x] 풀스크린 오버레이 (지도/일정/예약)
- [x] ErrorBoundary + EmptyState
- [x] 애니메이션 (messageIn, fadeUp, scaleIn, stagger)

### M8. 성능 최적화 ✅
- [x] Lighthouse Performance 87점 달성
- [x] CSS @import 렌더 블로킹 제거 → next/font 전환
- [x] optimizePackageImports: lucide-react 번들 트리쉐이킹
- [x] Zustand 개별 셀렉터 (리렌더 최적화)
- [x] KakaoMap / BookingForm dynamic import
- [x] Kakao SDK strategy: lazyOnload
- [x] localStorage try-catch (프라이빗 브라우징 대응)
- [x] Hydration mismatch 해결 (mounted 패턴)
- [ ] Lighthouse 90+ 목표 추가 최적화
- [ ] next/font로 Pretendard 셀프호스팅
- [ ] Image 컴포넌트 적용 (장소 이미지)
- [ ] React.memo 적용 (PlaceCarousel 카드)

---

## 작업 우선순위

1. ~~**M1 → M2** (채팅이 핵심 인터페이스)~~ ✅
2. ~~**M3** (지도는 차별화 포인트)~~ ✅
3. ~~**M5 → M4** (예약 먼저, 캘린더 후)~~ ✅
4. ~~**M6 → M7** (온보딩 + 마무리)~~ ✅
5. **M8** (성능 최적화 — 진행 중)

---

## 기술 부채 트래커

`docs/exec-plans/tech-debt-tracker.md` 참고

---

## 연관 문서

- 컴포넌트 구조 → `docs/FRONTEND.md`
- 에이전트 스키마 → `AGENTS.md`
- 각 화면 스펙 → `docs/product-specs/`
- 디자인 시스템 → `docs/DESIGN.md`
- React 패턴 → `docs/REACT_BEST_PRACTICE.md`
