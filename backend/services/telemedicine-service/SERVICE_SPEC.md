# Telemedicine Service Specification

## 1. What this microservice should build
- Secure video consultation sessions integrated with Agora/Twilio/Jitsi.

## 2. Communicating microservices
- Appointment Service, Notification Service, Patient Management Service, Doctor Management Service.

## 3. API endpoints
- `POST /api/v1/telemedicine/sessions`
- `GET /api/v1/telemedicine/sessions/{sessionId}`
- `POST /api/v1/telemedicine/sessions/{sessionId}/join-token`
- `PUT /api/v1/telemedicine/sessions/{sessionId}/start`
- `PUT /api/v1/telemedicine/sessions/{sessionId}/end`
