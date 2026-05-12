# [BE 이슈] Google Calendar OAuth 환경설정 누락

**작성**: 2026-05-12, FE
**환경**: GCE `localbiz-api` (`34.22.91.75:8000`)
**대상**: BE 인증/캘린더 담당자, DevOps

> `GET /api/v1/auth/google/calendar`는 200으로 `auth_url`을 발급하지만,
> URL 내의 **`client_id` 파라미터가 빈 값**이고 **`redirect_uri`가 `localhost:8000`**으로 박혀
> 외부 환경에서 OAuth가 실 작동하지 않습니다.

---

## 책임 라우트

| 라우트 | 동작 | 비고 |
|---|---|---|
| `GET /api/v1/auth/google/calendar` | ⚠️ 200이지만 잘못된 client_id/redirect_uri | 환경변수 미적용 |
| `GET /api/v1/auth/google/calendar/callback` | (미검증, redirect_uri가 localhost라 도달 불가) | redirect_uri 수정 후 재검증 |

---

## 재현

```bash
TOKEN=...   # 로그인 토큰
curl -sS -H "Authorization: Bearer $TOKEN" \
  http://34.22.91.75:8000/api/v1/auth/google/calendar
```

응답 예시:
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth
              ?client_id=
              &redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fapi%2Fv1%2Fauth%2Fgoogle%2Fcalendar%2Fcallback
              &response_type=code
              &scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar
              &access_type=offline
              &prompt=consent
              &state=..."
}
```

→ `client_id=` 빈 값. 사용자가 이 URL로 이동하면 Google이 **`Error 401: invalid_client`** 응답.

→ 동시에 `redirect_uri=http://localhost:8000/...`인데 dev BE는 GCE 외부 IP(`34.22.91.75:8000`).
   사용자 브라우저가 localhost로 콜백 가도 BE에 도달 불가.

---

## 원인 추정

FE 측에서 전달받은 BE `.env` 내용 (재인용):
```
GOOGLE_CALENDAR_CLIENT_ID=124882044304-ipl2mfoseglvhmejl6bt7f494olhli52.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=GOCSPX-...
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/calendar/callback
```

추정 원인:
1. **GCE의 systemd/Docker가 `.env`를 못 읽거나 다른 .env를 사용** — `GOOGLE_CALENDAR_CLIENT_ID`가 빈 문자열로 fallback.
2. **`GOOGLE_CALENDAR_REDIRECT_URI`가 localhost로 박힌 채 dev 배포** — 외부 IP나 dev 도메인으로 교체 필요.

---

## 권장 수정

### 1. dev BE 환경변수 적용
- GCE `localbiz-api` 인스턴스에서 `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET` 적용 확인.
- 우선 시작 명령에서 환경변수 노출 여부 확인:
  ```bash
  # GCE SSH에서
  sudo systemctl show-environment | grep GOOGLE_CALENDAR
  # 또는 docker exec ... env | grep GOOGLE_CALENDAR
  ```
- 빈 값이면 `.env` 로드 경로 또는 systemd `EnvironmentFile` 점검.

### 2. `redirect_uri`를 환경별로 분리
- dev BE: `http://34.22.91.75:8000/api/v1/auth/google/calendar/callback`
  (또는 dev 도메인이 있다면 그쪽)
- prod BE: 실 도메인
- Google Cloud Console의 OAuth 클라이언트 "승인된 리디렉션 URI"에도 dev URI 추가 필요.

### 3. FE에서 사용자에게 보이는 흐름 (수정 후)
콜백 처리 BE 핸들러(`/api/v1/auth/google/calendar/callback`)는 현재 JSON `{message:"..."}` 응답.
FE의 `/calendar/connected` 라우트로 **HTTP 302 redirect** 권장
(`success=1` 또는 `error=access_denied` 등 쿼리 파라미터 포함).
`src/components/share/CalendarConnected.tsx` 파일 헤더 주석에 동일 요청이 적혀 있습니다.

---

## FE 측에서 가능한 추가 대응

- BE 환경설정이 수정되기 전까지 SettingsPage의 "Google Calendar 연동하기" 버튼에
  `disabled` 상태 + 안내 메시지를 거는 것도 검토 가능. 다만 BE 응답을 받기 전에는
  client_id 누락 여부를 모르므로, 누른 후 OAuth 화면에서 에러를 받는 게 현재 UX.
- 수정 권한이 BE 측에 있어 본 보고 후 처리 결과에 따라 FE 재검증.

---

## 부가 정보

- 우리 FE의 `googleCalendarApi.getAuthUrl()`은 정상 동작 — 받은 `auth_url`을 그대로 `window.location.href`에 할당. BE가 올바른 URL을 만들기만 하면 FE 변경 불필요.
- 본 이슈는 별도 라우트 영역(`POST /chats/{tid}/share` 등)과 무관 — Google Calendar 핸들러만 영향.
