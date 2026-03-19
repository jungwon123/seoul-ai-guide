# GitHub Actions 자동화 실행 계획

Claude가 자율적으로 루프를 돌며 코드베이스를 유지하는 자동화 워크플로우 설명서.

---

## 워크플로우 3종

| 파일 | 트리거 | 역할 |
|------|--------|------|
| `claude-gc.yml` | 매일 자정 (자동) | 품질 스캔 → 위반 수정 → cleanup PR |
| `claude-milestone.yml` | 이슈에 라벨 붙이기 or 수동 | 마일스톤 전체 구현 → PR 생성 → 이슈 클로즈 |
| `claude-review.yml` | PR 열릴 때마다 (자동) | 코드 리뷰 → PR에 코멘트 작성 |

---

## 세팅 방법

### 1. Secrets 등록
GitHub 레포 → Settings → Secrets → Actions

```
ANTHROPIC_API_KEY = sk-ant-...
```

`GITHUB_TOKEN` 은 Actions가 자동 제공하므로 별도 등록 불필요.

### 2. 라벨 생성
GitHub 레포 → Issues → Labels 에서 추가:

```
claude-run       #0075ca   Claude 자동 실행 트리거
auto-cleanup     #e4e669   자동 정리 PR
auto-generated   #d93f0b   Claude 자동 생성 PR
phase:1          #0052cc   UI 퍼블리싱 단계
```

### 3. 브랜치 보호 설정
main 브랜치: Settings → Branches → Add rule
- ✅ Require pull request before merging
- ✅ Require approvals (1명)
- Claude bot PR은 사람이 리뷰 후 머지

---

## 실제 사용 플로우

### 마일스톤 자동 실행

```
1. GitHub Issues에서 새 이슈 생성
   제목: "[M2] 채팅 UI 구현"

2. 이슈에 'claude-run' 라벨 붙이기

3. Actions가 자동 트리거 →
   - AGENTS.md 등 문서 읽기
   - M2 전체 구현
   - feat/auto-m2-YYYYMMDD 브랜치 PR 생성
   - 이슈 자동 클로즈

4. 사람이 PR 리뷰 후 머지
```

### 매일 자동 루프 (가비지 컬렉션)

```
매일 자정:
  Claude가 QUALITY_SCORE.md 기준으로 스캔
    ↓
  위반 발견 시 → 자동 수정 → cleanup PR
  위반 없으면 → 아무것도 안 함 (SKIP)
    ↓
  사람이 1분 안에 리뷰 후 auto-merge
```

### PR 자동 리뷰

```
누군가 PR 오픈
    ↓
Claude가 자동으로:
  - AGENTS.md 스키마 준수 여부 확인
  - any 타입, 빈 상태 처리 등 점검
  - ✅ / ⚠️ / ❌ 형식으로 PR 코멘트 작성
    ↓
사람이 Claude 리뷰 참고해서 최종 머지 결정
```

---

## OpenAI 하네스 엔지니어링과의 대응

| OpenAI 방식 | 우리 구현 |
|-------------|-----------|
| 백그라운드 Codex 스캔 태스크 | `claude-gc.yml` 매일 자정 |
| 엔지니어가 프롬프트로 태스크 지시 | 이슈에 `claude-run` 라벨 |
| Codex가 PR 생성 후 automerge | `claude-milestone.yml` PR 생성 |
| 커스텀 린트로 규칙 강제 | `QUALITY_SCORE.md` + Claude 리뷰 |
| "에이전트가 막히면 환경을 개선" | 문서(AGENTS.md 등) 업데이트로 대응 |

---

## 주의사항

- `--dangerously-skip-permissions` 플래그는 CI 환경에서만 사용
- 민감한 파일 (`.env`, secrets) 은 `.gitignore` 필수
- Claude bot이 만든 PR은 반드시 사람이 리뷰 후 머지
- 과도한 API 호출 방지를 위해 `claude-gc.yml` 은 변경사항 없으면 자동 SKIP
