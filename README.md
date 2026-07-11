# Linear → Google Calendar Sync

Linear 이슈에 due date를 지정하면 DDD Web2팀 Google Calendar에 이벤트가 자동으로 생성/갱신/삭제되는 단방향 동기화 시스템.

## 아키텍처

```
┌──────────────────┐
│   Linear Issue   │
│  (dueDate 변경)  │
└────────┬─────────┘
         │ webhook (HTTPS POST + HMAC 서명)
         ▼
┌──────────────────────────────────────────┐
│   Vercel Serverless Function             │
│   POST /api/webhook                      │
│                                          │
│   1. linear-signature 헤더 검증          │
│   2. Issue 이벤트 & action 판별          │
│   3. dueDate 존재 여부 확인              │
│   4. Google Calendar API 호출            │
└────────┬─────────────────────────────────┘
         │ OAuth2 (refresh token)
         ▼
┌──────────────────────────┐
│  DDD Web2팀              │
│  Google Calendar         │
│                          │
│  이벤트 매핑 저장:       │
│  extendedProperties      │
│    .private              │
│    .linearIssueId        │
└──────────────────────────┘
```

별도 DB 없이 Google Calendar 이벤트의 `extendedProperties.private.linearIssueId` 필드에 Linear 이슈 ID를 저장. 동일 이슈 webhook이 다시 오면 이 필드로 기존 이벤트를 조회 → 있으면 갱신, 없으면 생성.

## 워크플로우

### Linear 이슈 상태에 따른 캘린더 동작

| Linear 이벤트 | dueDate | 기존 캘린더 이벤트 | 캘린더 동작 |
|---|---|---|---|
| 이슈 생성 | 있음 | - | **이벤트 생성** |
| 이슈 수정 | 있음 | 없음 | **이벤트 생성** |
| 이슈 수정 | 있음 | 있음 | **이벤트 갱신** (제목·날짜·내용) |
| 이슈 수정 | 없음 (제거) | 있음 | **이벤트 삭제** |
| 이슈 수정 | 없음 | 없음 | 무시 |
| 이슈 삭제 | - | 있음 | **이벤트 삭제** |
| 이슈 삭제 | - | 없음 | 무시 |

### 처리 흐름

```
Linear 이슈 변경
     │
     ▼
[1] webhook 수신 (POST /api/webhook)
     │
     ▼
[2] HMAC-SHA256으로 서명 검증
     │ (실패 시 400 반환)
     ▼
[3] payload.type이 "Issue"인지 확인
     │
     ▼
[4] action 분기
     │
     ├─ "remove"  → 기존 이벤트 조회 → 있으면 삭제
     │
     └─ "create" / "update"
             │
             ▼
        dueDate 존재?
             │
        ┌────┴────┐
        │         │
        아니오    예
        │         │
        ▼         ▼
   기존 이벤트  기존 이벤트
   있으면 삭제   있으면 갱신
                없으면 생성
     │
     ▼
[5] Google Calendar API 호출 결과 반환
```

### 이슈 → 캘린더 이벤트 매핑

| 캘린더 필드 | Linear 이슈에서 채우는 값 |
|---|---|
| 제목 (summary) | `[DDD-42] 이슈 제목` |
| 설명 (description) | 이슈 URL / State / Assignee / Priority |
| 시작·종료 날짜 | `dueDate` (all-day 이벤트) |
| 매핑 키 | `extendedProperties.private.linearIssueId` |
