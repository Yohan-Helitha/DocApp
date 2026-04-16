# Telemedicine-Appointment Integration Guide

## Purpose
This document explains how to connect Telemedicine Service with Appointment Service for the full scenario:

1. Patient books an appointment.
2. Doctor creates Jitsi session using that appointment.
3. Doctor starts session.
4. Patient joins through the site.

It also includes a safe temporary approach for development when Appointment Service is not yet implemented.

References used:
- docs/microservices/04-appointment-service.md
- docs/schema-specifications/appointment-schema.md
- backend/services/appointment-service/SERVICE_SPEC.md

---

## Current State (Gap Analysis)

Current Telemedicine implementation:
- Accepts `appointment_id` on session creation.
- Stores it in telemedicine DB.
- Does not validate appointment existence/ownership with Appointment Service.
- Returns Jitsi `joinUrl` based on internal session data.

What is missing for full business scenario:
- Appointment ownership validation (doctor/patient bound to same appointment).
- Appointment status validation (only allowed statuses can create/start/join session).
- Patient-side lookup by appointment (without exposing raw session IDs).
- Service-to-service contract and fallback behavior if appointment system is unavailable.

---

## Required Integration Contract

From Appointment Service docs, Telemedicine should rely on:
- `GET /api/v1/appointments/{appointmentId}`

Expected minimum response fields needed by Telemedicine:
- `appointment_id`
- `patient_id`
- `doctor_id`
- `appointment_status`

Accepted statuses for telemedicine flow (recommended):
- Allow create session only when status is `confirmed`.
- Optionally allow `pending` in dev mode.
- Deny for `cancelled`, `rejected`, `completed`.

---

## Backend Changes in Telemedicine Service

## 1) Environment configuration
Add these env vars in telemedicine config:

- `APPOINTMENT_SERVICE_URL` (example: `http://appointment-service:4020`)
- `APPOINTMENT_INTEGRATION_MODE` with values:
  - `strict`: appointment API must be available and valid.
  - `soft`: try appointment API, fallback to local mock mapping.
  - `mock`: skip appointment API and use local mapping only.
- `ALLOW_PENDING_APPOINTMENTS` (`true|false`) for dev/testing.

Recommended default:
- production: `strict`
- local dev before appointment service exists: `mock`

## 2) Add appointment client module
Create a module (example `src/clients/appointmentClient.js`) that:
- Calls `GET /api/v1/appointments/{id}`.
- Handles timeout/retry.
- Normalizes response to:
  - `appointmentId`
  - `patientId`
  - `doctorId`
  - `status`
- Returns typed errors:
  - `appointment_not_found`
  - `appointment_service_unavailable`
  - `appointment_response_invalid`

## 3) Add authorization checks
In telemedicine service logic:
- On `createSession`:
  - Verify caller role is `doctor`.
  - Verify caller `user_id` matches appointment `doctor_id`.
- On `createJoin` or `join-token`:
  - Verify caller is either appointment doctor or appointment patient.
- On `startSession`:
  - Verify caller is appointment doctor.
- On `endSession`:
  - Verify caller is appointment doctor (or doctor/admin by policy).
- On `getSession`:
  - Verify caller is doctor/patient tied to appointment.

## 4) Strengthen telemedicine schema
Update telemedicine DB schema to include ownership snapshot for fast checks:

In `telemedicine_sessions` add columns:
- `doctor_id uuid`
- `patient_id uuid`
- `appointment_status_snapshot text`

Recommended constraints/indexes:
- unique active session per appointment (partial index where status in created/active)
- index on `appointment_id`
- index on `doctor_id`
- index on `patient_id`

Optional table for event audit:
- `telemedicine_events(event_id, session_id, event_type, actor_id, actor_role, created_at, metadata_json)`

## 5) New endpoint for patient-side join by appointment
Add endpoint:
- `GET /api/v1/telemedicine/appointments/{appointmentId}/join`

Behavior:
- Validate caller belongs to appointment.
- Find session by `appointment_id`.
- Return `joinUrl` only if allowed by state.
- If no session: return `404 session_not_created`.
- If session not started and policy requires started state: return `409 session_not_started`.

This avoids exposing internal `session_id` in patient UI.

---

## API Gateway Changes

Gateway should route appointment APIs too:
- `/api/v1/appointments/*` -> Appointment Service

Telemedicine may call Appointment Service directly (service-to-service) OR via gateway internal DNS.
Recommended for microservices:
- service-to-service direct call in cluster (less coupling to public gateway routing).

