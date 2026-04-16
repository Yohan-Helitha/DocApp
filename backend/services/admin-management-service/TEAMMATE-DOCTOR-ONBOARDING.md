# Doctor Onboarding — What Each Teammate Needs to Build

> **Context:** This document describes the agreed doctor onboarding flow and what each service
> needs to contribute. It covers two teammates: the **auth-service** owner and the **admin-service** owner.
>
> **For the auth-service teammate:** There is one open question addressed in your section below.
> Depending on your answer, you may have nothing to build at all.
>
> **For the admin-service teammate:** You have one page to build that makes two separate API calls
> on a single admin approval action. Both calls are fully documented below.

---

## Background — Why This Is More Complex Than a Single Approval

The doctor onboarding flow touches **two separate databases** managed by two separate services:

| Service                           | Database    | What it controls                                                                               |
| --------------------------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| auth-service (your service)       | `authdb`    | Doctor's **login access** — `account_status = 'active'` controls whether the doctor can log in |
| doctor-management-service (Afham) | `doctorsdb` | Doctor's **platform visibility** — `verification_status = 'approved'` controls everything else |

Because these are separate databases, there have to be **two separate admin approval actions** at different stages of the flow:

1. **Admin approves login** (auth-service) → Doctor can now log in for the first time and create their professional profile
2. **Admin approves professional profile** (doctor-management-service) → Doctor becomes visible to patients and can start working

These look similar from the admin's perspective, but they do different things. The full flow is:

```
Doctor registers (auth-service) → full_name, specialization, license doc stored in authdb
     ↓
[STEP 1] Admin approves login (auth-service) → account_status = 'active'
     ↓
Doctor logs in for the first time → sees profile creation form (pre-filled with name + specialization)
     ↓
Doctor fills in remaining details (fee, bio, license number) → professional profile created
     Profile is created with verification_status = 'pending' — doctor is not yet visible to patients
     ↓
[STEP 2] Admin reviews professional profile and approves (doctor-management-service) → verification_status = 'approved'
     ↓
Doctor is now fully operational:
     • Patients can find and book this doctor
     • Doctor can add availability slots
     • Doctor can accept/reject appointments
```

---

## Auth-Service Teammate

### The One Open Question

> **⚠️ This is the only thing that needs a decision from you.**

When a doctor logs in for the first time and creates their professional profile, the form should **pre-fill `full_name` and `specialization`** from the data the doctor already submitted during registration. This prevents the doctor from having to type the same information twice.

The pre-fill requires one new endpoint on the auth-service:

```
Extend:  GET /api/v1/auth/me
Change:  For users with role = 'doctor', include an additional 'registrationData' field in the response

Response (extended — only added for role = doctor):
{
  "user": {
    "id": "...",
    "email": "...",
    "role": "doctor",
    "account_status": "active"
  },
  "registrationData": {
    "full_name": "Dr. Jane Smith",
    "specialization": "Cardiology"
  }
}
```

The data for `registrationData` comes from `authdb.doctor_verification_requests.profile_data` for the logged-in user's `user_id`. `profile_data` is a JSON column that already stores `full_name` and `specialization` from registration — it's just never been read back until now.

**Afham has offered to implement this change himself** (modifying auth-service files directly to add this one endpoint extension) so that you have nothing to do on your end.

> **If you are okay with Afham modifying the auth-service files for this one change — you have nothing to build. Just let us know.**
>
> **If you prefer to do it yourself** — the exact spec is above. It is a small change: look up `doctor_verification_requests` by `user_id = req.user.id` where `req.user.role = 'doctor'`, parse `profile_data`, and append `registrationData` to the existing response. Everything else in `GET /api/v1/auth/me` stays the same.

---

## Admin-Service Teammate

### What You Need to Build: Doctor Verification Page

You need to build a **Doctor Verification page** in the admin panel. This is a hard blocker — without it, there is no way to approve doctors through the UI, which means the entire doctor workflow cannot be demonstrated.

This page handles **Step 1** of the onboarding flow (admin approves login). It must also trigger **Step 2** on the same approval action.

---

### Implementation Details (How This Repo Should Work)

#### Two-step verification = two separate systems

