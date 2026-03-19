# DESIGN.md

> ⚠️ Claude Code는 이 문서를 코드 작성 전 반드시 전체 읽을 것.
> 목표: "AI 서비스처럼 보이지 않는" 고급 여행 앱. 
> Airbnb, Linear, Notion의 절제미를 참고할 것.

---

## 콘셉트: Seoul Edit

**한 줄 정의**: 군더더기 없는 서울 여행 큐레이션 앱.
**레퍼런스**: Linear의 정밀함 + Airbnb의 따뜻함 + Apple의 여백.
**절대 하지 말 것**: 네온, 글로우, 그라디언트 남용, 과한 그림자, 다크 사이버펑크.

---

## 컬러 시스템

```css
:root {
  /* 배경 — 순백 기반, 차갑지 않게 */
  --bg-base: #FAFAF9;          /* 따뜻한 오프화이트 */
  --bg-surface: #FFFFFF;       /* 카드, 패널 */
  --bg-subtle: #F4F4F2;        /* 구분선 대신 쓰는 배경 */
  --bg-overlay: rgba(0,0,0,0.03);

  /* 텍스트 — 순수 검정 금지, 차분하게 */
  --text-primary: #1A1A18;     /* 제목 */
  --text-secondary: #6B6B63;   /* 설명 */
  --text-muted: #A8A89E;       /* 힌트, 플레이스홀더 */

  /* 브랜드 — 딱 하나, 절제된 포인트 */
  --brand: #1C6EF2;            /* 주요 액션, 링크 */
  --brand-subtle: #EEF4FF;     /* 브랜드 배경 */

  /* 에이전트 색상 — 과하지 않게 */
  --agent-claude: #7C5CBF;     /* 소프트 퍼플 */
  --agent-gpt: #19A97B;        /* 소프트 그린 */
  --agent-gemini: #E8700A;     /* 소프트 오렌지 */

  /* 보더 */
  --border: #E8E8E4;
  --border-strong: #D4D4CE;

  /* 그림자 — 최소한으로 */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.1);
}
```

---

## 타이포그래피

```css
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');

:root {
  --font-display: 'DM Serif Display', 'Pretendard Variable', serif; /* 로고, 빈 상태 헤딩 */
  --font-body: 'Pretendard Variable', -apple-system, sans-serif;    /* 모든 본문 */
}
```

| 용도 | 폰트 | 굵기 | 크기 |
|------|------|------|------|
| 로고 | DM Serif Display | 400 | 18px |
| 페이지 제목 | Pretendard | 700 | 22px |
| 카드 제목 | Pretendard | 600 | 15px |
| 본문 | Pretendard | 400 | 14px |
| 캡션/레이블 | Pretendard | 500 | 12px |

---

## 레이아웃

```css
/* 전체 배경 */
body {
  background: var(--bg-base);
  font-family: var(--font-body);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
}

/* 헤더 — 얇고 가볍게 */
header {
  height: 52px;
  background: rgba(250,250,249,0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 20px;
}

/* 2단 레이아웃 */
.layout {
  display: grid;
  grid-template-columns: 420px 1fr;
  height: calc(100vh - 52px);
}

/* 채팅 패널 */
.chat-panel {
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

/* 컨텍스트 패널 */
.context-panel {
  background: var(--bg-base);
}
```

---

## 핵심 컴포넌트

### 에이전트 선택 탭
```css
/* 심플한 언더라인 탭 — pill 금지 */
.agent-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border);
  padding: 0 16px;
}

.agent-tab {
  padding: 14px 16px 13px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.agent-tab:hover { color: var(--text-secondary); }

/* 활성 탭 — 에이전트 색상 언더라인만 */
.agent-tab.claude.active {
  color: var(--agent-claude);
  border-bottom-color: var(--agent-claude);
}
.agent-tab.gpt.active {
  color: var(--agent-gpt);
  border-bottom-color: var(--agent-gpt);
}
.agent-tab.gemini.active {
  color: var(--agent-gemini);
  border-bottom-color: var(--agent-gemini);
}

/* 에이전트 닷 인디케이터 */
.agent-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: currentColor;
}
```

