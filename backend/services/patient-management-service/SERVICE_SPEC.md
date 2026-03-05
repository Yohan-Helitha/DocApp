# Patient Management Service Specification

## 1. What this microservice should build
- Patient registration/profile management, report upload, history/prescription views.

## 2. Communicating microservices
- Auth Service, Appointment Service, Telemedicine Service, Doctor Management Service, Notification Service, Admin Management Service.

## 3. API endpoints
- `POST /api/v1/patients`
- `GET /api/v1/patients/{patientId}`
- `PUT /api/v1/patients/{patientId}`
- `DELETE /api/v1/patients/{patientId}`
- `POST /api/v1/patients/{patientId}/medical-reports`
- `GET /api/v1/patients/{patientId}/medical-history`
- `GET /api/v1/patients/{patientId}/prescriptions`
