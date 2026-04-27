# Seoul AI Guide

서울 관광 AI 에이전트 서비스 — Claude / GPT / Gemini 멀티 에이전트 기반 큐레이션, 3D 지도, 일정 관리.

## Stack

- **Vite 6** + **React 19** + **TypeScript**
- **Tailwind CSS v4** (`@theme` 토큰 시스템)
- **Zustand** (상태 관리)
- **Three.js** (3D 지도 뷰)
- **Google Maps** + **Lottie**

## Development

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # tsc + vite build
pnpm test         # vitest
pnpm lint         # eslint
```

## Project Structure

```
src/
├── App.tsx              # 루트 컴포넌트
├── main.tsx             # 엔트리
├── globals.css          # Tailwind v4 @theme 토큰
├── components/
│   ├── agent/           # AgentOrb, AgentMark
│   ├── chat/            # 메시지, 입력, 사이드바
│   ├── map/             # GoogleMap, ThreeMap, 오버레이
│   ├── booking/         # 예약 폼/패널
│   ├── calendar/        # 일정 캘린더
│   ├── bookmark/        # 북마크 패널
│   ├── onboarding/      # 온보딩 플로우
│   └── ui/              # 공통 UI 프리미티브
├── stores/              # Zustand 스토어
├── lib/                 # 유틸, three-scene, hooks
├── mocks/               # Mock 데이터 (Phase 1)
└── types/               # 공통 타입
```

## Documentation

- `AGENTS.md` — 에이전트 아키텍처 및 협업 원칙
- `CLAUDE.md` — Claude Code 작업 가이드
- `docs/DESIGN.md` — 디자인 시스템 토큰
- `docs/design-patterns.md` — 컴포넌트 패턴
- `docs/ui-detail-specs.md` — 4상태 / 엣지 케이스 / 접근성