---

## Temporary Strategy Before Appointment Service Exists

Use a local mapping table inside Telemedicine Service.

## 1) Add mock table
Create table (example):
- `mock_appointments`
  - `appointment_id uuid primary key`
  - `doctor_id uuid not null`
  - `patient_id uuid not null`
  - `appointment_status text not null`
  - `scheduled_at timestamptz`
  - `created_at timestamptz default now()`

## 2) Seed script
Add seed script to insert test rows matching real user IDs from auth/users.

## 3) Integration mode behavior
- `strict`: no fallback; fail with 503 if appointment service unreachable.
- `soft`: appointment API first, fallback to `mock_appointments`.
- `mock`: only use `mock_appointments`.

## 4) Keep contract-compatible response shape
Even in `mock` mode, normalize to the same structure as real appointment response.
This lets you switch to real service later with minimal code changes.

---

## Frontend Changes for Full Scenario

## Doctor UI flow
1. Fetch doctor appointments (`confirmed`).
2. Doctor selects an appointment (not manual free text if possible).
3. Call create session with selected `appointment_id`.
4. Start session when ready.

## Patient UI flow
1. Fetch patient appointments.
2. For selected appointment, call `GET /appointments/{appointmentId}/join` on Telemedicine Service.
3. If available, enable "Join Meeting" button and open returned `joinUrl`.

Recommended UX states:
- `No session yet`
- `Session created, waiting for doctor`
- `Session active, join now`
- `Session ended`

---

## Endpoint-Level Rules (Recommended)

## POST /api/v1/telemedicine/sessions
- caller role must be doctor
- appointment must exist
- appointment.doctor_id == caller user id
- status allowed (confirmed, optional pending)
- only one active session per appointment

## GET /api/v1/telemedicine/sessions/{sessionId}
- caller must match doctor_id or patient_id (or admin)

## POST /api/v1/telemedicine/sessions/{sessionId}/join-token
- caller must match doctor_id or patient_id
- returns Jitsi join details

## PUT /api/v1/telemedicine/sessions/{sessionId}/start
- only doctor for that appointment

## PUT /api/v1/telemedicine/sessions/{sessionId}/end
- only doctor for that appointment

## GET /api/v1/telemedicine/appointments/{appointmentId}/join
- caller must belong to appointment
- return join URL by appointment

---

## Error Codes to Standardize

Use consistent JSON errors:
- `appointment_not_found` (404)
- `appointment_service_unavailable` (503)
- `appointment_access_denied` (403)
- `appointment_status_not_allowed` (409)
- `session_not_created` (404)
- `session_not_started` (409)
- `forbidden` (403)

---

## Test Plan (When Appointment Service Is Not Ready)

## Backend integration tests
1. `mock` mode:
- create session with valid mock appointment -> 201
- create session with invalid appointment -> 404
- patient calling start -> 403

2. `soft` mode:
- appointment API down but mock exists -> success
- appointment API down and no mock -> 503

3. Join flow:
- patient join by appointment -> 200 + joinUrl
- unrelated user join -> 403

## Frontend tests
1. Doctor can create/start by selected appointment.
2. Patient can join with same appointment.
3. Unauthorized patient cannot join another appointment.

---

## Migration Plan When Appointment Service Goes Live

1. Keep `APPOINTMENT_INTEGRATION_MODE=soft` briefly.
2. Compare live responses vs mock table for a test period.
3. Switch to `strict` in production.
4. Stop writing new mock rows.
5. Remove mock fallback after stabilization.

---

## Implementation Checklist

1. Add env vars and config parsing.
2. Implement appointment client with normalized output.
3. Add mock table and seed script.
4. Update create/get/start/end/join logic with ownership checks.
5. Add appointment-based join endpoint.
6. Add DB migration for doctor/patient snapshot columns.
7. Update integration tests for strict/mock modes.
8. Update frontend doctor and patient flows to appointment-driven UX.
9. Document operational mode switch (`mock` -> `soft` -> `strict`).

---

## Minimal Immediate Action (Fastest)

If you need a quick implementation now:
1. Add `mock_appointments` table.
2. Enforce doctor ownership on create/start/end.
3. Add patient join-by-appointment endpoint.
4. Return Jitsi `joinUrl` only for assigned patient/doctor.

This gives you a credible end-to-end demo before Appointment Service is fully built, while keeping architecture aligned with final microservice contract.
