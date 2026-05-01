# 하네스 엔지니어링 가이드

> 이 프로젝트의 Claude Code 하네스 설정을 다른 프로젝트에 복제할 때 참고하는 문서.
> 폴더 구조, 설정 파일, 문서 역할, 스킬 목록을 한눈에 정리.

---

## 1. 프로젝트 루트 구조

```
.
├── CLAUDE.md                  # Claude Code 진입점 (→ AGENTS.md 참조)
├── AGENTS.md                  # 에이전트 아키텍처, 스키마, 워크플로우 정의
├── .claude/
│   ├── settings.local.json    # 허용 명령어 화이트리스트 (permission allow)
│   └── skills/                # Claude Code 스킬 (심볼릭 링크)
├── .agents/
│   └── skills/                # 스킬 원본 (Vercel, 디자인 등)
├── docs/
│   ├── PLANS.md               # 마일스톤 & 실행 계획
│   ├── DESIGN.md              # 디자인 시스템 (토큰, 컬러, 타이포)
│   ├── REACT_BEST_PRACTICE.md # React/Zustand 코딩 규칙
│   ├── design-docs/
│   │   └── ui-improvement-criteria.md  # UI 자율 개선 기준
│   ├── exec-plans/
│   │   └── active/
│   │       └── github-actions-automation.md  # CI/CD 자동화 설계
│   ├── references/
│   │   └── mcp-setup-guide.md # MCP 서버 연결 가이드
│   └── work-log-*.md          # 작업 일지
├── src/types/index.ts         # 에이전트 스키마 타입 정의
├── src/mocks/                 # Mock 데이터 (places, itinerary, buildings)
└── src/stores/                # Zustand 스토어 (chat, map, calendar)
```

---

## 2. 핵심 파일 역할

### 진입점

| 파일 | 역할 | 다른 프로젝트 적용 시 |
|------|------|----------------------|
| `CLAUDE.md` | Claude Code가 최초로 읽는 파일. `@AGENTS.md`로 에이전트 문서 참조 | 필수. 프로젝트별 진입 지시 작성 |
| `AGENTS.md` | 에이전트 구조, 출력 스키마, 통신 원칙, GitHub 워크플로우 전체 정의 | 필수. 에이전트 아키텍처의 단일 진실 |

### 설계 문서 (docs/)

| 파일 | 역할 | 복제 우선순위 |
|------|------|-------------|
| `PLANS.md` | 마일스톤 정의 + 체크리스트. Claude가 작업 범위를 파악하는 기준 | 높음 |
| `DESIGN.md` | 디자인 토큰, 컬러, 타이포, 레이아웃, "하지 말 것" 목록 | 높음 (UI 프로젝트) |
| `REACT_BEST_PRACTICE.md` | 컴포넌트 설계, 상태관리, 훅, 성능, 타입 규칙 | 높음 (React 프로젝트) |
| `ui-improvement-criteria.md` | Claude가 자율 수정 가능/불가 범위 명시 | 중간 |
| `github-actions-automation.md` | CI 자동화 (GC, 마일스톤 실행, PR 리뷰) 설계 | 중간 |
| `mcp-setup-guide.md` | MCP 서버 연결 방법 및 Phase별 계획 | 낮음 (MCP 사용 시) |

### 설정 파일

| 파일 | 역할 |
|------|------|
| `.claude/settings.local.json` | Bash 명령어 화이트리스트. `pnpm`, `git`, `gh`, `npx next` 등 허용 |
| `.mcp.json` | MCP 서버 연결 (GitHub 등). `.gitignore`에 추가 권장 |

---

## 3. 스킬 (Skills)

`.claude/skills/` → `.agents/skills/` 심볼릭 링크 구조.

| 스킬 | 용도 |
|------|------|
| `vercel-react-best-practices` | React/Next.js 성능 최적화 64개 규칙 |
| `vercel-composition-patterns` | React 컴포넌트 합성 패턴 |
| `vercel-react-native-skills` | React Native/Expo 최적화 |
| `vercel-cli-with-tokens` | Vercel 배포 자동화 |
| `deploy-to-vercel` | Vercel 배포 실행 |
| `web-design-guidelines` | UI 접근성/디자인 리뷰 |

