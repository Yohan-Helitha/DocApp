# Telemedicine Integration — What the Telemedicine Teammate Needs to Build

> **Context:** This document describes the agreed integration points between Afham's
> appointment-service/frontend and the telemedicine-service. It covers what each side
> needs to build and what has already been decided.

---

## What Afham Has Already Built

When a patient views their appointments (`/#/appointments`), confirmed appointment cards show a **"Join Session"** button. Clicking it navigates to:

```
/#/telemedicine?appointmentId=<appointmentId>
```

The `appointmentId` is passed as a URL query parameter. Your telemedicine page reads this and calls your session creation endpoint with it.

Afham's frontend already ensures:

- The "Join Session" button is **only shown on `confirmed` appointments** — it does not appear on `pending`, `rejected`, `cancelled`, or `completed` cards
- The patient can only see their own appointments (backend-enforced)

---

## What You Need to Build

### Part A — Backend Status Guard ✅ Agreed

You need to add a **backend validation** that checks the appointment is `confirmed` before creating or joining a session. The frontend guard alone is not enough — a direct API call could bypass it.

Before proceeding with session creation, call Afham's endpoint to verify the appointment status:

```
GET /api/v1/appointments/:appointmentId
Auth: forward the bearer token from the incoming request (patient or doctor JWT)
Response includes: { "appointment": { "appointment_status": "confirmed" | ... } }
```

**What to check:** `appointment_status === "confirmed"`. If it is anything else, reject the session creation with a `400` or `422`.

> **Why this matters:** The frontend guard handles normal UI flows, but the backend guard protects against race conditions (appointment gets cancelled/rejected between the button render and the click) and direct API abuse.

---

### Part B — Duplicate Session Guard

When both a patient and a doctor navigate to the telemedicine page for the **same appointment**, your endpoint will receive two separate `POST /api/v1/telemedicine/sessions` calls with the same `appointment_id`. You need to handle this without creating duplicate sessions.

**Recommended approach:** On receiving a session creation request, first check whether a session for that `appointment_id` already exists:

- **If a session already exists:** Return the existing session (200 or 201 with the existing session data) — do not create a second one
- **If no session exists:** Create a new session and return it (201)

An alternative is to return `409 Conflict` with the existing session details, and have the client use those details to join. Either approach is fine — this is entirely your decision.

**Why this will happen:** Afham is adding a **"Create Session"** button to the doctor-side confirmed appointment cards (see below). This means both the patient clicking "Join Session" and the doctor clicking "Create Session" will POST to your endpoint with the same `appointment_id`. Without this guard, two sessions get created for the same appointment.

> **This is entirely within your service** — no input or changes from Afham are needed for this part.

---

## What Afham Will Build (For Your Awareness)

### Doctor-side "Create Session" Button

Afham is adding a **"Create Session"** button to confirmed appointment cards in `DoctorAppointments.jsx`. It will navigate to:

```
/#/telemedicine?appointmentId=<appointmentId>
```

Identical pattern to the patient-side "Join Session" button — both pass the `appointmentId` in the URL, and your telemedicine page handles it the same way for both roles.

> **This button will not be shipped until Part B (duplicate session guard) is done**, since the scenario where both sides click their buttons hitting the same `appointment_id` is guaranteed to happen in any real session.

---

## How to Get the Appointment Details

To verify the appointment status (Part A), call Afham's endpoint through the API gateway:

```
GET /api/v1/appointments/:appointmentId
Auth: Bearer <token forwarded from the incoming request>
```

The response includes:

```json
{
  "appointment": {
    "appointment_id": "uuid",
    "appointment_status": "confirmed",
    "patient_user_id": "uuid",
    "doctor_user_id": "uuid",
    "slot_date": "2026-04-10",
    "start_time": "09:00",
    "end_time": "09:30",
    "reason": "string"
  }
}
```

The patient JWT token the user brings in should be forwarded as-is as the `Authorization: Bearer` header — Afham's endpoint already validates role-based ownership (patient can see own appointments, doctor can see their own, admin can see any).

---

## Quick Reference

| Part                               | Who does it | What                                                                                                           | Status                                                 |
| ---------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| A — Backend status guard           | **You**     | Before creating a session, call `GET /api/v1/appointments/:appointmentId` and reject if status ≠ `confirmed`   | ✅ Agreed — you implement this                         |
| B — Duplicate session guard        | **You**     | If a session for that `appointment_id` already exists, return the existing one instead of creating a duplicate | Your internal decision — no input from Afham needed    |
| C — Doctor "Create Session" button | **Afham**   | Button on confirmed doctor appointment cards navigating to `/#/telemedicine?appointmentId=...`                 | Afham builds this — blocked on Part B being done first |