- **Auth-service (Step 1):** controls whether the doctor can log in.
  - Field: `users.account_status` in `authdb`
  - Typical states: `pending_verification` → `active` (approved) or `disabled` (rejected)

- **Doctor-management-service (Step 2):** controls whether the doctor profile is visible/usable on the platform.
  - Field: `doctors.verification_status` in `doctorsdb`
  - Allowed states: `pending` → `approved` or `rejected`

These two steps **must not be conflated**: a doctor can be approved to log in but still have an unapproved profile.

#### IDs are different (important)

- `userId` = auth-service user ID (`authdb.users.user_id`)
- `doctorId` = doctor-management-service doctor ID (`doctorsdb.doctors.doctor_id`)

They are **not the same** in this repo (doctor profiles also store `user_id`, but the primary identifier for the doctor service endpoints is `doctor_id`).

So for Step 2 you must either:

1) **Resolve `doctorId` from email/userId**, then call the doctor service approval endpoint, or
2) Use an internal doctor-service endpoint that can approve by `user_id` (if implemented).

---

### Admin-management-service API (Frontend-facing) — Current Repo Mapping

The existing frontend `DoctorVerification.jsx` is written to call admin-management-service endpoints:

- `GET /api/v1/admin/doctors/pending-verification` → list pending requests
- `PUT /api/v1/admin/doctors/:id/verify` → approve/reject (should trigger Step 1 + Step 2)
- `GET /api/v1/admin/dashboard/metrics` → counts for verified/rejected

Inside admin-management-service, the typical pattern is:

- Frontend calls **admin-management-service**
- admin-management-service calls **auth-service** and **doctor-management-service** using an `x-internal-api-key`

This keeps service-to-service calls off the browser and avoids exposing internal endpoints publicly.

> Important: if admin-management-service approves Step 2 by calling doctor-management-service, it must use the **doctor service’s `doctor_id`**, not the auth-service `user_id`. If only `user_id` is available from Step 1 data, you must resolve the doctor profile first (e.g., by email lookup) before calling the profile approval.

---

### Admin Authentication / “Session” Requirement (Frontend)

The doctor-management-service endpoint:

```
PUT /api/v1/doctors/:doctorId/verification-status
```

requires a JWT whose payload includes `role: "admin"`.

That means: **admin login must produce a JWT, and the frontend must persist it and send it on every admin request**.

Recommended minimal approach for this project:

- On admin login (`POST /api/v1/auth/login`), store `accessToken` in `sessionStorage` (already done in `Login.jsx`).
- Update the admin frontend API wrapper (currently `frontend/src/features/admin/adminApi.js`) to include:

```js
const token = sessionStorage.getItem('accessToken');
if (token) headers.Authorization = `Bearer ${token}`;
```

If you don’t send the token, the doctor-management-service will return:

- `401 missing_token` (no Authorization header), or
- `403 forbidden` (token present but role is not admin)

> Security note: in a production-grade system, prefer **HttpOnly cookies** for session tokens to reduce XSS exposure. For this repo/demo, `sessionStorage` is acceptable as the simplest approach.

---

### Option A (Chosen) — RS256 validation for profile approval route (Kubernetes)

Because this repo is deployed via **Kubernetes**, and auth-service can issue **RS256** JWTs, the doctor-management-service must be able to **verify RS256** for the admin-only profile approval endpoint.

Goal: verify admin JWTs using **RS256** *only for*:

```
PUT /api/v1/doctors/:doctorId/verification-status
```

…and keep the existing HS256/shared-secret middleware for other doctor routes.

#### Doctor-management-service code changes (exact files)

1) **Add a new RS256 middleware**

- Add file: `backend/services/doctor-management-service/src/middleware/authAdminRs256.js`
- Responsibilities:
  - Read `Authorization: Bearer <token>`
  - Verify token with the **auth-service public key** using `jsonwebtoken.verify()`
  - **Whitelist algorithms**: `{ algorithms: ["RS256"] }`
  - Attach `req.user = { id: payload.sub, email: payload.email, role: payload.role }`
  - Enforce `role === "admin"` (either here or keep enforcing in the controller)

