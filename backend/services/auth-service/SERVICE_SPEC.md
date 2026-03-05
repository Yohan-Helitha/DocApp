# Auth Service Specification

## 1. What this microservice should build
- Authentication and role-based authorization for Patient, Doctor, and Admin.

## 2. Communicating microservices
- Communicates with all services via token validation and role checks.

## 3. API endpoints
- `POST /api/v1/auth/register/patient`
- `POST /api/v1/auth/register/doctor`
- `POST /api/v1/auth/register/admin`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh-token`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/verify-token`
