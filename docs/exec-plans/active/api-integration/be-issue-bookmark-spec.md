# [BE 이슈] 북마크 라우트 스펙 정합성

**작성**: 2026-05-12, FE
**환경**: GCE `localbiz-api` (`34.22.91.75:8000`), `AnyWay v0.1.0`
**대상**: BE 북마크 API 담당자

> 영속화 자체는 정상 작동합니다 (POST → 201 → 즉시 GET에 반영). 본 이슈는
> **명세/타입 정합성**과 **DELETE 라우트의 307 redirect** 두 가지 마이너 사항입니다.

---

## 책임 라우트

| 라우트 | 동작 | 비고 |
|---|---|---|
| `POST /api/v1/users/me/bookmarks` | ✅ 201 (integer message_id) | message_id 타입 명세 정정 필요 |
| `GET /api/v1/users/me/bookmarks` | ✅ 200 | 정상 |
| `DELETE /api/v1/users/me/bookmarks/{id}` | ⚠️ 307 redirect | trailing slash 차이로 보임 |

---

## 이슈 1: `message_id`는 integer만 받음 (스펙은 string 허용 표기)

### 재현

```bash
# string으로 보내면 422
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"thread_id":"t1","message_id":"msg-1","pin_type":"general"}' \
  http://34.22.91.75:8000/api/v1/users/me/bookmarks
# →
# {"detail":[{"type":"int_parsing","loc":["body","message_id"],
#  "msg":"Input should be a valid integer, unable to parse string as an integer","input":"msg-1"}]}
# [HTTP 422]

# integer로 보내면 정상
curl -X POST ... -d '{"thread_id":"t1","message_id":1,"pin_type":"general"}'
# → 201
```

### 명세와의 차이

- OpenAPI 응답의 `BookmarkItem.message_id`는 `{"type":"integer"}` 단독 — BE는 일관됨.
- 그러나 **프로젝트 가이드 문서**(`apispec/API_SPEC.md`, FE 타입 `src/types/api.ts`)는 BIGINT 직렬화 정밀도를 이유로 `string | number` 양쪽 수용으로 작성됨. **BE 측에서 string도 허용하도록 보강**하거나, 명세를 `integer-only`로 통일해야 합니다.

### 권장

다음 중 하나:
1. BE가 string도 받아 내부에서 int로 파싱 (Pydantic `Union[int, str]` + validator). FE는 양쪽 보낼 수 있음.
2. 명세를 `integer-only`로 통일하고 FE가 호출 직전 `Number()` 강제 변환. BIGINT 정밀도가 실제로 문제되지 않는 범위라면 이 쪽이 단순.

### FE 영향

FE의 채팅 메시지 ID는 `msg-${Date.now()}-agent` 형태 string이라
**BE 영속화 이슈가 풀려야 BE-recognized integer를 얻을 수 있음**. 그때까지는 메시지 북마크
실 사용 흐름이 막힘 (chat 영속화 이슈 참조: `be-issue-chat-persistence.md`).

---

## 이슈 2: `DELETE /bookmarks/{id}` 307 redirect

### 재현

```bash
curl -I -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://34.22.91.75:8000/api/v1/users/me/bookmarks/1
# → HTTP/1.1 307 Temporary Redirect  (Location 헤더가 trailing slash 추가 등)
```

브라우저 `fetch`는 redirect를 자동 follow하므로 **기능은 동작합니다**(204 응답 수신).
다만 다음 단점이 있습니다:

- 한 번의 DELETE에 두 번의 왕복 발생 (지연/비용)
- CORS preflight가 redirect 후 URL에 대해 재발생 가능 (`access-control-allow-origin` 재확인 필요)
- 일부 클라이언트(curl 단독, 일부 HTTP 라이브러리)는 follow하지 않아 작업 실패

### 의심 원인

FastAPI의 `redirect_slashes=True` 기본 동작. 라우트가 `/{bookmark_id}/` (trailing slash 포함)로
등록돼 있으면 slash 없는 요청에 307이 응답됩니다.

### 권장

라우터에 trailing slash 없는 형태로 통일:
```python
@router.delete("/{bookmark_id}")  # trailing slash 없이
```
또는 `APIRouter(redirect_slashes=False)`로 설정 후 두 형식 모두 직접 등록.

---

## 부가 정보

- 재현 토큰: 기존 테스트 계정 `claude_test_1778575930@example.com` / `testpass1234` 사용 가능.
- POST 응답 예시:
  ```json
  {"bookmark_id":1,"thread_id":"thread-test-1","message_id":1,
   "pin_type":"general","preview_text":"테스트",
   "created_at":"2026-05-12T09:32:41.844302Z"}
  ```
- GET 응답 예시:
  ```json
  {"items":[{"bookmark_id":1, ...}],"next_cursor":null}
  ```