2) **Use this middleware only on the profile approval route**

- Edit: `backend/services/doctor-management-service/src/routes/doctorRoutes.js`
- Change only this route to:

```js
import authAdminRs256 from "../middleware/authAdminRs256.js";

router.put(
  "/api/v1/doctors/:doctorId/verification-status",
  authAdminRs256,
  doctorController.setVerificationStatus,
);
```

3) **Add environment variable for the public key path**

- Edit: `backend/services/doctor-management-service/src/config/environment.js`
- Add something like:
  - `AUTH_PUBLIC_KEY_PATH` (path to the mounted `public.pem`)

> Keep the existing `JWT_SECRET` in place for the HS256 middleware used on other routes.

#### Kubernetes changes (doctor-management-service deployment)

Doctor-management-service must have access to the **auth-service public key** (`public.pem`). In this repo it exists at:

- `backend/services/auth-service/keys/public.pem`

In Kubernetes you should:

1) Create a **Secret** or **ConfigMap** containing `public.pem`
2) Mount it into the doctor-management-service container
3) Set an env var so the RS256 middleware can find it

Example (high-level):

- Mount file into the container, e.g.:
  - `/app/keys/auth-public.pem`
- Set:
  - `AUTH_PUBLIC_KEY_PATH=/app/keys/auth-public.pem`

Where to apply:

- Edit: `infra/k8s/doctor-management-service/doctor-deployment.yaml`
  - add `volumes:` + `volumeMounts:` for the key
  - add `env:` for `AUTH_PUBLIC_KEY_PATH`

Example snippet (illustrative):

```yaml
# ...existing code...
spec:
  template:
    spec:
      containers:
        - name: doctor-management-service
          # ...existing code...
          env:
            # ...existing env...
            - name: AUTH_PUBLIC_KEY_PATH
              value: "/app/keys/auth-public.pem"
          volumeMounts:
            # ...existing mounts...
            - name: auth-public-key
              mountPath: /app/keys
              readOnly: true
      volumes:
        - name: auth-public-key
          secret:
            secretName: auth-public-key
            items:
              - key: public.pem
                path: auth-public.pem
```

> You can use a ConfigMap instead of a Secret, but a Secret is recommended for key material.

#### Important constraints / gotchas

- The JWT used for this endpoint must include `role: "admin"` in its payload, otherwise the controller will return **403**.
- Always verify RS256 tokens with:
  - `jwt.verify(token, publicKey, { algorithms: ["RS256"] })`
  - Do **not** accept unbounded algorithms.

---

### Frontend: Two-step Verification UI (Single Page)

You can keep **one** `DoctorVerification` page and still support both steps.

**Option A — Show two statuses + two buttons (most explicit)**

- Badges/columns:
  - `Login: Pending/Approved/Rejected` (from auth-service `account_status`)
  - `Profile: Pending/Approved/Rejected` (from doctor-service `verification_status`)
- Actions:
  - `Approve Login` → Step 1 only
  - `Approve Profile` → Step 2 only

**Option B — “Approve All” button (simpler UX)**

- One action:
  - `Approve All` triggers Step 1 then Step 2
- Still show both statuses so partial approvals are visible (e.g., Step 1 succeeded but Step 2 failed because profile is missing).

Either option is valid. The key is that the UI must display both statuses to avoid confusion.

---

### Part A — List Pending Doctor Verification Requests

The page should show a list of all doctors who have registered but not yet been approved.

```
GET /api/v1/auth/admin/doctors/pending
Auth: admin JWT
```

> **Note:** Confirm the exact endpoint path with the auth-service teammate — it may be
> `GET /api/v1/auth/admin/doctors?status=pending` or similar. The auth-service teammate will know.

Each entry in the response includes:

| Field            | Description                                                  |
| ---------------- | ------------------------------------------------------------ |
| `user_id`        | The auth-service UUID — use this for the approval call below |
| `full_name`      | Doctor's submitted name                                      |
| `email`          | Doctor's email                                               |
| `specialization` | Submitted specialization                                     |
| `license_data`   | Uploaded license document (link or base64)                   |

---

### Part B — Approve a Doctor (Two Calls Required)