### 스킬 설치 방법 (다른 프로젝트)

```bash
# .agents/skills/ 에 스킬 파일 복사 후
mkdir -p .claude/skills
ln -s ../../.agents/skills/vercel-react-best-practices .claude/skills/
```

---

## 4. GitHub Actions 자동화 (하네스 루프)

3개의 워크플로우가 Claude를 CI에서 자율 실행.

```
┌─────────────────────────────────────────────────┐
│  claude-gc.yml (매일 자정)                       │
│  → 품질 스캔 → 위반 수정 → cleanup PR            │
├─────────────────────────────────────────────────┤
│  claude-milestone.yml (이슈 라벨 트리거)          │
│  → 마일스톤 전체 구현 → PR 생성 → 이슈 클로즈     │
├─────────────────────────────────────────────────┤
│  claude-review.yml (PR 열릴 때)                  │
│  → 코드 리뷰 → PR 코멘트 작성                    │
└─────────────────────────────────────────────────┘
```

### 필요 Secrets
```
ANTHROPIC_API_KEY = sk-ant-...
```

### 필요 라벨
```
claude-run       → 마일스톤 자동 실행 트리거
auto-cleanup     → 자동 정리 PR 태그
auto-generated   → Claude 자동 생성 PR 태그
```

---

## 5. 에이전트 ↔ 문서 연결 구조

```
사용자 입력
    │
    ▼
CLAUDE.md ──→ AGENTS.md (에이전트 구조 + 스키마)
    │              │
    │              ├──→ src/types/index.ts (타입 정의)
    │              ├──→ src/mocks/ (Mock 데이터)
    │              └──→ src/stores/ (상태 관리)
    │
    ├──→ PLANS.md (뭘 만들어야 하는지)
    ├──→ DESIGN.md (어떻게 보여야 하는지)
    ├──→ REACT_BEST_PRACTICE.md (어떻게 코딩해야 하는지)
    └──→ ui-improvement-criteria.md (자율 개선 범위)
```

---

## 6. 다른 프로젝트에 복제 체크리스트

### 필수 (최소 하네스)

- [ ] `CLAUDE.md` — 프로젝트 진입점 + `@AGENTS.md` 참조
- [ ] `AGENTS.md` — 에이전트 구조, 출력 스키마, 통신 원칙
- [ ] `src/types/index.ts` — AGENTS.md 스키마에 대응하는 TS 타입
- [ ] `.claude/settings.local.json` — 허용 명령어 목록

### 권장 (품질 하네스)

- [ ] `docs/PLANS.md` — 마일스톤 기반 작업 계획
- [ ] `docs/DESIGN.md` — 디자인 시스템 토큰
- [ ] `docs/REACT_BEST_PRACTICE.md` — 코딩 규칙
- [ ] `docs/design-docs/ui-improvement-criteria.md` — 자율 개선 범위

### 자동화 (CI 하네스)

- [ ] `.github/workflows/claude-gc.yml` — 매일 품질 스캔
- [ ] `.github/workflows/claude-milestone.yml` — 이슈→구현→PR
- [ ] `.github/workflows/claude-review.yml` — PR 자동 리뷰
- [ ] GitHub Secrets에 `ANTHROPIC_API_KEY` 등록
- [ ] 라벨 생성 (`claude-run`, `auto-cleanup`, `auto-generated`)

### 스킬 (선택)

- [ ] `.agents/skills/` 에 필요한 스킬 복사
- [ ] `.claude/skills/` 에 심볼릭 링크 생성

---

## 7. 핵심 원칙

1. **문서가 코드보다 먼저** — AGENTS.md 스키마 업데이트 → 코드 구현
2. **단방향 데이터 흐름** — Orchestrator → Sub-agent → UI. 에이전트 간 직접 통신 금지
3. **스키마 우선** — 에이전트 간 데이터는 반드시 정의된 출력 스키마 준수
4. **사람이 최종 결정** — Claude PR은 항상 사람 리뷰 후 머지
5. **자율 개선 범위 한정** — `ui-improvement-criteria.md`에 명시된 것만 자율 수정
