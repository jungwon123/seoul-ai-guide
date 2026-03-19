# DESIGN.md

> ⚠️ Claude Code는 이 문서를 코드 작성 전 반드시 전체 읽을 것.
> "그럴듯한 다크 UI"를 만들면 안 됨. 아래 명세를 글자 그대로 구현할 것.

---

## 콘셉트: 서울 야경 속 네온 골목

**레퍼런스 이미지로 떠올릴 것**:
을지로 인쇄골목 네온, 홍대 새벽 2시 클럽 거리, 한강 야경 반영.
ChatGPT나 Claude.ai처럼 만들면 실패. Cyberpunk 2077 UI + 서울 감성.

**절대 하지 말 것**:
- 단색 배경 (무조건 그라디언트 또는 노이즈 텍스처)
- 시스템 폰트 (Inter, -apple-system, sans-serif 전부 금지)
- 회색 플레이스홀더 아이콘 하나로 빈 상태 처리
- 기본 border-radius: 8px 둥근 카드
- 흰 배경에 뭔가 올리는 구조

---

## 컬러 시스템 (CSS Variables — 반드시 이 값 그대로 사용)

```css
:root {
  /* 배경 — 단색 절대 금지, 반드시 그라디언트 */
  --bg-base: #050810;
  --bg-gradient: radial-gradient(ellipse at 20% 50%, #0d1528 0%, #050810 60%);
  --bg-panel: rgba(10, 15, 30, 0.85);
  --bg-elevated: rgba(20, 30, 55, 0.9);
  --bg-glass: rgba(255, 255, 255, 0.04);

  /* 브랜드 네온 — 이 색이 UI의 생명선 */
  --neon-mint: #00FFB2;        /* 주요 액션, Claude 응답 글로우 */
  --neon-mint-glow: rgba(0, 255, 178, 0.15);
  --neon-purple: #9B6DFF;      /* Claude 에이전트 */
  --neon-purple-glow: rgba(155, 109, 255, 0.2);
  --neon-cyan: #00D4FF;        /* GPT 에이전트 */
  --neon-coral: #FF6B8A;       /* Gemini 에이전트 / 강조 */

  /* 텍스트 */
  --text-primary: #E8F0FF;
  --text-secondary: rgba(180, 200, 255, 0.6);
  --text-muted: rgba(120, 150, 200, 0.4);

  /* 보더 — 네온 발광 */
  --border-default: rgba(255, 255, 255, 0.06);
  --border-active: rgba(0, 255, 178, 0.3);
  --border-glow: 0 0 12px rgba(0, 255, 178, 0.2);

  /* 그림자 — 네온 글로우 */
  --shadow-card: 0 8px 32px rgba(0, 0, 0, 0.6), 0 1px 0 rgba(255,255,255,0.05);
  --shadow-neon-mint: 0 0 20px rgba(0, 255, 178, 0.25), 0 0 60px rgba(0, 255, 178, 0.1);
  --shadow-neon-purple: 0 0 20px rgba(155, 109, 255, 0.3);
}
```

---

## 배경 처리 (가장 중요)

```css
/* 앱 전체 배경 — 절대 단색 금지 */
body {
  background: var(--bg-gradient);
  min-height: 100vh;
}

/* 배경에 노이즈 그레인 레이어 추가 — 반드시 */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
}

/* 패널 배경 — 글래스모피즘 */
.panel {
  background: var(--bg-panel);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-default);
}
```

---

## 타이포그래피 (Google Fonts import 필수)

```css
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
/* 한글: Pretendard CDN */
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');

:root {
  --font-display: 'Syne', 'Pretendard Variable', sans-serif;  /* 헤더, 강조 */
  --font-body: 'DM Sans', 'Pretendard Variable', sans-serif;  /* 본문 */
}

/* 에이전트 이름, 로고 → Syne 800 */
/* 메시지 본문 → DM Sans 400 */
/* 장소명, 카드 제목 → Pretendard 700 */
```

---

## 핵심 컴포넌트 명세

### 헤더
```css
header {
  background: rgba(5, 8, 16, 0.9);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-default);
  /* 하단에 네온 라인 */
  box-shadow: 0 1px 0 rgba(0, 255, 178, 0.1);
}

/* 로고 */
.logo {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 18px;
  letter-spacing: -0.5px;
  /* S 아이콘 — 민트 네온 글로우 */
  background: linear-gradient(135deg, var(--neon-mint), var(--neon-cyan));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### 에이전트 선택 탭
```css
/* 탭 컨테이너 — pill 형태, 배경 있음 */
.agent-tabs {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 100px;
  padding: 4px;
  display: flex;
  gap: 2px;
}

