# Notification Service Specification

## 1. What this microservice should build

- SMS/email notifications for booking, payment, consultation, and status updates.

## 2. Communicating microservices

- Appointment Service, Telemedicine Service, Payment Service, Patient Management Service, Doctor Management Service, Admin Management Service.

## 3. API Endpoints (v1)

### Notifications (`/api/v1/notifications`)

- `POST /send-email` - Send a single email notification
- `POST /send-sms` - Send a single SMS notification
- `POST /send-bulk` - Send bulk notifications (Admin only)
- `GET /user/:userId` - Get all notifications for a specific user
- `GET /:id` - Get specific notification details
- `PUT /:id` - Update an existing notification record
- `DELETE /:id` - Delete a notification record

### Notification Attempts (`/api/v1/attempts`)

- `POST /` - Record a delivery attempt
- `GET /notification/:id` - Get all attempts for a specific notification
- `GET /:id` - Get details of a single attempt record
