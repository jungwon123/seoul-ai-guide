# AGENTS.md

이 문서는 서울 관광 AI 에이전트 서비스의 **에이전트 구조, 역할, 협업 방식**을 정의합니다.
Claude Code 작업 시 이 파일을 먼저 읽고 에이전트 간 책임 범위를 준수하세요.

---

## 에이전트 아키텍처 개요

```
사용자 입력
    │
    ▼
[Orchestrator Agent]  ← 의도 파악 및 라우팅
    │
    ├──▶ [Discovery Agent]   관광 / 쇼핑 / 문화 정보 탐색
    ├──▶ [Planning Agent]    경로 설계 / 일정 최적화
    ├──▶ [Booking Agent]     예약 처리
    ├──▶ [Map Agent]         지도 마커 / 경로 시각화
    └──▶ [Calendar Agent]    일정 등록 / 캘린더 연동
```

---

## 에이전트 정의

### 1. Orchestrator Agent
- **역할**: 사용자의 자연어 입력을 분석하여 적절한 하위 에이전트로 라우팅
- **책임**:
  - 대화 컨텍스트 유지
  - 멀티턴 의도 추적
  - 에이전트 간 결과 취합 및 최종 응답 생성
- **사용 모델**: Claude (primary), GPT-4o / Gemini (fallback 또는 A/B)
- **입출력**:
  - Input: 사용자 자연어 메시지 + 대화 히스토리
  - Output: 라우팅 명령 + 최종 응답 텍스트

### 2. Discovery Agent
- **역할**: 서울 내 관광지, 맛집, 쇼핑, 문화체험 정보 제공
- **책임**:
  - 카테고리별 장소 검색 (관광 / 쇼핑 / 문화 / 음식)
  - 사용자 선호도 기반 필터링
  - 장소 상세 정보 반환 (이름, 주소, 운영시간, 가격, 리뷰 요약)
- **데이터 소스**: (추후 연동) 서울 열린데이터광장, Google Places API, 네이버 플레이스
- **출력 스키마**:
  ```json
  {
    "places": [
      {
        "id": "string",
        "name": "string",
        "category": "tourism | shopping | culture | food",
        "address": "string",
        "lat": "number",
        "lng": "number",
        "hours": "string",
        "rating": "number",
        "summary": "string"
      }
    ]
  }
  ```

### 3. Planning Agent
- **역할**: 선택된 장소들을 기반으로 최적 경로 및 일정 설계
- **책임**:
  - 이동 시간 고려한 방문 순서 최적화
  - 반나절/하루/N박 일정 생성
  - 교통수단 추천 (도보 / 대중교통 / 택시)
- **출력 스키마**:
  ```json
  {
    "itinerary": [
      {
        "order": "number",
        "placeId": "string",
        "arrivalTime": "string",
        "duration": "number (minutes)",
        "transportToNext": "walk | subway | bus | taxi",
        "travelTimeToNext": "number (minutes)"
      }
    ]
  }
  ```

### 4. Booking Agent
- **역할**: 장소 예약 처리 (식당, 공연, 투어 등)
- **책임**:
  - 예약 가능 여부 확인
  - 예약 폼 데이터 수집 (날짜, 인원, 요청사항)
  - 예약 확인 및 취소
- **상태**: UI 퍼블리싱 단계에서는 Mock 처리
- **출력 스키마**:
  ```json
  {
    "booking": {
      "id": "string",
      "placeId": "string",
      "date": "string",
      "time": "string",
      "partySize": "number",
      "status": "pending | confirmed | cancelled",
      "confirmationNumber": "string"
    }
  }
  ```

### 5. Map Agent
- **역할**: 지도 위에 마커 및 경로 시각화
- **책임**:
  - Discovery Agent 결과를 지도 마커로 변환
  - Planning Agent 결과를 경로 폴리라인으로 렌더링
  - 마커 클릭 시 장소 상세 패널 연동
- **지도 라이브러리**: (추후 결정) Kakao Maps API / Google Maps / Mapbox
- **출력**: 지도 컴포넌트에 전달할 마커/경로 데이터 배열

### 6. Calendar Agent
- **역할**: 생성된 일정을 캘린더에 등록
- **책임**:
  - Planning Agent 결과를 캘린더 이벤트로 변환
  - Google Calendar 연동 (iCal 포맷 지원)
  - 일정 수정 / 삭제
- **상태**: UI 퍼블리싱 단계에서는 로컬 상태로 Mock 처리

## MCP 연결 현황

각 에이전트가 사용하는 MCP 서버. 설정 방법은 `docs/references/mcp-setup-guide.md` 참고.