### 메시지 버블
```css
/* 에이전트 메시지 — 배경 없이 텍스트만 */
.message-agent {
  padding: 0 16px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.agent-avatar {
  width: 28px; height: 28px;
  border-radius: 8px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.message-agent .content {
  font-size: 14px;
  line-height: 1.65;
  color: var(--text-primary);
  padding-top: 4px;
}

/* 사용자 메시지 — 우측 정렬, 브랜드 배경 */
.message-user {
  margin-left: auto;
  max-width: 75%;
  background: var(--brand-subtle);
  border: 1px solid rgba(28,110,242,0.12);
  border-radius: 14px 14px 4px 14px;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--text-primary);
}
```

### 빈 상태 (Empty State)
```css
/* 이모지 금지. 심플한 선 아이콘 + 세리프 헤딩 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  text-align: center;
}

.empty-state-icon {
  width: 40px; height: 40px;
  color: var(--text-muted);
  /* Lucide React 아이콘 사용 — strokeWidth={1} */
}

.empty-state h3 {
  font-family: var(--font-display);
  font-size: 20px;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}

.empty-state p {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
  max-width: 240px;
}
```

### 예시 질문 칩
```css
.suggestion-chip {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: 7px 14px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.suggestion-chip:hover {
  border-color: var(--brand);
  color: var(--brand);
  background: var(--brand-subtle);
}
```

### 입력창
```css
.chat-input-wrapper {
  margin: 12px 16px 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 10px 10px 14px;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  box-shadow: var(--shadow-sm);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.chat-input-wrapper:focus-within {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(28,110,242,0.08);
}

.chat-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-primary);
  resize: none;
  min-height: 20px;
  max-height: 120px;
  line-height: 1.5;
}

.chat-input::placeholder { color: var(--text-muted); }

/* 전송 버튼 */
.send-button {
  width: 32px; height: 32px;
  border-radius: 8px;
  background: var(--brand);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}

.send-button:hover {
  background: #1558CC;
  transform: scale(1.03);
}

.send-button:disabled {
  background: var(--bg-subtle);
  color: var(--text-muted);
  transform: none;
}
```

### 장소 카드
```css
.place-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.15s;
  cursor: pointer;
}

.place-card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.place-card-image {
  width: 100%;
  aspect-ratio: 16/9;
  background: var(--bg-subtle);
  object-fit: cover;
}

.place-card-body { padding: 12px 14px; }

.place-card-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.2px;
}

.place-card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
}
```

---

## 애니메이션 — 최소한, 빠르게

```css
/* 메시지 등장 — 짧고 자연스럽게 */
@keyframes messageIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.message { animation: messageIn 0.2s ease-out; }

/* 타이핑 인디케이터 — 점 3개, 소박하게 */
@keyframes dot {
  0%, 60%, 100% { opacity: 0.3; transform: scale(0.85); }
  30% { opacity: 1; transform: scale(1); }
}
.typing-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: dot 1.4s ease-in-out infinite;
}
.typing-dot:nth-child(2) { animation-delay: 0.16s; }
.typing-dot:nth-child(3) { animation-delay: 0.32s; }

/* 패널/카드 등장 */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

---

## 절대 하지 말 것 (❌)

- `box-shadow` 에 color 글로우 넣기 (네온 효과)
- `border-radius` 를 20px 이상으로 설정
- 그라디언트 배경 (배경은 단색 오프화이트만)
- 다크 배경 (`#0A0E1A` 같은 색)
- 이모지를 아이콘 대신 사용
- `font-weight: 800` 이상 사용
- 색상을 4가지 이상 동시에 사용

---

## 체크리스트 (코드 제출 전 필수)

- [ ] 배경색이 `#FAFAF9` 기반인가
- [ ] 폰트가 Pretendard + DM Serif Display 인가
- [ ] 에이전트 탭이 언더라인 방식인가 (pill 금지)
- [ ] 그림자가 `var(--shadow-sm/md)` 만 사용했는가
- [ ] 빈 상태에 Lucide 아이콘 + 세리프 헤딩인가
- [ ] 네온/글로우 효과 없는가
- [ ] 메시지 등장 애니메이션 0.2s 이하인가
- [ ] 색상 변수만 사용했는가 (하드코딩 금지)
