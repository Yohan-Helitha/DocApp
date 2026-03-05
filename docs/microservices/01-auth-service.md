# Auth Service

## 1) What this microservice should build
- User registration and login for **Patient**, **Doctor**, and **Admin** roles.
- JWT/OAuth2 token issue, refresh, and revocation.
- Role and permission claims for downstream authorization.
- Password reset and account activation support.

## 2) Other microservices that communicate with this service
- **Incoming**: API Gateway, Frontend web client.
- **Outgoing**: Patient Management Service, Doctor Management Service, Admin Management Service (for profile/user sync).
- **Used by**: All backend services for token validation and role checks.

## 3) API endpoints for this microservice
- `POST /api/v1/auth/register/patient`
- `POST /api/v1/auth/register/doctor`
- `POST /api/v1/auth/register/admin`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh-token`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/auth/verify-token`
