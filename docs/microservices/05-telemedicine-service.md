# Telemedicine Service

## 1) What this microservice should build
- Secure real-time video session orchestration.
- Integration wrapper for third-party video APIs (Agora/Twilio/Jitsi).
- Session lifecycle handling (create, start, end, recording metadata if enabled).
- Session access token generation for doctor and patient.

## 2) Other microservices that communicate with this service
- **Incoming**: API Gateway, Appointment Service.
- **Outgoing**: Notification Service (session reminders), Doctor Management Service and Patient Management Service (identity/session authorization validation).

## 3) API endpoints for this microservice
- `POST /api/v1/telemedicine/sessions`
- `GET /api/v1/telemedicine/sessions/{sessionId}`
- `POST /api/v1/telemedicine/sessions/{sessionId}/join-token`
- `PUT /api/v1/telemedicine/sessions/{sessionId}/start`
- `PUT /api/v1/telemedicine/sessions/{sessionId}/end`
- `GET /api/v1/telemedicine/appointments/{appointmentId}/session`
