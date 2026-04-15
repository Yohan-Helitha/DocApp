# Payment Service Specification

## 1. What this microservice should build
- Consultation payment flow with local/global providers and refund support.

## 2. Communicating microservices
- Appointment Service, Notification Service, Admin Management Service.

## 3. API endpoints
- `POST /api/v1/payments/initiate` (alias: `POST /api/v1/payments/checkout`)
- `POST /api/v1/payments/notify` (alias: `POST /api/v1/payments/webhooks/provider-callback`)
- `GET /api/v1/payments/{paymentId}`
- `POST /api/v1/payments/{paymentId}/refund`
