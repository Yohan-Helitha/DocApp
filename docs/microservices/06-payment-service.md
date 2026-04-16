# Payment Service

## 1) What this microservice should build
- Consultation payment initialization and callback handling.
- Integration with PayHere/Dialog Genie/FriMi or Stripe/PayPal sandbox.
- Payment status persistence and transaction history.
- Refund and reconciliation support for cancelled appointments.

## 2) Other microservices that communicate with this service
- **Incoming**: API Gateway, Appointment Service, Admin Management Service.
- **Outgoing**: Notification Service (payment success/failure), Appointment Service (payment confirmation), Admin Management Service (financial oversight data).

## 3) API endpoints for this microservice
- `POST /api/v1/payments/initiate` (alias: `POST /api/v1/payments/checkout`)
- `POST /api/v1/payments/notify` (alias: `POST /api/v1/payments/webhooks/provider-callback`)
- `GET /api/v1/payments/{paymentId}`
- `GET /api/v1/payments/appointments/{appointmentId}`
- `POST /api/v1/payments/{paymentId}/refund`
- `GET /api/v1/payments/reports/summary`