When the admin clicks "Approve" for a doctor, **you must make two separate API calls in sequence**. Both are needed — skipping either one will leave the workflow broken.

---

**Call 1 — Enable login (auth-service)**

```
PUT /api/v1/auth/admin/doctors/:userId/verify
Auth: admin JWT
Body: { "status": "approved" }

':userId' is authdb.users.user_id — from the list returned in Part A
```

This sets `account_status = 'active'` in the auth-service database. The doctor can now log in. Without this call, the doctor cannot log in at all.

---

**Call 2 — Approve professional profile (doctor-management-service / Afham)**

```
PUT /api/v1/doctors/:doctorId/verification-status
Auth: admin JWT
Body: { "status": "approved" }

':doctorId' is the doctor's ID in the doctor-management-service database — NOT the same as ':userId' above
```

This sets `verification_status = 'approved'` in the doctor-management-service database. Without this call, the doctor's profile remains in `pending` state — patients cannot find or book this doctor, and the doctor cannot add availability slots.

> **How to get `doctorId`:** The doctor will have created their professional profile before you see them in this pending queue for Step 2 (see the full flow above — profile creation happens after Step 1). You can look up the `doctorId` by calling:
>
> ```
> GET /api/v1/doctors?email=<doctor_email>
> ```
>
> Use the doctor's email from Part A to filter the list and retrieve the corresponding `doctorId` from the doctor-management-service.

---

### Why Both Calls Are Necessary

It is important not to combine or skip either call:

| Call                               | What happens if you skip it                                                                                                                                                       |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Call 1 (auth-service)              | Doctor cannot log in — the entire onboarding is blocked                                                                                                                           |
| Call 2 (doctor-management-service) | Doctor logs in and creates a profile, but patients can never find them, booking is blocked, and the doctor cannot add slots — platform is silently non-functional for this doctor |

Both must succeed for a doctor to be fully operational.

---

### Rejection (Optional but Recommended)

The same page should also support a "Reject" action:

```
Call 1 — auth-service:
PUT /api/v1/auth/admin/doctors/:userId/verify
Body: { "status": "rejected", "reason": "optional rejection note" }

Call 2 — doctor-management-service (if profile exists):
PUT /api/v1/doctors/:doctorId/verification-status
Body: { "status": "rejected" }
```

---

### What Is Blocked Until Verification Is Approved

For reference, here is what is automatically blocked for any doctor in `pending` or `rejected` state. You do not need to implement these guards — they are on Afham's service. This is just for your understanding of why the verification step matters:

| Action attempted                                 | Blocked?                                                             |
| ------------------------------------------------ | -------------------------------------------------------------------- |
| Patient searches for / views this doctor         | ✅ Blocked — doctor is hidden from public listings                   |
| Patient books an appointment with this doctor    | ✅ Blocked — backend rejects booking                                 |
| Doctor tries to add availability slots           | ✅ Blocked — backend rejects slot creation                           |
| Admin views this doctor in the admin panel       | ✅ Allowed — admin can see all doctors regardless of status          |
| Doctor logs in and views/edits their own profile | ✅ Allowed — doctor can update their professional info while pending |

---

## Quick Reference — All Endpoints Involved

| Call                                           | Endpoint                                            | Who owns it           | When called                                      |
| ---------------------------------------------- | --------------------------------------------------- | --------------------- | ------------------------------------------------ |
| List pending requests                          | `GET /api/v1/auth/admin/doctors/pending`            | Auth-service teammate | On page load                                     |
| Enable login                                   | `PUT /api/v1/auth/admin/doctors/:userId/verify`     | Auth-service teammate | Admin clicks "Approve" — Call 1                  |
| Approve professional profile                   | `PUT /api/v1/doctors/:doctorId/verification-status` | Afham                 | Admin clicks "Approve" — Call 2                  |
| Look up doctorId by email                      | `GET /api/v1/doctors?email=<email>`                 | Afham                 | Before Call 2 (to resolve doctorId)              |
| Pre-fill endpoint (if auth teammate builds it) | `GET /api/v1/auth/me` (extended)                    | Auth-service teammate | Called by Afham's frontend on doctor first login |
