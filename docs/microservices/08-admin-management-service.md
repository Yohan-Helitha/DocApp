# Admin Management Service

## 1) What this microservice should build
- User account administration and role governance.
- Doctor registration verification workflow.
- Platform operation oversight and financial transaction monitoring.
- Audit trail and compliance-oriented reporting.

## 2) Other microservices that communicate with this service
- **Incoming**: API Gateway, Auth Service.
- **Outgoing**: Doctor Management Service (verification actions), Payment Service (financial data), Patient Management Service and Notification Service (operations control).

## 3) API endpoints for this microservice
- `GET /api/v1/admin/users`
- `PUT /api/v1/admin/users/{userId}/status`
- `GET /api/v1/admin/doctors/pending-verification`
- `PUT /api/v1/admin/doctors/{doctorId}/verify`
- `GET /api/v1/admin/transactions`
- `GET /api/v1/admin/audit-logs`
- `GET /api/v1/admin/dashboard/metrics`
