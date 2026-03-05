# Notification Service Specification

## 1. What this microservice should build
- SMS/email notifications for booking, payment, consultation, and status updates.

## 2. Communicating microservices
- Appointment Service, Telemedicine Service, Payment Service, Patient Management Service, Doctor Management Service, Admin Management Service.

## 3. API endpoints
- `POST /api/v1/notifications/send-email`
- `POST /api/v1/notifications/send-sms`
- `POST /api/v1/notifications/send-bulk`
- `GET /api/v1/notifications/{notificationId}`