| 에이전트 | MCP 서버 | 역할 |
|---------|---------|------|
| Discovery Agent | `brave-search` | 실시간 서울 관광 정보 검색 |
| Discovery Agent | `kakao-maps` | 키워드 → 장소 좌표/상세 정보 |
| Planning Agent | `kakao-navigation` | 출발지~목적지 경로 + 이동 시간 |
| Map Agent | `kakao-maps` | 장소명 → 좌표 변환 (마커용) |
| Calendar Agent | `kakao-calendar` | 톡캘린더 조회 ⚠️ 일정 생성은 Phase 2 |
| Orchestrator | `github` | PR/이슈 생성, 브랜치 관리 |
| Booking Agent | (없음) | Phase 1은 Mock, Phase 2에서 연동 |

### ⚠️ 카카오 캘린더 제한사항
톡캘린더 API는 카카오 비즈 앱 등록 및 사용 권한 신청이 필요합니다.
현재 MCP는 캘린더 목록 조회/서브캘린더 관리만 지원하며,
**일정 이벤트 생성은 Phase 1에서 `.ics` 파일 다운로드로 대체**합니다.

### MCP → 에이전트 출력 스키마 연결
MCP 원시 데이터는 반드시 에이전트 출력 스키마로 변환 후 UI에 전달합니다.
MCP 응답을 UI에 직접 넘기지 않습니다.

---

## 에이전트 간 통신 원칙

1. **단방향 데이터 흐름**: Orchestrator → Sub-agent, Sub-agent → UI. 에이전트끼리 직접 통신 금지.
2. **스키마 우선**: 에이전트 간 데이터는 반드시 위 출력 스키마를 준수.
3. **실패 처리**: 에이전트 응답 실패 시 Orchestrator가 사용자에게 명확한 오류 메시지 반환.
4. **컨텍스트 전달**: 모든 에이전트 호출 시 현재 대화 세션 ID와 사용자 선호도 컨텍스트를 포함.

---

## GitHub 워크플로우

Claude Code가 직접 이슈 생성, 브랜치 작업, PR 제출까지 수행합니다.
`gh` CLI가 설치되고 `gh auth login`이 완료된 상태를 전제합니다.

### 이슈 → PR 전체 플로우

```
1. 이슈 생성        gh issue create
2. 브랜치 생성      git checkout -b feat/...
3. 코드 작업        (Claude Code 구현)
4. 커밋             git add . && git commit -m "..."
5. PR 생성          gh pr create
6. 이슈 클로즈      gh issue close {number}
```

### 브랜치 네이밍 규칙

| 타입 | 형식 | 예시 |
|------|------|------|
| 기능 | `feat/{컴포넌트명}` | `feat/chat-panel` |
| 버그 | `fix/{내용}` | `fix/marker-overlap` |
| 문서 | `docs/{파일명}` | `docs/agents-update` |
| 리팩토링 | `refactor/{대상}` | `refactor/map-store` |

### 커밋 메시지 규칙

```
feat: ChatPanel 컴포넌트 구현
fix: 지도 마커 겹침 문제 해결
docs: AGENTS.md GitHub 워크플로우 추가
refactor: mapStore 타입 정리
```

### 이슈 라벨 체계

| 라벨 | 용도 |
|------|------|
| `agent:chat` | 채팅 에이전트 관련 |
| `agent:map` | 지도 에이전트 관련 |
| `agent:calendar` | 캘린더 에이전트 관련 |
| `agent:booking` | 예약 에이전트 관련 |
| `phase:1` | UI 퍼블리싱 단계 |
| `mock` | Mock 처리 항목 |
| `tech-debt` | 기술 부채 |

### PR 템플릿

Claude Code가 PR 생성 시 아래 형식을 따릅니다:

```markdown
## 작업 내용
- 구현한 컴포넌트/기능 요약

## 관련 이슈
Closes #{이슈 번호}

## 체크리스트
- [ ] AGENTS.md 스키마 준수
- [ ] Mock 데이터 포함
- [ ] 빈 상태(Empty State) 처리
- [ ] 모바일 반응형 확인
```

### Claude Code에게 지시하는 방법

```
# 마일스톤 단위 작업
"PLANS.md M2 채팅 UI 작업해줘.
 완료되면 GitHub 이슈 닫고 PR 올려줘."

# 특정 컴포넌트 작업
"feat/chat-panel 브랜치 만들고
 ChatPanel 컴포넌트 구현 후 PR 생성해줘.
 이슈 #3 참조해서 본문 작성해줘."
```

### 브랜치 보호 규칙 (권장)

- `main` 브랜치 직접 푸시 금지
- PR 머지는 사람이 리뷰 후 수동으로
- Claude Code는 항상 feature 브랜치에서만 작업

---

## Claude Code 작업 가이드

- 새 에이전트 기능 추가 시 이 파일의 스키마를 먼저 업데이트한 뒤 코드 작업할 것
- Mock 데이터는 `/src/mocks/` 디렉토리에 위 스키마를 따르는 JSON으로 작성
- 에이전트 UI 컴포넌트는 `docs/product-specs/` 의 각 스펙 문서를 참고
