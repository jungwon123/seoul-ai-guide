# REACT_BEST_PRACTICE.md

Claude Code가 코드 작성 및 리뷰 시 반드시 따르는 React 패턴 기준입니다.
이 문서는 `claude-review.yml`, `claude-gc.yml` 의 판단 기준으로 사용됩니다.

---

## 1. 컴포넌트 설계

### ✅ DO

```tsx
// 단일 책임 — 하나의 컴포넌트는 하나의 일만
const PlaceCard = ({ place }: { place: Place }) => { ... }
const PlaceCardList = ({ places }: { places: Place[] }) => {
  return places.map(p => <PlaceCard key={p.id} place={p} />)
}

// Props 타입은 반드시 명시 (인라인 또는 별도 interface)
interface MessageBubbleProps {
  message: Message
  isOwn: boolean
}
const MessageBubble = ({ message, isOwn }: MessageBubbleProps) => { ... }

// 조건부 렌더링은 삼항 또는 && 사용
const ChatPanel = ({ messages }: Props) => (
  <div>
    {messages.length === 0
      ? <EmptyState />
      : <MessageList messages={messages} />
    }
  </div>
)
```

### ❌ DON'T

```tsx
// any 타입 절대 금지
const MyComponent = (props: any) => { ... }

// 하나의 컴포넌트에서 데이터 패칭 + 렌더링 + 비즈니스 로직 혼합 금지
const ChatPanel = () => {
  const [data, setData] = useState(null)
  useEffect(() => { fetch('/api/...').then(...) }, []) // ← 에이전트 로직은 agents/에
  return <div>...</div>
}

// 인덱스를 key로 사용 금지
places.map((p, i) => <PlaceCard key={i} place={p} />) // ← key={p.id} 사용
```

---

## 2. 상태관리

### Zustand 스토어 규칙

```tsx
// ✅ 스토어는 stores/ 에만, 컴포넌트 안에서 직접 상태 정의 금지
// ✅ 스토어 슬라이스 단위로 분리 (chatStore, mapStore, calendarStore)
// ✅ 컴포넌트에서는 필요한 값만 구독 (불필요한 리렌더링 방지)

// 좋은 예
const markerCount = useMapStore(state => state.markers.length)

// 나쁜 예 — 스토어 전체 구독
const mapStore = useMapStore() // ← 모든 변경에 리렌더링
```

### useState 사용 기준

| 상황 | 사용 |
|------|------|
| 컴포넌트 로컬 UI 상태 (모달 열림/닫힘) | `useState` |
| 에이전트 응답 데이터, 공유 상태 | Zustand |
| 서버 데이터 캐싱 (Phase 2) | React Query |

---

## 3. 훅 패턴

### 커스텀 훅 분리 기준

로직이 3줄 이상이고 재사용 가능하면 커스텀 훅으로 분리.

```tsx
// ✅ 에이전트 호출 로직은 항상 커스텀 훅으로
const useAgentChat = () => {
  const { addMessage } = useChatStore()
  const sendMessage = async (text: string) => {
    // 에이전트 호출 로직
  }
  return { sendMessage }
}

// ✅ 지도 마커 관리
const useMapMarkers = (places: Place[]) => {
  const { setMarkers } = useMapStore()
  useEffect(() => { setMarkers(places) }, [places])
}
```

### useEffect 규칙

```tsx
// ✅ 의존성 배열 항상 명시
useEffect(() => { ... }, [dependency])

// ✅ cleanup 함수 필수 (이벤트 리스너, 타이머)
useEffect(() => {
  const timer = setTimeout(...)
  return () => clearTimeout(timer) // ← cleanup
}, [])

// ❌ 빈 의존성 배열에 외부 변수 사용 금지
useEffect(() => {
  doSomething(externalValue) // externalValue가 의존성 배열에 없음
}, [])
```

---

## 4. 에러 & 로딩 처리

모든 에이전트 응답을 받는 컴포넌트는 반드시 세 가지 상태를 처리해야 합니다.

```tsx
// ✅ 필수 3종 세트
const AgentResponseView = () => {
  const { data, isLoading, error } = useChatStore()

  if (isLoading) return <SkeletonLoader />      // 로딩
  if (error)     return <ErrorMessage error={error} /> // 에러
  if (!data)     return <EmptyState />           // 빈 상태

  return <DataView data={data} />
}
```

### 빈 상태(Empty State) 필수 규칙

```tsx
// ✅ 모든 리스트/데이터 컴포넌트에 EmptyState 필수
// 메시지 없을 때, 마커 없을 때, 일정 없을 때 등
const EmptyState = ({ message }: { message: string }) => (
  <div className="empty-state">
    <p>{message}</p>
  </div>
)
```

---

## 5. 성능

```tsx
// ✅ 무거운 컴포넌트는 memo로 감싸기
const PlaceCard = memo(({ place }: PlaceCardProps) => { ... })

// ✅ 콜백 함수는 useCallback
const handleMarkerClick = useCallback((place: Place) => {
  selectPlace(place)
}, [selectPlace])

// ✅ 비싼 계산은 useMemo
const sortedPlaces = useMemo(
  () => places.sort((a, b) => b.rating - a.rating),
  [places]
)

// ✅ 무거운 컴포넌트 lazy load
const MapPanel = lazy(() => import('./MapPanel'))
```

---

## 6. 타입 안전성

```tsx
// ✅ 모든 타입은 src/types/index.ts 에서 import
import type { Place, Message, Itinerary } from '@/types'

// ✅ 에이전트 응답은 반드시 AgentResponse<T> 래퍼 사용 (AGENTS.md 참고)
const response: AgentResponse<Place[]> = await discoveryAgent.search(query)

// ❌ as 단언 남용 금지 — 타입 가드 사용
// 나쁜 예
const place = data as Place
// 좋은 예
const isPlace = (data: unknown): data is Place =>
  typeof data === 'object' && data !== null && 'id' in data
```

---

## 7. 파일/폴더 구조 규칙

```
components/chat/
├── ChatPanel.tsx        # 컨테이너 (로직 포함 가능)
├── ChatPanel.test.tsx   # 테스트는 같은 폴더에
├── MessageBubble.tsx    # 순수 UI 컴포넌트
└── index.ts             # barrel export
```

```tsx
// ✅ barrel export 사용
// components/chat/index.ts
export { ChatPanel } from './ChatPanel'
export { MessageBubble } from './MessageBubble'

// import 시 깔끔하게
import { ChatPanel, MessageBubble } from '@/components/chat'
```

---

## Claude Code 리뷰 체크리스트

PR 리뷰 시 아래 항목을 순서대로 확인:

- [ ] `any` 타입 사용 없음
- [ ] 컴포넌트 단일 책임 준수
- [ ] 에이전트 로직이 `agents/` 에 분리되어 있음
- [ ] 로딩 / 에러 / 빈 상태 3종 처리
- [ ] `useEffect` 의존성 배열 완전히 명시
- [ ] `key` prop에 인덱스 사용 없음
- [ ] 타입은 `src/types/index.ts` 에서 import
- [ ] barrel export 사용
