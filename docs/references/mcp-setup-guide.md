# MCP 설정 가이드

프론트엔드 UI 퍼블리싱 단계에서 Claude Code가 사용하는 MCP는 **GitHub 하나**입니다.
카카오맵, 캘린더, 검색 등 서비스 런타임 MCP는 백엔드 팀이 연동 시 추가합니다.

---

## GitHub MCP

**역할**: Claude Code가 PR 생성, 이슈 관리, 브랜치 작업을 직접 수행

**설치**: `.mcp.json` 이 프로젝트 루트에 있으면 Claude Code 실행 시 자동 연결

**API 키 발급**:
1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. 권한 선택: `Contents`, `Issues`, `Pull requests` → Read and write
3. 발급된 토큰을 `.mcp.json` 의 `GITHUB_TOKEN` 에 입력

**주의**: `.mcp.json` 은 `.gitignore` 에 추가하거나, 토큰을 환경변수로 분리하세요.

```bash
# .env
GITHUB_TOKEN=ghp_...

# .gitignore
.env
```

---

## Phase 2 이후 추가 예정 (백엔드 팀)

| MCP | 담당 | 시점 |
|-----|------|------|
| kakao-maps | 백엔드 | Phase 2 |
| kakao-navigation | 백엔드 | Phase 2 |
| kakao-calendar | 백엔드 | Phase 2 (비즈 앱 승인 후) |
| brave-search | 백엔드 | Phase 2 |
