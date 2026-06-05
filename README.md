# Anyway — Seoul AI Guide

서울 관광 AI 에이전트 서비스. 자연어 한 마디를 **멀티 에이전트로 라우팅**해 장소·코스·이벤트를 **실시간 스트리밍(SSE)**으로 추천하고, **Google Maps** 위에 마커·경로로 시각화한다.

> UI 브랜드명은 **Anyway**, 레포지토리/배포 식별자는 `seoul-ai-guide`.

## Stack

- **Vite 6** + **React 19** + **TypeScript 5**
- **Tailwind CSS v4** (`@theme` 토큰 시스템)
- **Zustand 5** — 상태 관리 (10개 스토어, 단방향 흐름)
- **React Router 7**
- **Google Maps** (`@googlemaps/js-api-loader`) — AdvancedMarker / Polyline / OverlayView / **Photorealistic 3D Tiles**
- **GSAP** (애니메이션) · **Lottie**
- **SSE 스트리밍** — `fetch` + `AbortController` 커스텀 파서 (`lib/sse.ts`)
- **MSW** — 계약 기반 API 목킹 (BE 비의존 개발)
- **openapi-typescript** — BE OpenAPI → TS 타입 자동 생성
- **Vitest** + Testing Library

## Features

- 🤖 멀티 에이전트 채팅 (Discovery / Planning / Booking / Map / Calendar)
- ⚡ 실시간 토큰 스트리밍 + 16종 블록(텍스트·장소·코스·차트·지도 등) 렌더링
- 🗺️ Google Maps 시각화 — 마커·경로·혼잡도 오버레이, Photorealistic 3D
- 🧭 코스(일정) 설계 + 캘린더 연동(`.ics` 내보내기 / Google Calendar)
- 🔖 장소·대화 북마크, 대화 공유 링크
- 🎨 트렌디 그라데이션 디자인 정체성 (웜 그라데이션 + 라운드 헤비 그로테스크 + 레트로 융합)

## Development

```bash
pnpm install
pnpm dev          # http://localhost:5173 (점유 시 자동 다음 포트)
pnpm build        # tsc + vite build
pnpm test         # vitest
pnpm lint         # eslint
pnpm openapi:gen  # BE OpenAPI → src/types/openapi.ts 재생성
```

배포는 **Vercel** — `main` 브랜치 머지 시 자동 프로덕션 배포 (`vercel.json`).

## Project Structure

```
src/
├── App.tsx              # 루트 셸 (헤더 / 채팅 / 오버레이 패널)
├── main.tsx             # 엔트리 (라우팅, MSW, preloadError 가드)
├── globals.css          # Tailwind v4 @theme 토큰 + 디자인 유틸
├── components/
│   ├── agent/           # AgentOrb (캔버스 와이어프레임), CompactOrb
│   ├── chat/            # 메시지·입력·사이드바, blocks/ (블록 렌더러)
│   ├── map/             # GoogleMap, Google3DMap, MapPanel, NavigationHUD, 오버레이
│   ├── booking/         # 예약 폼/패널 (Mock)
│   ├── calendar/        # 일정 패널 / Google Calendar 연동
│   ├── bookmark/        # 북마크 패널
│   ├── auth/            # 로그인/회원가입, AuthLayout
│   ├── share/           # 공유 페이지 (read-only)
│   ├── onboarding/      # 투어 오버레이
│   └── ui/              # 공통 프리미티브 (Markdown=자체 경량 렌더러, Toaster 등)
├── stores/              # Zustand 스토어 (chat/map/bookmark/calendar/auth/tour/toast …)
├── lib/                 # sse, api, google-maps-loader, flip-to-marker, ics-export, utils …
├── mocks/               # MSW 핸들러 + Mock 데이터
└── types/               # 공통 타입 + 자동 생성 openapi.ts
```

## Documentation

- `AGENTS.md` — 에이전트 아키텍처 · 협업 원칙 · GitHub 워크플로우
- `CLAUDE.md` — Claude Code 작업 가이드
- `docs/PORTFOLIO.md` · `docs/portfolio.html` — 기술 포트폴리오 (SSE 파이프라인, 블록 어댑터, 번들 최적화 등)
- `docs/DESIGN.md` · `docs/design-patterns.md` · `docs/ui-detail-specs.md` — 디자인 시스템 / 컴포넌트 패턴 / 4상태·접근성
- `docs/be-requests.md` — BE 요청 사항 정리
- `docs/be-request-congestion.md` — 혼잡도(congestion) 연동 요청 (코스 stop 주입 + 데이터 점검)

## Notes

- **혼잡도(congestion)**: 장소(place/places) 경로는 FE/BE 계약 일치(정상). **코스(course) stop은 BE 미주입으로 현재 미표시** — `docs/be-request-congestion.md` 참고.
- **3D 지도**는 three.js가 아니라 **Google Maps Photorealistic 3D Tiles**를 사용한다.
- 채팅 마크다운은 react-markdown 대신 **자체 경량 렌더러**(`components/ui/Markdown.tsx`)로 XSS 안전하게 렌더한다.
