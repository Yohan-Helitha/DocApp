# Appointment Service Specification

## 1. What this microservice should build
- Search doctors, create/update/cancel appointments, appointment status tracking.

## 2. Communicating microservices
- Doctor Management Service, Patient Management Service, Payment Service, Notification Service, Telemedicine Service.

## 3. API endpoints
- `GET /api/v1/appointments/doctors/search`
- `POST /api/v1/appointments`
- `GET /api/v1/appointments/{appointmentId}`
- `PUT /api/v1/appointments/{appointmentId}`
- `DELETE /api/v1/appointments/{appointmentId}`
- `PUT /api/v1/appointments/{appointmentId}/status`
