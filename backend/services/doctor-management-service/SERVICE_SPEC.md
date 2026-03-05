# Doctor Management Service Specification

## 1. What this microservice should build
- Doctor profiles, verification state, availability scheduling, access to patient reports.

## 2. Communicating microservices
- Auth Service, Appointment Service, Telemedicine Service, Admin Management Service, Notification Service, Patient Management Service.

## 3. API endpoints
- `POST /api/v1/doctors`
- `GET /api/v1/doctors/{doctorId}`
- `PUT /api/v1/doctors/{doctorId}`
- `POST /api/v1/doctors/{doctorId}/availability-slots`
- `GET /api/v1/doctors/{doctorId}/availability-slots`
- `PUT /api/v1/doctors/{doctorId}/verification-status`