/* 비활성 탭 */
.agent-tab {
  padding: 6px 16px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.2s;
}

/* 활성 탭 — Claude */
.agent-tab.claude.active {
  background: linear-gradient(135deg, rgba(155, 109, 255, 0.2), rgba(155, 109, 255, 0.05));
  border: 1px solid rgba(155, 109, 255, 0.4);
  color: #C4A3FF;
  box-shadow: 0 0 12px rgba(155, 109, 255, 0.2);
}
/* GPT */
.agent-tab.gpt.active {
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.3);
  color: var(--neon-cyan);
}
/* Gemini */
.agent-tab.gemini.active {
  background: rgba(255, 107, 138, 0.1);
  border: 1px solid rgba(255, 107, 138, 0.3);
  color: var(--neon-coral);
}
```

### 메시지 버블
```css
/* 에이전트 메시지 */
.message-agent {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-left: 2px solid var(--neon-purple); /* Claude */
  border-radius: 0 16px 16px 16px;
  padding: 14px 18px;
  /* 미묘한 퍼플 글로우 */
  box-shadow: 0 4px 20px rgba(0,0,0,0.3), -4px 0 16px rgba(155,109,255,0.08);
}

/* 사용자 메시지 */
.message-user {
  background: linear-gradient(135deg, rgba(0,255,178,0.1), rgba(0,212,255,0.05));
  border: 1px solid rgba(0,255,178,0.2);
  border-radius: 16px 0 16px 16px;
  margin-left: auto;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}
```

### 빈 상태 (Empty State) — 이모지 금지
```css
/* 지도 빈 상태 */
.map-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

/* SVG 아이콘 — 네온 글로우 */
.map-empty-icon {
  width: 64px;
  height: 64px;
  /* 민트 네온 선으로만 이루어진 서울 지도 핀 SVG 직접 구현 */
  filter: drop-shadow(0 0 12px var(--neon-mint));
}

.map-empty h3 {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}

.map-empty p {
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.6;
}
```

### 예시 질문 칩
```css
.suggestion-chip {
  background: var(--bg-glass);
  border: 1px solid var(--border-default);
  border-radius: 100px;
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.suggestion-chip:hover {
  border-color: var(--border-active);
  color: var(--neon-mint);
  box-shadow: var(--border-glow);
  background: var(--neon-mint-glow);
}
```

### 입력창
```css
.chat-input-wrapper {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 16px;
  padding: 4px 4px 4px 16px;
  display: flex;
  align-items: center;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.chat-input-wrapper:focus-within {
  border-color: var(--border-active);
  box-shadow: var(--shadow-neon-mint);
}

.chat-input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 14px;
  flex: 1;
}

/* 전송 버튼 — 민트 네온 */
.send-button {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--neon-mint), #00C8A0);
  color: #050810;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.send-button:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-neon-mint);
}
```

---

## 애니메이션 (반드시 구현)

```css
/* 메시지 등장 */
@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(12px);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}
.message { animation: messageIn 0.3s ease-out forwards; }

/* 타이핑 인디케이터 — 네온 점 3개 */
@keyframes neonPulse {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1); box-shadow: 0 0 8px var(--neon-mint); }
}
.typing-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--neon-mint);
  animation: neonPulse 1.2s ease-in-out infinite;
}
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

/* 패널 진입 */
@keyframes panelIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

/* 네온 스캔라인 효과 (헤더 하단) */
@keyframes scanline {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100vw); }
}
.header-scanline {
  position: absolute;
  bottom: 0; left: 0;
  width: 100px; height: 1px;
  background: linear-gradient(90deg, transparent, var(--neon-mint), transparent);
  animation: scanline 3s linear infinite;
}
```

---

## 체크리스트 (코드 제출 전 필수 확인)

- [ ] 배경이 단색이 아닌가 (그라디언트 + 노이즈 필수)
- [ ] 폰트가 Syne + DM Sans + Pretendard 인가
- [ ] 에이전트 탭이 pill 형태이고 각각 다른 네온 색상인가
- [ ] 메시지 버블 좌측에 에이전트 컬러 border-left 있는가
- [ ] 빈 상태에 이모지 없고 SVG 아이콘 + 네온 글로우 있는가
- [ ] 입력창 포커스 시 민트 글로우 있는가
- [ ] 메시지 등장 애니메이션 있는가
- [ ] 타이핑 인디케이터가 네온 펄스인가
- [ ] 전송 버튼이 민트 그라디언트인가
