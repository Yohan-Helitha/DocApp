# Doctor verification (Auth Service)

This document describes the doctor registration + admin verification workflow implemented in the Auth Service.

## Goal
Doctors can **request** registration by submitting a license/proof document. An **admin must approve** the request before the doctor can log in.

## Data model (Auth DB)
- `users`
  - `role = 'doctor'`
  - `account_status` is used to gate login:
    - `pending_verification` (default for doctors)
    - `active` (approved)
    - `rejected` (rejected by admin)

- `doctor_verification_requests`
  - Stores the uploaded license document + a small amount of profile/application data.
  - Key columns:
    - `user_id` (unique) → `users.user_id`
    - `status`: `pending` | `approved` | `rejected`
    - `profile_data` (JSON)
    - `license_*` metadata + `license_data` (BYTEA)
    - `reviewed_by_admin_id`, `review_reason`, timestamps

## API

### 1) Doctor registers (multipart + license upload)
`POST /api/v1/auth/register/doctor`

- Content-Type: `multipart/form-data`
- Fields:
  - `email` (string, required)
  - `password` (string, required)
  - `full_name` (string, optional)
  - `specialization` (string, optional)
  - `notes` (string, optional)
  - `license` (file, required) — PDF/PNG/JPEG, max 5MB

Behavior:
- Creates `users` record with:
  - `role = 'doctor'`
  - `account_status = 'pending_verification'`
- Creates `doctor_verification_requests` row with the uploaded license.

Responses:
- `201` → `{ user, verification: { status: 'pending' } }`
- `400 license_required` if no license
- `400 invalid_license_type` if mime type not allowed
- `409 email_exists` if email already registered

### 2) Login is blocked until approved
`POST /api/v1/auth/login`

Behavior:
- If the user is not `account_status = 'active'`, login returns `403`.

Possible errors:
- `403 pending_verification` (doctor not yet approved)
- `403 account_inactive` (e.g., rejected/disabled)

### 3) Admin: list pending doctor verifications
`GET /api/v1/auth/admin/doctors/pending-verification`

Auth:
- Bearer JWT required
- `req.user.role` must be `admin`

Response:
- `200` → `{ doctors: [...] }` where each entry includes application metadata and license file info (name/type/size).

### 4) Admin: download a doctor’s license
`GET /api/v1/auth/admin/doctors/:userId/license`

Auth:
- Bearer JWT required
- `req.user.role` must be `admin`

Response:
- `200` with file bytes
- `404 license_not_found`

### 5) Admin: approve/reject doctor
`PUT /api/v1/auth/admin/doctors/:userId/verify`

Body:
```json
{ "status": "approved", "reason": "optional" }
```

Auth:
- Bearer JWT required
- `req.user.role` must be `admin`

Behavior:
- If approved:
  - Updates `users.account_status` → `active`
  - Updates `doctor_verification_requests.status` → `approved`
- If rejected:
  - Updates `users.account_status` → `rejected`
  - Updates `doctor_verification_requests.status` → `rejected`

## Notes / Integration
- Doctor profile creation in `doctor-management-service` is currently separate (`POST /api/v1/doctors`).
  - With login blocking enabled, a doctor can only create their doctor profile **after** admin approval.
- For a fully automated flow, you could extend the system so admin approval also triggers doctor profile creation, but that is not implemented here.
