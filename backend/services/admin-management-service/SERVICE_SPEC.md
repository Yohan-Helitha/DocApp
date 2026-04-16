# Admin Management Service Specification

## 1. What this microservice should build
- Manage users, verify doctors, monitor operations and financial transactions.

## 2. Communicating microservices
- Auth Service, Doctor Management Service, Payment Service, Patient Management Service, Notification Service.

## 3. API endpoints
- `GET /api/v1/admin/users`
- `PUT /api/v1/admin/users/{userId}/status`
- `GET /api/v1/admin/doctors/pending-verification`
- `PUT /api/v1/admin/doctors/{doctorId}/verify`
- `GET /api/v1/admin/transactions`
- `GET /api/v1/admin/audit-logs`
- `GET /api/v1/admin/dashboard/metrics`
