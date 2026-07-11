# Linear → Google Calendar Sync

Linear 이슈의 due date를 Google Calendar 이벤트로 자동 동기화하는 Vercel 서버리스 함수.

## 동작 방식

1. Linear webhook이 `/api/webhook`으로 POST
2. `linear-signature` 헤더를 HMAC-SHA256으로 검증
3. `Issue` 이벤트일 때 action / dueDate 존재 여부로 분기
   - dueDate 있음 + 이벤트 없음 → 생성
   - dueDate 있음 + 이벤트 있음 → 갱신 (title/description/date 반영)
   - dueDate 없음 + 이벤트 있음 → 삭제
   - `remove` action → 삭제
4. Google Calendar 이벤트의 `extendedProperties.private.linearIssueId`로 이슈-이벤트 매핑 유지 (별도 DB 불필요)

## 로컬 개발

```bash
pnpm install
cp .env.local.example .env.local
# .env.local 값 채우기
pnpm dev
```

로컬 포트를 외부 노출 (ngrok 등)한 뒤 Linear webhook URL로 등록하면 실제 이벤트 확인 가능.

## 배포

1. GitHub 리포에 푸시
2. Vercel에서 Import Project → 자동 배포
3. Vercel Settings > Environment Variables에 아래 값 등록
4. Linear Settings > API > Webhooks에서 URL을 `https://<project>.vercel.app/api/webhook`으로 설정, `Issue` 이벤트 구독

## 환경변수

| 이름 | 설명 |
|---|---|
| `LINEAR_WEBHOOK_SECRET` | Linear webhook 생성 시 발급되는 signing secret |
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth 2.0 Client Secret |
| `GOOGLE_REFRESH_TOKEN` | `calendar.events` scope로 발급받은 refresh token |
| `GOOGLE_CALENDAR_ID` | 대상 캘린더 ID (`xxx@group.calendar.google.com`) |

## 파일 구조

```
api/webhook.js          # POST /api/webhook 엔드포인트
lib/verify-signature.js # HMAC-SHA256 검증
lib/gcal-client.js      # Google Calendar 클라이언트 (OAuth2 + refresh token)
lib/event-mapper.js     # Linear issue → GCal event body 매핑
lib/handler.js          # action/dueDate 분기 로직 (create/update/delete)
```

## End-to-End 검증 체크리스트

- [ ] Linear에서 due date 있는 이슈 생성 → 캘린더에 이벤트 뜨는지
- [ ] due date 변경 → 이벤트 이동
- [ ] title 변경 → 이벤트 summary 갱신
- [ ] due date 제거 → 이벤트 삭제
- [ ] 이슈 삭제(`remove`) → 이벤트 삭제
