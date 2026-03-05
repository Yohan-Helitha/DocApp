# Notification Service

## 1) What this microservice should build
- SMS and email notification dispatch for booking and consultation events.
- Template-based notifications for patients and doctors.
- Delivery status tracking and retry policy.

## 2) Other microservices that communicate with this service
- **Incoming**: Appointment Service, Telemedicine Service, Payment Service, Patient Management Service, Doctor Management Service, Admin Management Service.
- **Outgoing**: Third-party SMS and email provider APIs.

## 3) API endpoints for this microservice
- `POST /api/v1/notifications/send-email`
- `POST /api/v1/notifications/send-sms`
- `POST /api/v1/notifications/send-bulk`
- `GET /api/v1/notifications/{notificationId}`
- `GET /api/v1/notifications/delivery-status/{referenceId}`
