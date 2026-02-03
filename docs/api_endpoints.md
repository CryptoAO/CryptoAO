# Core API Endpoints (v1)

## Auth / Profiles
- `POST /v1/auth/demo-login`
  - Response: `{ token, children: [] }`
- `GET /v1/children`
- `POST /v1/children/select`

## Kid Chat
- `POST /v1/chat`
  - Body: `{ child_id, message, mode, locale }`
  - Response: `{ reply, choices, safety_event?, metadata }`

## Quests
- `GET /v1/quests`
- `POST /v1/quests/start`
- `POST /v1/quests/step`
- `POST /v1/quests/complete`

## Learning World
- `GET /v1/world`

## Parent Dashboard
- `GET /v1/parent/summary`
- `GET /v1/parent/safety-audit`
- `GET /v1/parent/sessions?days=7`
- `GET /v1/parent/sessions/{session_id}`

## Admin
- `POST /v1/admin/reset-demo`
