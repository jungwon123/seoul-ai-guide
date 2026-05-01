# 렌더 최적화 기록

채팅 입력 시 불필요한 리렌더/리플로우를 제거한 과정. 증상별로 원인과 해결을 정리.

---

## 증상

- 채팅 입력창에 글자 하나 칠 때마다 React DevTools "Highlight updates" 가 **헤더, 메시지, 3D 캔버스, nav 버튼**까지 깜빡임
- 3D 지도를 열어두면 GPU가 계속 활성 상태
- 대화가 길어질수록 타이핑 렉

---

## 원인 1 — `streamingText` 를 최상위에서 구독

### 문제
`App.tsx` 가 `useChatStore((s) => s.streamingText)` 와 `useTextHeight(streamingText, ...)` 를 직접 호출.
스트리밍 한 청크마다 App 전체 리렌더 → 헤더/사이드바/ChatInput 모두 리렌더.

### 해결
스트리밍 UI 를 `StreamingMessage` 컴포넌트로 분리. 해당 컴포넌트 안에서만 `streamingText` 구독.

```tsx
// src/components/chat/StreamingMessage.tsx
const streamingText = useChatStore((s) => s.streamingText);
```

---

## 원인 2 — 최상위에서 store 슬라이스를 전부 구독

### 문제
`App.tsx` 가 `messages`, `isLoading`, `selectedAgent`, `sendMessage` 를 구독.
store 에 새 메시지가 추가되거나 `isLoading` 이 바뀌면 App 전체 리렌더 → 모든 자식이 연쇄적으로 리렌더.

### 해결
각 컴포넌트가 필요한 store 슬라이스만 **직접 구독**하도록 분리.

| 컴포넌트 | 구독 대상 |
|---------|----------|
| `ChatHeader` | `selectedAgent`, `isLoading` |
| `ChatMessages` | `messages`, `isLoading`, `selectedAgent` |
| `ChatInputConnected` | `sendMessage`, `isLoading`, `messages.length` |
| `StreamingMessage` | `streamingText`, `isLoading`, `selectedAgent` |

App 은 UI state (`overlay`, `sidebarOpen`) 만 보유. store 는 `initWelcome`, `navigation` 만 구독.

---

## 원인 3 — `memo` 누락

### 문제
`MessageBubble`, `ChatInput`, `ChatSidebar`, `CompactOrb` 가 memo 미적용.
부모 리렌더 시 props 가 동일해도 같이 리렌더.

### 해결

```tsx
export default memo(function MessageBubble(...) { ... });
export default memo(function ChatInput(...) { ... });
export default memo(function ChatSidebar(...) { ... });
export default memo(function CompactOrb(...) { ... });
```

특히 `MessageBubble` 은 메시지 배열이 길어질수록 리렌더 비용이 누적됨.

---

## 원인 4 — 인라인 콜백이 props 로 전달

### 문제
```tsx
<ChatSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
```
매 렌더마다 새 함수 생성 → memo 된 자식도 props 비교 실패해서 리렌더.

### 해결
`useCallback` 으로 안정화.

```tsx
const closeSidebar = useCallback(() => setSidebarOpen(false), []);
const closeOverlay = useCallback(() => setOverlay(null), []);
<ChatSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
```

---

## 원인 5 — JSX 안에서 `<style>` 태그 삽입

### 문제
```tsx
<style>{`
  @keyframes compactBreathe { ... }
`}</style>
```
컴포넌트 렌더할 때마다 `<style>` 태그가 DOM 에 재삽입되어 **CSSOM 재구성 + 리플로우** 발생.

영향 파일: `App.tsx`, `CompactOrb.tsx`, `AgentOrb.tsx`, `AgentSwitcher.tsx`

### 해결
모든 `@keyframes` 를 `src/globals.css` 로 이동. 컴포넌트에서 `<style>` 제거.

```css
/* src/globals.css */
@keyframes compactBreathe { ... }
@keyframes overlayIn { ... }
@keyframes slide-up { ... }
/* etc */
```

---

## 원인 6 — Three.js 의 상시 `requestAnimationFrame` 루프

### 문제
`src/lib/three-scene.ts` 의 `animate()` 가 매 프레임(~60fps) `renderer.render()` 호출.
사용자가 아무것도 안 해도 GPU 계속 동작. 채팅 입력 중에도 캔버스가 그려짐.

### 해결
**Render-on-demand 패턴**으로 변경.

```ts
/** 씬이 변했을 때만 렌더 요청 */
requestRender() {
  if (!this.running || this.renderRequested) return;
  this.renderRequested = true;
  requestAnimationFrame(() => {
    this.renderRequested = false;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    if (this.dampingFrames > 0) {
      this.dampingFrames--;
      this.requestRender();
    }
  });
}
```

- OrbitControls `change` 이벤트 → `requestRender()` 호출 + 댐핑 이징을 위해 30 프레임 추가
- 빌딩 로드/애니메이션, tile 로드, flyToStop, resize, 마커 설정 등 씬이 바뀌는 모든 지점에 `requestRender()` 삽입

---

## 원인 7 — `useSyncExternalStore` + StrictMode 중복 렌더

### 문제
- SSR 용 `useHydrated`, `useLocalStorage` 가 CSR 전용 Vite 앱에서도 `useSyncExternalStore` 를 사용 → 불필요한 구독/호출
- `<StrictMode>` 가 개발 환경에서 컴포넌트를 이중 렌더

### 해결
- `useLocalStorage` 를 `useState` 1회 초기화로 단순화
- `useHydrated` 는 CSR 에서 항상 `true` 리턴
- `main.tsx` 에서 `<StrictMode>` 제거

```ts
// src/lib/useHydrated.ts
export function useLocalStorage(key: string, fallback: string | null = null) {
  const [value] = useState(() => {
    try { return localStorage.getItem(key); } catch { return fallback; }
  });
  return value;
}
export function useHydrated(): true { return true; }
```

---

## 원인 8 — 인라인 스타일 객체 재생성

### 문제
```tsx
style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
```
매 렌더마다 새 객체 생성 → React 가 style prop 비교에서 변경으로 감지 → DOM style attribute 재적용.

### 해결
모듈 레벨 상수로 추출.

```tsx
const SCROLL_STYLE: React.CSSProperties = {
  scrollbarWidth: 'none',
  WebkitOverflowScrolling: 'touch',
};
<div style={SCROLL_STYLE} />
```

---

## 체크리스트 (새 컴포넌트 작성 시)

- [ ] 최상위 컴포넌트에서 불필요한 store 슬라이스 구독 금지
- [ ] props 로 전달되는 콜백은 `useCallback`
- [ ] 여러 번 렌더되는 컴포넌트(`.map` 안의 아이템 등) 는 `memo`
- [ ] JSX 안에 `<style>` 넣지 말고 `globals.css` 에 `@keyframes` 작성
- [ ] 반복 생성되는 인라인 스타일 객체는 모듈 레벨 상수로 추출
- [ ] 애니메이션 루프는 render-on-demand (변화가 있을 때만 `requestAnimationFrame`)
- [ ] 개발 모드에서 React DevTools "Highlight updates" 로 타이핑 테스트

---

## 검증

```bash
npx tsc --noEmit   # 타입 에러 없음
npx vitest run     # 테스트 통과
npx vite build     # 프로덕션 빌드
```

React DevTools "Highlight updates when components render" 활성화 후 채팅 입력 시 **ChatInput 만** 깜빡이면 성공.
