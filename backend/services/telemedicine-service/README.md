# Telemedicine Service

Simple telemedicine session orchestration service. Provides session CRUD and join-token endpoints.

Endpoints (match spec):
- `POST /api/v1/telemedicine/sessions`
- `GET /api/v1/telemedicine/sessions/{sessionId}`
- `POST /api/v1/telemedicine/sessions/{sessionId}/join-token`
- `PUT /api/v1/telemedicine/sessions/{sessionId}/start`
- `PUT /api/v1/telemedicine/sessions/{sessionId}/end`

Configuration via environment variables (see `src/config/environment.js`).
