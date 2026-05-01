# Dev 서버 "분 단위" 초기 로딩 — 원인 & 해결 Post-mortem

작성일: 2026-04-17
상태: ✅ 해결 확인됨

---

## 증상
- `pnpm dev` 후 최초 접속까지 **1분 ~ 수 분** 소요
- 서버 종료 후 재시작해도 동일하게 느림
- 2번째 새로고침부터는 빠름 (HMR·캐시 히트)

---

## 진짜 근본 원인

**프로젝트 루트의 `.next/` 디렉터리 (344MB, 2313개 파일) + `dist/` + `src/app/` 잔재**.

이 프로젝트는 **Next.js → Vite 로 마이그**된 상태인데 옛 프레임워크가 남긴 빌드 산출물이 그대로 살아 있었다. Vite dev server 가 시작되면 내부적으로 **chokidar** 파일 watcher 가 프로젝트 루트를 재귀적으로 훑으며 watch descriptor 를 건다. macOS 에서는 여기에 **fsevents 커널 watcher** 까지 겹친다.

→ 2300개 파일마다 watch 등록 × fsevents 버퍼링 → **"분 단위" 스톨**.

설정(`server.watch.ignored`) 으로 필터해도 macOS fsevents 는 **디렉터리 존재 자체**를 감시하므로 완전한 해결이 안 됨. 디렉터리를 물리적으로 제거해야 함.

### 부차 원인 (함께 고쳤던 것)

1. **`three` 를 `optimizeDeps.exclude` 로 지정** — 수백 개 ES 모듈이 on-demand transform 돼 첫 요청에 waterfall 발생
2. **`MapPanel` static import** — three.js · Google Maps loader 를 홈에서 미리 끌어옴 (지도 탭을 열지 않아도)
3. **`ThreeMap` 모듈 최상단에서 `import * as THREE`** — 3D 버튼을 누르지 않아도 로드됨

---

## 해결 (최종 적용)

### 1. 잔재 디렉터리 물리적 제거 — **결정적 fix**
```bash
rm -rf .next dist node_modules/.vite src/app next-env.d.ts
```

| 대상 | 크기 | 이유 |
|---|---|---|
| `.next/` | 344MB / 2313파일 | Next.js 실험 때 생성된 빌드 캐시. Vite 앱에는 무관 |
| `dist/` | 2MB | old Next 빌드 output. `vite build` 는 새로 만듦 |
| `node_modules/.vite/` | 12MB | 이전 prebundle 캐시. 새 `optimizeDeps.include` 반영용 |
| `src/app/` | 소 | Next.js 라우팅 잔재 (`layout.tsx`/`page.tsx`). 실제 엔트리는 `src/main.tsx → src/App.tsx` |
| `next-env.d.ts` | 소 | Next.js 타입 shim |

### 2. `vite.config.ts` — 방어 설정
```ts
optimizeDeps: {
  include: [
    'react', 'react-dom/client', 'zustand', 'lucide-react',
    '@googlemaps/js-api-loader', '@chenglou/pretext',
    'three',
    'three/examples/jsm/controls/OrbitControls.js',
    'three/examples/jsm/utils/BufferGeometryUtils.js',
  ],
  // 기존 exclude: ['three'] 제거
},
server: {
  warmup: { clientFiles: [/* 채팅 화면 경로 */] },
  watch: {
    ignored: ['**/.next/**', '**/dist/**', '**/.git/**', '**/coverage/**', '**/.omc/**'],
  },
},
```

### 3. `App.tsx` — 무거운 패널 lazy 로드
```ts
const MapPanel      = lazy(() => import('@/components/map/MapPanel'));
const CalendarPanel = lazy(() => import('@/components/calendar/CalendarPanel'));
const BookmarkPanel = lazy(() => import('@/components/bookmark/BookmarkPanel'));
const OnboardingFlow= lazy(() => import('@/components/onboarding/OnboardingFlow'));
```
→ 홈 첫 로드에서 three.js · 구글맵 · 캘린더 **완전 제외**.

### 4. `MapPanel.tsx` — ThreeMap 까지 2단계 lazy
```ts
const ThreeMap = lazy(() => import('./ThreeMap'));
```
→ "3D 보기" 버튼을 누르기 전까지 three.js 는 로드조차 안 됨.

### 5. `.gitignore` — `dist/` 추가 (선택)
다시 생성돼도 git 에 들어가지 않도록.

---

## 배운 점 / 재발 방지

### 프레임워크 마이그레이션 체크리스트
프레임워크를 바꿀 때 (Next↔Vite↔Astro 등) 옛 산출물은 반드시 확인:
- [ ] `.next/`, `.nuxt/`, `.svelte-kit/` — 빌드 캐시 제거
- [ ] `dist/`, `build/`, `out/` — 구 output 제거
- [ ] 엔트리 파일 충돌 확인 (ex. `src/app/layout.tsx` vs `src/main.tsx`)
- [ ] 타입 shim 정리 (`next-env.d.ts`, `svelte.d.ts` 등)
- [ ] tsconfig `include/exclude` 로만 막지 말 것 — **watcher 는 tsconfig 를 안 봄**
- [ ] `.gitignore` 를 새 프레임워크 기준으로 업데이트

### Vite dev 가 느릴 때 debugging 순서
1. `du -sh *` / `find . -type f | wc -l` — 루트에 거대 디렉터리 있는지
2. `VITE v6 ready in NNNNms` 의 숫자 확인 — 수 초 이상이면 prebundle 병목
3. `node_modules/.vite/deps/_metadata.json` 열어 prebundle 된 모듈 확인
4. DevTools Network 탭 — `three` / 대형 라이브러리가 on-demand 로 쪼개져 내려오는지
5. chokidar `DEBUG=vite:watch pnpm dev` 로 watcher 활동 관찰

### optimizeDeps 원칙
- **많이 쓰이고 내부 모듈이 많은 라이브러리는 반드시 `include`** (three, lodash, @mui, chart.js 등)
- `exclude` 는 "개발 중 자주 바꾸는 내 로컬 패키지" 용도. 외부 라이브러리에 쓰면 지옥문
- `optimizeDeps.include` 를 수정했으면 `rm -rf node_modules/.vite` 로 캐시 비워야 반영됨

### 레이지 로딩 패턴
"첫 화면에서 쓰이지 않는 탭/모달/오버레이"는 전부 `React.lazy + Suspense`. 특히 three.js/charts/editors 같이 무거운 의존성을 품은 컴포넌트.

---

## 결과

| 구간 | Before | After |
|---|---|---|
| `vite` ready | 수 분 | 수 초 |
| 브라우저 첫 접속 | 1분+ | ~3초 |
| 지도 탭 최초 열기 | (이미 로드됨) | ~1-2초 (구글맵 fetch) |
| 3D 보기 최초 전환 | 즉시 | ~2-3초 (three prebundle 한 번) |
| 이후 HMR | ~200ms | ~200ms (동일) |
