# [BE 이슈] 채팅 SSE 응답이 영속화되지 않습니다

**작성**: 2026-05-12, FE
**환경**: GCE `localbiz-api` (외부 IP `34.22.91.75:8000`), `AnyWay v0.1.0`
**대상**: BE 채팅/스트리밍 핸들러 담당자

---

## 한 줄 요약

`GET /api/v1/chat/stream`이 정상 응답을 스트리밍하지만 그 결과로 만들어진
**thread와 message를 DB에 저장하지 않습니다**. 직후 호출되는 `GET /api/v1/chats`,
`GET /api/v1/chats/{thread_id}/messages` 두 라우트가 모두 빈/404를 반환합니다.

---

## 책임 범위 매트릭스 (어느 API 담당자?)

| 라우트 | 동작 검증 | 의심도 | 가능한 원인 |
|---|---|---|---|
| **`GET /api/v1/chat/stream`** | ✅ 200/SSE 응답은 정상 | **🔴 핵심** | 핸들러 내부에 **thread 생성/메시지 저장 로직 누락**. LLM 호출만 하고 DB write 안 함 |
| `GET /api/v1/chats` | ✅ 200, 빈 배열 | 🟢 정상 | 인증/필터 OK. DB가 비어있으니 빈 응답이 맞음 |
| `GET /api/v1/chats/{thread_id}/messages` | ✅ 404 "대화를 찾을 수 없습니다" | 🟢 정상 | DB에 thread 자체가 없어 404가 맞음 |
| `GET /api/v1/chats/{thread_id}` | (미확인, 404 추정) | 🟢 정상 | 동일 |

→ **수정 대상은 `GET /api/v1/chat/stream` 한 곳**. 다른 라우트는 stream이 영속화를
   시작하면 자동으로 정상 동작할 것으로 보입니다.

---

## 재현 (curl 절차)

dev BE 직접 또는 FE의 vite proxy(`http://localhost:5174`) 둘 다 동일 결과 재현됨.

```bash
BASE="http://34.22.91.75:8000"

# 1) 회원가입으로 새 토큰 발급 (재현용 격리)
EMAIL="repro_$(date +%s)@example.com"
TOKEN=$(curl -sS -X POST -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"testpass1234\"}" \
  "$BASE/api/v1/auth/signup" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 2) 초기 chats — 비어 있어야 함 (정상)
curl -sS -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/chats"
# → {"items":[],"next_cursor":null}

# 3) SSE 스트림 호출 — 정상 응답 받음
THREAD_ID="repro-thread-$(date +%s)"
curl -sSN -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/v1/chat/stream?thread_id=$THREAD_ID&query=서울맛집&token=$TOKEN"
# → event: status / intent / text_stream / done  ← 응답 자체는 OK

# 4) 5초 대기 (eventual write 가능성 대비)
sleep 5

# 5) chats 재조회 — 여전히 비어 있음 ❌
curl -sS -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/chats"
# → {"items":[],"next_cursor":null}     ← 기대: 방금 thread 1건

# 6) 방금 사용한 thread_id로 messages — 404 ❌
curl -sS -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/v1/chats/$THREAD_ID/messages"
# → {"detail":"대화를 찾을 수 없습니다"}  ← 기대: 200 + user/assistant 메시지 2건
```

---

## 기대 동작 vs 실제

| 단계 | 기대 | 실제 |
|---|---|---|
| `/chat/stream` 호출 직후 | thread + user/assistant message 2건이 DB에 저장됨 | 저장 안 됨 |
| `GET /chats` | 방금 thread가 `items[0]`에 포함, `title` 자동 생성(첫 user query 요약) | 빈 배열 |
| `GET /chats/{tid}/messages` | 200 + 메시지 2건 (user query, assistant 응답) | 404 |

---

## 영향 받는 FE 기능

FE 코드(`Phase 2 — chatStore BE 통합`)는 영속화가 활성화되는 즉시 다음을 자동 지원하도록 작성됨:

- 사이드바 채팅 히스토리 자동 동기화 (`loadFromServer` → `chatsApi.list`)
- 채팅 클릭 시 BE에서 메시지 fetch (`loadSession` → `chatsApi.messages`)
- 채팅 삭제 (`deleteSession` → `chatsApi.delete`) — optimistic
- 제목 변경 (`renameSession` → `chatsApi.rename`) — optimistic

현재 상태에서는 위 기능이 **항상 빈 결과를 받으므로 사이드바가 새로고침마다 비워집니다.**

---

## 의심 코드 위치 (BE) — 확인 부탁드립니다

확인 부탁드리는 영역:

1. **`chat/stream` 핸들러** — LLM/LangGraph 호출 직전·직후에 다음이 있는지:
   - 신규 `thread_id`면 `chat_threads` 테이블에 INSERT (user_id, thread_id, title)
   - user query를 `messages` 테이블에 INSERT (role=`user`)
   - assistant 응답(블록들)을 `messages` 테이블에 INSERT (role=`assistant`)
   - 응답 완료 후 `chat_threads.title` 자동 생성/업데이트 (첫 query 요약)
2. **트랜잭션/커밋** — SSE는 long-running. 응답 완료 콜백/finally에서 commit이 빠졌을 가능성.
3. **user_id 매칭** — JWT의 `sub`(user_id)가 INSERT 시 누락되면 GET 쿼리(`WHERE user_id = ?`)에서 안 보일 수 있음.
4. **deleted_at / 소프트 삭제 필터** — INSERT는 되는데 GET이 `WHERE deleted_at IS NULL` 같은 조건으로 가려질 가능성. (이번 케이스는 INSERT 자체가 안 되는 듯하지만 확인 차원)

---

## 부가 정보

- 인증은 정상 (`POST /api/v1/auth/signup`, `/login` 모두 OK, 401 핸들링 OK)
- `query`와 `token` 모두 query string으로 전달 (EventSource 한계). 보안 점검은 별도 이슈.
- SSE 응답 자체 품질은 정상 — `status / intent / text_stream(delta) / done` 순으로 전송됨.
- 재현 토큰 예시(만료 전까지 사용 가능):
  - 새 가입 계정: `repro_*@example.com` / `testpass1234`
  - 기존 테스트 계정: `claude_test_1778575930@example.com` / `testpass1234`
