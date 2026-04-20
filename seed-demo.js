/**
 * seed-demo.js — Full demo data seeder for DocApp
 *
 * Populates ALL tables needed to demonstrate every flow in SERVICE_DEMO_FLOWS.md:
 *   authdb:        users (5: admin, patient, 3 doctors), doctor_verification_requests, refresh_tokens
 *   doctorsdb:     doctors (1 profile), doctor_availability_slots (13 slots), prescriptions (3)
 *   appointmentsdb: appointments (10, covering ALL 5 status states + dedicated slots per interactive flow)
 *
 * Accounts seeded:
 *   admin@docapp.lk              — admin
 *   kavindi.silva@gmail.com       — patient (owns all seeded appointments)
 *   niroshan.perera@docapp.lk    — verified, has profile → use for all doctor flows
 *   aisha.fonseka@docapp.lk      — verified, NO profile in doctorsdb → log in to demo F-22 inline Create Profile
 *   chamara.bandara@docapp.lk    — registered, NOT verified → appears in admin pending list → demo PREREQ-4
 *
 * Requirements:
 *   - Node 18+ (uses native fetch + FormData)
 *   - All Tier 1 containers must be running: docker compose up (from infra/docker/)
 *   - Run from any directory: node seed-demo.js
 *
 * Behaviour:
 *   Phase 0 wipes all demo data (docker exec psql) before re-seeding, so running
 *   this script multiple times always produces a clean, consistent state.
 *
 * Usage:
 *   node seed-demo.js                                          # use current time (test immediately)
 *   DEMO_DATETIME="2026-04-25T14:00:00" node seed-demo.js      # target viva at 2 PM on April 25
 *   API_BASE=http://localhost:4000 node seed-demo.js
 *
 * DEMO_DATETIME controls three time-sensitive slots:
 *   slot13/appt10 (live)   : DEMO_DT-15min → DEMO_DT+45min   — Join/Create Session clickable NOW
 *   slot12/appt9  (ended)  : DEMO_DT-120min → DEMO_DT-60min  — Mark as Complete works from UI NOW
 *   slot10/appt7  (accept) : DEMO_DT+4h     → DEMO_DT+4h30m  — doctor can accept (>2h guard)
 *
 * Note: DEMO_DATETIME must be at least 2h after midnight local time (e.g. 09:00 is fine).
 */

const { execSync } = require("child_process");

const API_BASE = process.env.API_BASE || "http://localhost:4000";

// ─── Demo Target Time ──────────────────────────────────────────────────────────
// Set DEMO_DATETIME to your live demo/viva date+time so time-sensitive slots
// (Join Session, Mark as Complete) work at the right moment.
//
// Examples:
//   node seed-demo.js                                  → use NOW  (test immediately after seeding)
//   DEMO_DATETIME="2026-04-25T14:00:00" node seed-demo.js  → viva at 2 PM on April 25
//
// Slots seeded relative to DEMO_DT:
//   "live"   slot (slot13/appt10) : DEMO_DT-15min → DEMO_DT+45min   ← Join/Create Session enabled NOW
//   "ended"  slot (slot12/appt9)  : DEMO_DT-120min → DEMO_DT-60min  ← Mark as Complete works from UI NOW
//   "accept" slot (slot10/appt7)  : DEMO_DT+4h     → DEMO_DT+4h30min ← doctor can accept (>2h guard)
const DEMO_DATETIME_STR = process.env.DEMO_DATETIME;
const DEMO_DT = (() => {
  if (!DEMO_DATETIME_STR || DEMO_DATETIME_STR === "now") return new Date();
  const d = new Date(DEMO_DATETIME_STR);
  if (isNaN(d.getTime())) {
    console.error(
      `\n[FATAL] Invalid DEMO_DATETIME: "${DEMO_DATETIME_STR}"\n  Use ISO format, e.g. "2026-04-25T14:00:00"\n`,
    );
    process.exit(1);
  }
  return d;
})();

// ─── Accounts ─────────────────────────────────────────────────────────────────
const ADMIN_EMAIL = "admin@docapp.lk";
const DOCTOR_EMAIL = "niroshan.perera@docapp.lk";
const DOCTOR2_EMAIL = "aisha.fonseka@docapp.lk"; // verified, NO profile → demo F-22 inline Create Profile
const DOCTOR3_EMAIL = "chamara.bandara@docapp.lk"; // NOT verified → shows in admin pending list → demo PREREQ-4
const PATIENT_EMAIL = "kavindi.silva@gmail.com";
const PASSWORD = "Password123";

// ─── Utilities ────────────────────────────────────────────────────────────────

const log = (label, msg) =>
  console.log(`[${new Date().toISOString()}] [${label}] ${msg}`);

const jsonFetch = async (path, { method = "GET", token, body } = {}) => {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
};

/** Multipart POST. fields = { key: string | { data: Buffer, filename, type } } */
const multipartFetch = async (path, { token, fields } = {}) => {
  const form = new FormData();
  for (const [key, val] of Object.entries(fields)) {
    if (val instanceof Buffer || (val && val.data instanceof Uint8Array)) {
      const blob = new Blob([val.data], { type: val.type });
      form.append(key, blob, val.filename);
    } else {
      form.append(key, val);
    }
  }
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(API_BASE + path, {
    method: "POST",
    headers,
    body: form,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
};

const must = (cond, msg) => {
  if (!cond) {
    console.error(`\n[FATAL] ${msg}\n`);
    process.exit(1);
  }
};

const pad2 = (n) => String(n).padStart(2, "0");

/** Returns a date string YYYY-MM-DD for today+offsetDays */
const dateOffset = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

/** Returns a new Date shifted by offsetMinutes from dt */
const addMinutes = (dt, offsetMinutes) =>
  new Date(dt.getTime() + offsetMinutes * 60000);

/** Returns YYYY-MM-DD from a Date */
const toSlotDate = (dt) =>
  `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;

/** Returns HH:MM from a Date, rounded to nearest 15-minute boundary */
const toSlotTime = (dt) => {
  const totalMins = dt.getHours() * 60 + dt.getMinutes();
  const rounded = Math.round(totalMins / 15) * 15;
  const h = Math.floor(rounded / 60) % 24;
  const m = rounded % 60;
  return `${pad2(h)}:${pad2(m)}`;
};

/** Returns YYYY-MM-DD string for DEMO_DT + N calendar days */
const futureSlotDate = (days) => {
  const d = new Date(DEMO_DT);
  d.setDate(d.getDate() + days);
  return toSlotDate(d);
};

/**
 * Minimal valid PNG: 1x1 transparent pixel (67 bytes).
 * Used as a fake license document — enough to satisfy the file presence check.
 */
const FAKE_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4" +
    "890000000a49444154789c6260000000000200e221bc330000000049454e44ae" +
    "426082",
  "hex",
);

// ─── Phase 0: Database Cleanup ─────────────────────────────────────────────────

// Maps legacy Docker Compose container names → K8s pod label selectors.
// runSQL resolves the live pod name at call time so it works even after pod restarts.
const DOCKER_TO_K8S = {
  "docker-appointments-postgres-1": "app=appointments-postgres",
  "docker-doctors-postgres-1": "app=doctors-postgres",
  "docker-postgres-1": "app=auth-postgres",
  "docker-patient-postgres-1": "app=patient-postgres",
};

/**
 * Run a SQL statement inside a running postgres pod/container.
 * Auto-detects whether to use kubectl (K8s) or docker exec (Docker Compose):
 *   - If the container name maps to a K8s label AND a live pod is found → kubectl exec
 *   - Otherwise → docker exec (original Docker Compose behaviour)
 * No env vars required; works transparently for both environments.
 */
const runSQL = (container, db, sql) => {
  try {
    const label = DOCKER_TO_K8S[container];
    let podName = null;

    if (label) {
      // Try to resolve a live K8s pod — empty result means we're in Docker mode
      try {
        const out = execSync(
          `kubectl get pods -l ${label} -o name --field-selector=status.phase=Running`,
          {
            stdio: "pipe",
          },
        )
          .toString()
          .trim();
        const first = out.split(/\r?\n/)[0];
        if (first) podName = first.replace(/^pod\//, "").trim();
      } catch {
        // kubectl not available or no cluster — fall through to docker exec
      }
    }

    if (podName) {
      // K8s mode
      execSync(
        `kubectl exec ${podName} -- psql -U postgres -d ${db} -c "${sql}"`,
        { stdio: "pipe" },
      );
    } else {
      // Docker Compose mode
      execSync(
        `docker exec ${container} psql -U postgres -d ${db} -c "${sql}"`,
        { stdio: "pipe" },
      );
    }
  } catch (e) {
    console.warn(
      `[cleanup] exec failed for ${container}: ${e.stderr?.toString().trim() || e.message}`,
    );
  }
};

const cleanup = () => {
  console.log("─── Phase 0: Cleanup (wiping previous demo data) ────\n");

  // appointmentsdb — appointment_events cascade via FK ON DELETE CASCADE
  runSQL(
    "docker-appointments-postgres-1",
    "appointmentsdb",
    "DELETE FROM appointments;",
  );
  log("cleanup", "appointmentsdb: appointments + appointment_events cleared");

  // doctorsdb — prescriptions, slots, documents all cascade via FK ON DELETE CASCADE on doctors
  runSQL("docker-doctors-postgres-1", "doctorsdb", "DELETE FROM doctors;");
  log("cleanup", "doctorsdb: doctors + slots + prescriptions cleared");

  // authdb — refresh_tokens, password_resets, doctor_verification_requests cascade via FK
  runSQL(
    "docker-postgres-1",
    "authdb",
    `DELETE FROM users WHERE email IN ('${ADMIN_EMAIL}','${PATIENT_EMAIL}','${DOCTOR_EMAIL}','${DOCTOR2_EMAIL}','${DOCTOR3_EMAIL}');`,
  );
  log(
    "cleanup",
    "authdb: demo users + tokens + verification requests cleared (5 accounts)",
  );

  // patientdb — truncate all patient data (profiles + all cascaded records)
  // TRUNCATE is more reliable than DELETE WHERE email=... because each seed run
  // registers kavindi with a fresh auth user_id; the old patientdb row would fail
  // the unique-email + different-user_id check on re-seed.
  runSQL(
    "docker-patient-postgres-1",
    "patientdb",
    "TRUNCATE patients CASCADE;",
  );
  log("cleanup", "patientdb: demo patient profile cleared");

  console.log("");
};

// ─── Phase 1: User Registration ───────────────────────────────────────────────

const registerUser = async (path, bodyOrFields, isMultipart = false) => {
  let res;
  if (isMultipart) {
    res = await multipartFetch(path, { fields: bodyOrFields });
  } else {
    res = await jsonFetch(path, { method: "POST", body: bodyOrFields });
  }
  if (res.status === 409) {
    log("register", `skip (already exists): ${bodyOrFields.email}`);
    return false; // already exists
  }
  if (res.status === 201 || res.status === 200) {
    log("register", `created: ${bodyOrFields.email}`);
    return true;
  }
  must(
    false,
    `register failed for ${bodyOrFields.email}: HTTP ${res.status} — ${JSON.stringify(res.body)}`,
  );
};

const login = async (email, password) => {
  const res = await jsonFetch("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
  must(
    res.status === 200 && res.body?.accessToken,
    `login failed for ${email}: HTTP ${res.status} — ${JSON.stringify(res.body)}`,
  );
  log("login", `ok: ${email}`);
  return res.body.accessToken;
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const main = async () => {
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  DocApp Demo Seed Script");
  console.log(`  API Base: ${API_BASE}`);
  console.log("═══════════════════════════════════════════════════════\n");

  const summary = { apiBase: API_BASE, created: {} };

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE 0 — Wipe previous demo data so re-runs are always clean
  // ──────────────────────────────────────────────────────────────────────────
  cleanup();

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE 1 — User Accounts (authdb.users + doctor_verification_requests)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("─── Phase 1: Register users ──────────────────────────\n");

  // 1a. Admin registration
  await registerUser("/api/v1/auth/register/admin", {
    email: ADMIN_EMAIL,
    password: PASSWORD,
  });

  // 1b. Patient registration
  await registerUser("/api/v1/auth/register/patient", {
    email: PATIENT_EMAIL,
    password: PASSWORD,
    full_name: "Kavindi Silva",
  });

  // 1c. Doctor1 registration (requires multipart/form-data with license file)
  // full_name and specialization are stored in doctor_verification_requests.profile_data
  // and surfaced by GET /api/v1/auth/me registrationData — used by SuccessDoctor.jsx pre-fill (F-22)
  await registerUser(
    "/api/v1/auth/register/doctor",
    {
      email: DOCTOR_EMAIL,
      password: PASSWORD,
      full_name: "Niroshan Perera",
      specialization: "General Medicine",
      license: {
        data: FAKE_PNG,
        filename: "license.png",
        type: "image/png",
      },
    },
    true, // isMultipart
  );

  // 1d. Doctor2 registration — will be verified but NOT given a profile in doctorsdb
  //     full_name and specialization included so pre-fill demo (F-22) has real values to show
  await registerUser(
    "/api/v1/auth/register/doctor",
    {
      email: DOCTOR2_EMAIL,
      password: PASSWORD,
      full_name: "Aisha Fonseka",
      specialization: "Cardiology",
      license: {
        data: FAKE_PNG,
        filename: "license2.png",
        type: "image/png",
      },
    },
    true,
  );

  // 1e. Doctor3 registration — intentionally NOT verified
  //     Shows up in admin pending list to demo PREREQ-4 (Admin Verify Doctor flow)
  await registerUser(
    "/api/v1/auth/register/doctor",
    {
      email: DOCTOR3_EMAIL,
      password: PASSWORD,
      full_name: "Chamara Bandara",
      specialization: "Dermatology",
      license: {
        data: FAKE_PNG,
        filename: "license3.png",
        type: "image/png",
      },
    },
    true,
  );

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE 2 — Step 1 of 2-step doctor verification:
  //           Admin approves doctor LOGIN (authdb.users.account_status → 'active')
  //
  //           NOTE: This only enables the doctor to log in. Platform access
  //           (patient visibility, slot creation, and booking) is controlled by
  //           the doctorsdb verification badge, which is set separately in Phase 5
  //           AFTER the doctor creates their profile (Phase 4).
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n─── Phase 2: Step 1 of 2 — Admin approves doctor login ───\n");

  const adminToken = await login(ADMIN_EMAIL, PASSWORD);

  // List doctors pending verification using admin token
  const pendingRes = await jsonFetch(
    "/api/v1/auth/admin/doctors/pending-verification",
    {
      token: adminToken,
    },
  );
  must(
    pendingRes.status === 200,
    `list pending verifications failed: HTTP ${pendingRes.status} — ${JSON.stringify(pendingRes.body)}`,
  );

  const pendingList = pendingRes.body?.doctors || [];

  // Helper: approve a doctor by email from the pending list
  const approveDoctor = async (email) => {
    const pending = pendingList.find((d) => d.email === email);
    if (!pending) {
      log(
        "verify-doctor",
        `${email} not in pending list — may already be verified, continuing...`,
      );
      return false;
    }
    log(
      "verify-doctor",
      `found pending ${email} user_id=${pending.user_id}, approving...`,
    );
    const verifyRes = await jsonFetch(
      `/api/v1/auth/admin/doctors/${pending.user_id}/verify`,
      {
        method: "PUT",
        token: adminToken,
        body: { status: "approved", reason: "Demo seed — auto-approved" },
      },
    );
    must(
      verifyRes.status === 200,
      `doctor verification failed for ${email}: HTTP ${verifyRes.status} — ${JSON.stringify(verifyRes.body)}`,
    );
    log("verify-doctor", `${email} approved — account_status set to 'active'`);
    return true;
  };

  // Approve doctor1 (full demo account) and doctor2 (no-profile F-22 demo)
  summary.created.doctorVerified = await approveDoctor(DOCTOR_EMAIL);
  await approveDoctor(DOCTOR2_EMAIL);
  // doctor2 only gets Step 1 (login gate). No Step 2 badge (Phase 5) is needed for doctor2,
  // because doctor2 intentionally never gets a doctorsdb profile — the badge endpoint requires
  // a doctorId (doctorsdb UUID) which only exists after profile creation. doctor2 is used to
  // demo F-22 (inline Create Profile form with pre-filled name + specialization).
  // doctor3 is intentionally NOT approved — stays in pending list for PREREQ-4 demo
  log(
    "verify-doctor",
    `${DOCTOR3_EMAIL} intentionally left unverified — visible in admin pending list for PREREQ-4 demo`,
  );

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE 3 — Login as doctor and patient (now works because account is active)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n─── Phase 3: Login as doctor and patient ─────────────\n");

  const doctorToken = await login(DOCTOR_EMAIL, PASSWORD);
  const patientToken = await login(PATIENT_EMAIL, PASSWORD);

  // Extract patient user_id from JWT sub claim — needed for patient profile and prescriptions
  const patientUserId = JSON.parse(
    Buffer.from(patientToken.split(".")[1], "base64url").toString("utf8"),
  ).sub;
  log("patient-id", `extracted from JWT: ${patientUserId}`);
  summary.patientUserId = patientUserId;

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE 3b — Patient profile (patientdb.patients)
  //            Must exist before medical reports can be fetched for this patient.
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n─── Phase 3b: Patient profile in patientdb ───────────\n");

  const existingPatientRes = await jsonFetch(
    `/api/v1/patients/${patientUserId}`,
    {
      token: patientToken,
    },
  );

  if (existingPatientRes.status === 200) {
    log(
      "patient-profile",
      `already exists for user_id=${patientUserId} — skipping create`,
    );
  } else {
    const createPatientRes = await jsonFetch("/api/v1/patients/", {
      method: "POST",
      token: patientToken,
      body: {
        user_id: patientUserId,
        first_name: "Kavindi",
        last_name: "Silva",
        email: PATIENT_EMAIL,
        phone: "+94771234567",
        dob: "1995-06-15",
        gender: "Female",
        address: "42 Galle Road, Colombo 03, Sri Lanka",
        blood_group: "O+",
        allergies: "None",
        emergency_contact_name: "Rohan Silva",
        emergency_contact_phone: "+94779876543",
      },
    });
    must(
      createPatientRes.status === 201,
      `create patient profile failed: HTTP ${createPatientRes.status} — ${JSON.stringify(createPatientRes.body)}`,
    );
    log("patient-profile", `created for user_id=${patientUserId}`);
    summary.created.patientProfile = true;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE 4 — Doctor profile (doctorsdb.doctors)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n─── Phase 4: Doctor profile in doctorsdb ─────────────\n");

  // Check if doctor profile already exists
  const listRes = await jsonFetch("/api/v1/doctors", { token: doctorToken });
  must(listRes.status === 200, `list doctors failed: HTTP ${listRes.status}`);

  let doctor = (listRes.body?.doctors || []).find(
    (d) => d.email === DOCTOR_EMAIL,
  );

  if (!doctor) {
    log("doctor-profile", "no profile found, creating...");
    const createRes = await jsonFetch("/api/v1/doctors", {
      method: "POST",
      token: doctorToken,
      body: {
        full_name: "Niroshan Perera",
        specialization: "General Medicine",
        license_number: "SLMC-2019-04721",
        experience_years: 9,
        consultation_fee: 3000.0,
        bio: "Dr. Niroshan Perera is a General Medicine specialist with over 9 years of clinical experience. He completed his MBBS at the University of Colombo and holds a postgraduate diploma in Internal Medicine. He consults at both the National Hospital and his private practice in Colombo 03.",
      },
    });
    must(
      createRes.status === 201 && createRes.body?.doctor?.doctor_id,
      `create doctor profile failed: HTTP ${createRes.status} — ${JSON.stringify(createRes.body)}`,
    );
    doctor = createRes.body.doctor;
    log("doctor-profile", `created: doctor_id=${doctor.doctor_id}`);
    summary.created.doctorProfile = true;
  } else {
    log("doctor-profile", `exists: doctor_id=${doctor.doctor_id}`);
    summary.created.doctorProfile = false;
  }

  const doctorId = doctor.doctor_id;
  summary.doctorId = doctorId;

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE 5 — Step 2 of 2-step doctor verification:
  //           Admin approves PLATFORM ACCESS (doctorsdb.doctors.verification_status → 'approved')
  //
  //           This is separate from Phase 2 (login gate) and comes AFTER Phase 4 (profile creation).
  //           The doctorId used by this endpoint is the UUID in doctorsdb.doctors, which only
  //           exists after the doctor creates their profile in Phase 4. Without this step:
  //             - Doctor is invisible to patients (F-01 / F-02)
  //             - Patients cannot book the doctor (F-03)
  //             - Doctor cannot add availability slots (F-08)
  //           F-16 in FLOW_ORDER.md
  // ──────────────────────────────────────────────────────────────────────────
  console.log(
    "\n─── Phase 5: Step 2 of 2 — Admin approves doctor platform access ────\n",
  );

  const badgeRes = await jsonFetch(
    `/api/v1/doctors/${doctorId}/verification-status`,
    {
      method: "PUT",
      token: adminToken,
      body: { status: "approved" },
    },
  );
  must(
    badgeRes.status === 200,
    `set verification badge failed: HTTP ${badgeRes.status} — ${JSON.stringify(badgeRes.body)}`,
  );
  log("verification-badge", `set to 'approved' for doctor_id=${doctorId}`);
  summary.created.verificationBadge = true;

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE 6 — Availability slots (doctorsdb.doctor_availability_slots)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n─── Phase 6: Availability slots ──────────────────────\n");

  // ─── DEMO_DT-relative slot windows ──────────────────────────────────────────
  // "live" slot  : currently in-progress at DEMO_DT → Join/Create Session enabled
  const liveStart = addMinutes(DEMO_DT, -15);
  const liveEnd = addMinutes(DEMO_DT, 45);
  // "ended" slot : already ended at DEMO_DT → Mark as Complete works from doctor UI
  const endedStart = addMinutes(DEMO_DT, -120);
  const endedEnd = addMinutes(DEMO_DT, -60);
  // "accept" slot: far enough ahead so doctor-accept guard passes (slot_start > now+2h)
  //               payment_deadline after accept = MIN(now+24h, slot_start−2h) = DEMO_DT+2h (2h pay window)
  const acceptStart = addMinutes(DEMO_DT, 4 * 60);
  const acceptEnd = addMinutes(DEMO_DT, 4 * 60 + 30);

  console.log(`\n  DEMO_DT    : ${DEMO_DT.toLocaleString()}`);
  console.log(
    `  Live slot  : ${toSlotDate(liveStart)} ${toSlotTime(liveStart)} \u2013 ${toSlotTime(liveEnd)}  (Join/Create Session)`,
  );
  console.log(
    `  Ended slot : ${toSlotDate(endedStart)} ${toSlotTime(endedStart)} \u2013 ${toSlotTime(endedEnd)}  (Mark Complete from UI)`,
  );
  console.log(
    `  Accept slot: ${toSlotDate(acceptStart)} ${toSlotTime(acceptStart)} \u2013 ${toSlotTime(acceptEnd)}  (F-12 accept + F-Pay)\n`,
  );

  const slotsToCreate = [
    // Slot 1 → appt1: completed history (admin force-set; slot date irrelevant for that path)
    {
      slot_date: futureSlotDate(1),
      start_time: "09:00",
      end_time: "09:30",
      label: "slot1 (appt1 — history/completed)",
    },
    // Slot 2 → appt2: rejected history
    {
      slot_date: futureSlotDate(1),
      start_time: "10:00",
      end_time: "10:30",
      label: "slot2 (appt2 — rejected)",
    },
    // Slot 3 → appt3: pending, F-06 reschedule demo
    {
      slot_date: futureSlotDate(1),
      start_time: "11:00",
      end_time: "11:30",
      label: "slot3 (appt3 — pending, reschedule demo)",
    },
    // Slots 4, 5, 6 → available (booking demo + reschedule targets)
    {
      slot_date: futureSlotDate(2),
      start_time: "09:00",
      end_time: "09:30",
      label: "slot4 (available)",
    },
    {
      slot_date: futureSlotDate(2),
      start_time: "14:00",
      end_time: "14:30",
      label: "slot5 (available)",
    },
    {
      slot_date: futureSlotDate(3),
      start_time: "10:00",
      end_time: "10:30",
      label: "slot6 (available)",
    },
    // Slot 7 → appt4: confirmed+paid, F-14 Write Prescription demo
    {
      slot_date: futureSlotDate(2),
      start_time: "10:00",
      end_time: "10:30",
      label: "slot7 (appt4 — confirmed+paid, Rx demo)",
    },
    // Slot 8 → appt5: pre-cancelled history
    {
      slot_date: futureSlotDate(3),
      start_time: "09:00",
      end_time: "09:30",
      label: "slot8 (appt5 — cancelled)",
    },
    // Slot 9 → appt6: pending, patient cancels in UI (F-05 demo)
    {
      slot_date: futureSlotDate(3),
      start_time: "11:00",
      end_time: "11:30",
      label: "slot9 (appt6 — pending, cancel demo)",
    },
    // Slot 10 → appt7: pending, doctor accepts in UI → patient pays (F-12 + F-Pay)
    // DEMO_DT-relative: slot_start = DEMO_DT+4h → accept guard satisfied (>now+2h)
    {
      slot_date: toSlotDate(acceptStart),
      start_time: toSlotTime(acceptStart),
      end_time: toSlotTime(acceptEnd),
      label: "slot10 (appt7 — pending, accept+pay demo)",
    },
    // Slot 11 → appt8: pending, doctor rejects in UI (F-13 demo)
    {
      slot_date: futureSlotDate(4),
      start_time: "09:00",
      end_time: "09:30",
      label: "slot11 (appt8 — pending, reject demo)",
    },
    // Slot 12 → appt9: ENDED slot — Mark as Complete works from doctor UI without admin force-set.
    // NOTE: doctor-accept API blocks for past slots (too_close_to_slot_time guard).
    //       appointment_status is set to 'confirmed' + payment_status 'paid' via SQL in Phase 8b.
    {
      slot_date: toSlotDate(endedStart),
      start_time: toSlotTime(endedStart),
      end_time: toSlotTime(endedEnd),
      label:
        "slot12 (appt9 — ENDED slot, confirmed+paid via SQL \u2192 F-17 Mark Complete from UI)",
    },
    // Slot 13 → appt10: LIVE slot — Join Session (patient) and Create Session (doctor) enabled right now.
    // NOTE: doctor-accept API blocks for past slots; appointment_status set via SQL in Phase 8b.
    {
      slot_date: toSlotDate(liveStart),
      start_time: toSlotTime(liveStart),
      end_time: toSlotTime(liveEnd),
      label:
        "slot13 (appt10 — LIVE slot, confirmed+paid via SQL \u2192 Join/Create Session)",
    },
  ];

  const createdSlots = [];
  for (const s of slotsToCreate) {
    const slotRes = await jsonFetch(
      `/api/v1/doctors/${doctorId}/availability-slots`,
      {
        method: "POST",
        token: doctorToken,
        body: {
          slot_date: s.slot_date,
          start_time: s.start_time,
          end_time: s.end_time,
        },
      },
    );
    if (slotRes.status === 409) {
      // Duplicate slot on same date/time — find it from list instead
      log("slot", `skip duplicate: ${s.label}`);
      createdSlots.push(null); // placeholder; we'll re-fetch below
    } else {
      must(
        slotRes.status === 201 && slotRes.body?.slot?.slot_id,
        `create slot failed (${s.label}): HTTP ${slotRes.status} — ${JSON.stringify(slotRes.body)}`,
      );
      log("slot", `created slot_id=${slotRes.body.slot.slot_id}: ${s.label}`);
      createdSlots.push(slotRes.body.slot);
    }
  }

  // If any slots were duplicates (nulls), fall back to listing and matching by time
  if (createdSlots.includes(null)) {
    log("slot", "fetching existing slots to resolve duplicates...");
    const listSlotsRes = await jsonFetch(
      `/api/v1/doctors/${doctorId}/availability-slots`,
      {
        token: doctorToken,
      },
    );
    must(
      listSlotsRes.status === 200,
      `list slots failed: HTTP ${listSlotsRes.status}`,
    );
    const allSlots = listSlotsRes.body?.slots || [];

    for (let i = 0; i < slotsToCreate.length; i++) {
      if (createdSlots[i] === null) {
        const s = slotsToCreate[i];
        const found = allSlots.find(
          (x) =>
            x.slot_date?.startsWith(s.slot_date) &&
            x.start_time?.startsWith(s.start_time),
        );
        if (found) {
          log(
            "slot",
            `resolved duplicate: slot_id=${found.slot_id} for ${s.label}`,
          );
          createdSlots[i] = found;
        } else {
          must(false, `cannot find slot for ${s.label} even after listing`);
        }
      }
    }
  }

  const [
    slot1,
    slot2,
    slot3,
    ,
    ,
    ,
    slot7,
    slot8,
    slot9,
    slot10,
    slot11,
    slot12,
    slot13,
  ] = createdSlots;
  summary.slots = createdSlots.map((s) => ({
    slot_id: s.slot_id,
    date: s.slot_date,
    time: s.start_time,
  }));

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE 7 — Appointments (appointmentsdb.appointments + appointment_events)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n─── Phase 7: Book appointments ───────────────────────\n");

  // patientUserId was extracted in Phase 3b and is already available here.

  const bookAppointment = async (slotObj, reason) => {
    const res = await jsonFetch("/api/v1/appointments", {
      method: "POST",
      token: patientToken,
      body: {
        doctor_id: doctorId,
        slot_id: slotObj.slot_id,
        reason_for_visit: reason,
      },
    });
    must(
      res.status === 201 && res.body?.appointment?.appointment_id,
      `book appointment failed (${reason}): HTTP ${res.status} — ${JSON.stringify(res.body)}`,
    );
    log(
      "appointment",
      `booked appointment_id=${res.body.appointment.appointment_id}: ${reason}`,
    );
    return res.body.appointment;
  };

  const appt1 = await bookAppointment(
    slot1,
    "Routine checkup (will be accepted + paid + completed — history)",
  );
  const appt2 = await bookAppointment(
    slot2,
    "Follow-up consultation (will be rejected)",
  );
  const appt3 = await bookAppointment(
    slot3,
    "General consultation (stays pending — F-06 reschedule demo)",
  );
  const appt4 = await bookAppointment(
    slot7,
    "Specialist consultation (confirmed+paid — F-14 Write Prescription demo)",
  );
  const appt5 = await bookAppointment(
    slot8,
    "Second opinion (pre-cancelled — demonstrates cancelled tab)",
  );
  // These three stay PENDING after seed — used for live interactive demos
  const appt6 = await bookAppointment(
    slot9,
    "Third opinion (pending — patient cancels this in UI = live F-05 demo)",
  );
  const appt7 = await bookAppointment(
    slot10,
    "Emergency consultation (pending — doctor accepts in UI = F-12; patient pays = F-Pay demo)",
  );
  const appt8 = await bookAppointment(
    slot11,
    "Pre-op assessment (pending — doctor rejects this in UI = live F-13 demo)",
  );
  // This one gets accepted by seed and payment forced paid — stays confirmed+paid — doctor marks complete from UI
  const appt9 = await bookAppointment(
    slot12,
    "Annual health check (confirmed+paid via SQL — slot ENDED → doctor marks complete in UI = live F-17 demo)",
  );
  // confirmed+paid on the LIVE slot — Join Session (patient) and Create Session (doctor) enabled right now
  const appt10 = await bookAppointment(
    slot13,
    "Telemedicine consultation (confirmed+paid via SQL — slot LIVE → Join/Create Session enabled)",
  );

  summary.appointments = [
    {
      appointment_id: appt1.appointment_id,
      status: appt1.appointment_status,
      payment_status: appt1.payment_status,
      slot_id: slot1.slot_id,
    },
    {
      appointment_id: appt2.appointment_id,
      status: appt2.appointment_status,
      payment_status: appt2.payment_status,
      slot_id: slot2.slot_id,
    },
    {
      appointment_id: appt3.appointment_id,
      status: appt3.appointment_status,
      payment_status: appt3.payment_status,
      slot_id: slot3.slot_id,
    },
    {
      appointment_id: appt4.appointment_id,
      status: appt4.appointment_status,
      payment_status: appt4.payment_status,
      slot_id: slot7.slot_id,
    },
    {
      appointment_id: appt5.appointment_id,
      status: appt5.appointment_status,
      payment_status: appt5.payment_status,
      slot_id: slot8.slot_id,
    },
    {
      appointment_id: appt6.appointment_id,
      status: appt6.appointment_status,
      payment_status: appt6.payment_status,
      slot_id: slot9.slot_id,
    },
    {
      appointment_id: appt7.appointment_id,
      status: appt7.appointment_status,
      payment_status: appt7.payment_status,
      slot_id: slot10.slot_id,
    },
    {
      appointment_id: appt8.appointment_id,
      status: appt8.appointment_status,
      payment_status: appt8.payment_status,
      slot_id: slot11.slot_id,
    },
    {
      appointment_id: appt9.appointment_id,
      status: appt9.appointment_status,
      payment_status: appt9.payment_status,
      slot_id: slot12.slot_id,
    },
    {
      appointment_id: appt10.appointment_id,
      status: appt10.appointment_status,
      payment_status: appt10.payment_status,
      slot_id: slot13.slot_id,
    },
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE 8 — Doctor decisions (appointment_events inserted automatically)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n─── Phase 8: Doctor decisions ────────────────────────\n");

  // Reject appt2
  const rejectRes = await jsonFetch(
    `/api/v1/appointments/${appt2.appointment_id}/doctor-decision`,
    { method: "PUT", token: doctorToken, body: { decision: "reject" } },
  );
  must(
    rejectRes.status === 200,
    `reject appt2 failed: HTTP ${rejectRes.status} — ${JSON.stringify(rejectRes.body)}`,
  );
  log(
    "doctor-decision",
    `rejected appointment_id=${appt2.appointment_id} — slot freed back to 'available' (GAP-12 fixed)`,
  );
  summary.appointments[1].status =
    rejectRes.body?.appointment?.appointment_status ?? "rejected";

  // appt1 — appointment_status set to 'confirmed' + payment_status 'paid' via SQL in Phase 8b
  //          (avoids fragility of too_close_to_slot_time guard for near-future slots)
  // appt3 stays pending — F-06 reschedule demo (reschedule to slot4/slot5/slot6 from UI)
  // appt6 stays pending — patient cancels it from UI (live F-05 demo)
  // appt7 stays pending — doctor accepts from UI (live F-12 demo)
  // appt8 stays pending — doctor rejects from UI (live F-13 demo)
  // appt9, appt10 — appointment_status set to 'confirmed' + payment_status 'paid' via SQL in Phase 8b
  //                 (doctor-accept API blocks for past/near-present slots; SQL bypasses this)

  // Patient cancels appt5 — slot8 freed back to available (pre-seeded cancelled example)
  // Demonstrates: F-04 cancelled tab, F-11 cancelled tab
  const cancelRes5 = await jsonFetch(
    `/api/v1/appointments/${appt5.appointment_id}`,
    { method: "DELETE", token: patientToken },
  );
  must(
    cancelRes5.status === 200,
    `cancel appt5 failed: HTTP ${cancelRes5.status} — ${JSON.stringify(cancelRes5.body)}`,
  );
  log(
    "patient-cancel",
    `cancelled appointment_id=${appt5.appointment_id} — slot8 freed back to 'available'`,
  );
  summary.appointments[4].status = "cancelled";

  // Accept appt9 — stays CONFIRMED; payment_status set to 'paid' via SQL in Phase 8b
  // Dedicated for live F-17 (Mark as Complete) demo; keeps appt4 clean for live F-14 (Write Prescription) demo
  // NOTE: appt9 uses an ENDED slot (DEMO_DT-relative). The doctor-accept API blocks on
  //       too_close_to_slot_time when slot_start < now+2h. appointment_status is set via SQL below.
  //       (No API call here — see Phase 8b)

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE 8b — Force appointment_status='confirmed' + payment_status='paid'
  //            for appointments that bypass the doctor-accept API
  //
  //   appt1 — confirmed+paid → Phase 10 admin marks it completed (history demo)
  //   appt4 — confirmed+paid → enables Write Prescription button (F-14)
  //   appt9 — confirmed+paid → enables Mark as Complete button (F-17, slot ENDED)
  //   appt10 — confirmed+paid → enables Join/Create Session (slot LIVE)
  //
  //   All four bypass the doctor-accept API because:
  //     • appt1/appt4: fragility with too_close_to_slot_time guard for near-future slots
  //     • appt9/appt10: slots are past/present — API blocks with too_close_to_slot_time
  //
  //   payment_status='paid' is set directly via SQL because the payment flow requires
  //   a live PayHere webhook callback (ngrok). SQL bypass is safe for demo/testing.
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n─── Phase 8b: Force confirmed + paid (SQL) ───────────\n");

  const confirmedPaidIds = [
    [0, appt1.appointment_id],
    [3, appt4.appointment_id],
    [8, appt9.appointment_id],
    [9, appt10.appointment_id],
  ];
  for (const [idx, aid] of confirmedPaidIds) {
    runSQL(
      "docker-appointments-postgres-1",
      "appointmentsdb",
      `UPDATE appointments SET appointment_status = 'confirmed', payment_status = 'paid', updated_at = now() WHERE appointment_id = '${aid}';`,
    );
    log("status-sql", `set confirmed+paid for appointment_id=${aid}`);
    summary.appointments[idx].status = "confirmed";
    summary.appointments[idx].payment_status = "paid";
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE 9 — Prescription (doctorsdb.prescriptions)
  //           F-14: Doctor writes prescription for accepted/confirmed appointment
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n─── Phase 9: Write prescription ──────────────────────\n");

  const createPresc = async (body, label) => {
    const r = await jsonFetch(`/api/v1/doctors/${doctorId}/prescriptions`, {
      method: "POST",
      token: doctorToken,
      body,
    });
    must(
      r.status === 201 && r.body?.prescription?.prescription_id,
      `create prescription (${label}) failed: HTTP ${r.status} — ${JSON.stringify(r.body)}`,
    );
    const id = r.body.prescription.prescription_id;
    log(
      "prescription",
      `created prescription_id=${id} (${label}) for appointment_id=${appt1.appointment_id}`,
    );
    return id;
  };

  // Prescription 1 — primary medication
  const prescId1 = await createPresc(
    {
      patient_id: patientUserId,
      appointment_id: appt1.appointment_id,
      medication: "Amoxicillin 500mg",
      dosage: "500mg",
      frequency: "Twice daily (morning and evening)",
      duration: "7 days",
      diagnosis: "Upper respiratory tract infection",
      instructions:
        "Take with food. Complete the full course even if symptoms improve.",
    },
    "Amoxicillin",
  );

  // Prescription 2 — supportive medication (same appointment)
  const prescId2 = await createPresc(
    {
      patient_id: patientUserId,
      appointment_id: appt1.appointment_id,
      medication: "Paracetamol 500mg",
      dosage: "500mg",
      frequency: "Every 6 hours as needed",
      duration: "3 days",
      diagnosis: "Fever and throat pain",
      instructions: "Do not exceed 4 doses in 24 hours. Avoid alcohol.",
    },
    "Paracetamol",
  );

  // Prescription 3 — additional (same appointment)
  const prescId3 = await createPresc(
    {
      patient_id: patientUserId,
      appointment_id: appt1.appointment_id,
      medication: "Cetirizine 10mg",
      dosage: "10mg",
      frequency: "Once daily at bedtime",
      duration: "5 days",
      diagnosis: "Allergic rhinitis",
      instructions:
        "May cause drowsiness. Avoid driving or operating heavy machinery after taking.",
    },
    "Cetirizine",
  );

  summary.prescriptionIds = [prescId1, prescId2, prescId3];

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE 10 — Doctor marks appt1 as completed (GAP-14 fixed: doctor can now do this;
  //            using adminToken here to also demonstrate the admin force-set path)
  //            F-17: appointment lifecycle ends at 'completed'
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n─── Phase 10: Admin marks appointment completed ──────\n");

  // Note: setStatus endpoint normally guards: payment_status=paid AND slot end_time passed.
  // The admin force-set (PUT /appointments/:id/status with admin role) bypasses both guards.
  // Phase 8b already set payment_status='paid' so even the normal path would work if the slot
  // had ended. Using adminToken here ensures the seed always works regardless of slot date.
  const completeRes = await jsonFetch(
    `/api/v1/appointments/${appt1.appointment_id}/status`,
    { method: "PUT", token: adminToken, body: { status: "completed" } },
  );
  must(
    completeRes.status === 200,
    `mark completed failed: HTTP ${completeRes.status} — ${JSON.stringify(completeRes.body)}`,
  );
  log("set-status", `appointment_id=${appt1.appointment_id} → 'completed'`);
  summary.appointments[0].status = "completed";

  // ──────────────────────────────────────────────────────────────────────────
  // DONE — Print summary
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  SEED COMPLETE — Summary");
  console.log("═══════════════════════════════════════════════════════\n");

  console.log(
    `DEMO_DT: ${DEMO_DT.toLocaleString()}  (override: DEMO_DATETIME="2026-04-25T14:00:00" node seed-demo.js)`,
  );
  console.log("");
  console.log(
    `  Admin   : ${ADMIN_EMAIL} / ${PASSWORD}  — admin flows, PREREQ-6`,
  );
  console.log(
    `  Patient : ${PATIENT_EMAIL} / ${PASSWORD}  (Kavindi Silva) — all patient flows (F-01 to F-06)`,
  );
  console.log(
    `  Doctor1 : ${DOCTOR_EMAIL} / ${PASSWORD}  (Dr. Niroshan Perera) — all doctor flows (F-07 to F-17, F-23)`,
  );
  console.log(
    `  Doctor2 : ${DOCTOR2_EMAIL} / ${PASSWORD}  (Dr. Aisha Fonseka) — verified, NO profile → log in to demo F-22 (inline Create Profile form)`,
  );
  console.log(
    `  Doctor3 : ${DOCTOR3_EMAIL} / ${PASSWORD}  (Dr. Chamara Bandara) — NOT verified → visible in admin pending list → demo PREREQ-4 (Admin Verify Doctor)`,
  );
  console.log("");
  console.log(`Doctor1 profile : doctor_id = ${summary.doctorId}`);
  console.log(`Patient user_id : ${summary.patientUserId}`);
  console.log(
    `Prescriptions   : ${summary.prescriptionIds.join(", ")}  (3 Rx written for appt1 — demo F-15 both download modes)`,
  );
  console.log("");
  console.log("Availability Slots (13 total):");
  summary.slots.forEach((s, i) =>
    console.log(
      `  Slot ${String(i + 1).padStart(2)}: ${s.slot_id}  ${s.date} ${s.time}`,
    ),
  );
  console.log("");
  console.log("Appointments (10 total — all 5 status states covered):");
  const apptLabels = [
    "COMPLETED  — accepted+paid+prescription written+admin completed (pre-seeded history)",
    "REJECTED   — slot freed back to available (pre-seeded history)",
    "PENDING    — dedicated for LIVE F-06 RESCHEDULE demo (reschedule to slot4/5/6 from UI)",
    "CONFIRMED+PAID — dedicated for LIVE F-14 WRITE PRESCRIPTION demo (button visible in UI)",
    "CANCELLED  — patient-cancelled (pre-seeded; demonstrates cancelled tab)",
    "PENDING    — dedicated for LIVE F-05 CANCEL demo (patient cancels from UI)",
    "PENDING    — dedicated for LIVE F-12 ACCEPT + F-Pay PAYMENT demo (doctor accepts → patient pays)",
    "PENDING    — dedicated for LIVE F-13 REJECT demo (doctor rejects from UI)",
    "CONFIRMED+PAID — ENDED slot — dedicated for LIVE F-17 MARK AS COMPLETE demo (click from doctor UI NOW)",
    "CONFIRMED+PAID — LIVE slot  — Join Session (patient) + Create Session (doctor) clickable RIGHT NOW",
  ];
  summary.appointments.forEach((a, i) =>
    console.log(
      `  Appt ${i + 1}: ${a.appointment_id}  [${a.status ?? "?"} / payment:${a.payment_status ?? "?"}]  ${apptLabels[i]}`,
    ),
  );
  console.log("");
  console.log(
    "─── Flow Coverage ─────────────────────────────────────────────────────────\n",
  );
  console.log(
    "  PREREQ-1  Patient Registration     — no prior data needed; just register via UI with any email",
  );
  console.log(
    `  PREREQ-2  Patient Login             — data: patient account ✅; just log in as ${PATIENT_EMAIL}`,
  );
  console.log(
    "  PREREQ-3  Doctor Registration       — no prior data needed; register via UI with any email + license file",
  );
  console.log(
    "  PREREQ-4  Admin Verify Doctor       — data: doctor3 seeded but NOT verified ✅; visible in admin pending list",
  );
  console.log(
    `  PREREQ-5  Doctor Login              — data: doctor1 account active ✅; log in as ${DOCTOR_EMAIL}`,
  );
  console.log(
    `  PREREQ-6  Admin Login               — data: admin account ✅; log in as ${ADMIN_EMAIL}`,
  );
  console.log("");
  console.log(
    "  F-01  Browse Doctors               — data: doctor1 profile ✅; log in as patient → browse /doctors",
  );
  console.log(
    "  F-02  View Doctor Profile + Slots  — data: profile + slots 4/5/6 available ✅; click a doctor card",
  );
  console.log(
    "  F-03  Book Appointment             — data: available slots (slot4/5/6/2/8) ✅; log in as patient → book",
  );
  console.log(
    "  F-04  View My Appointments         — data: all 5 status tabs populated ✅; patient views appt list",
  );
  console.log(
    "  F-05  Cancel Appointment           — data: appt6 (PENDING, dedicated) ✅; patient cancels from appt list",
  );
  console.log(
    "  F-06  Reschedule Appointment       — data: appt3 (PENDING, dedicated) + slots 4/5/6 available ✅; patient reschedules",
  );
  console.log(
    "  F-07  Doctor Dashboard             — data: 10 appts with stats ✅; log in as doctor1 → dashboard",
  );
  console.log(
    "  F-08  Add Availability Slot        — data: doctor1 profile ✅; go to Availability → use Single Slot tab to add one slot, or use Bulk Generator tab (pick date + time window + slot duration → Generate Preview → Add All New Slots) to create multiple slots at once",
  );
  console.log(
    "  F-09  Delete Availability Slot     — data: slot4/5/6 available ✅ + booked slots for 409 demo; delete from Availability",
  );
  console.log(
    "  F-10  Edit Availability Slot       — data: slot4/5/6 available ✅; click pencil icon on available slot",
  );
  console.log(
    "  F-11  View Doctor Appointments     — data: all 5 status tabs populated ✅; doctor views appt list",
  );
  console.log(
    "  F-12  Accept Appointment           — data: appt7 (PENDING, dedicated) ✅; doctor clicks Accept on that card",
  );
  console.log(
    "  F-Pay Pay for Appointment          — data: appt7 (confirmed+unpaid, AFTER F-12 accept) ✅; patient clicks Pay Now → PayHere checkout → webhook sets paid",
  );
  console.log(
    "  F-PayReturn Payment Return Page    — data: automatic after PayHere redirect → polls appointment until payment_status=paid → shows confirmation",
  );
  console.log(
    "  F-13  Reject Appointment           — data: appt8 (PENDING, dedicated) ✅; doctor clicks Reject on that card",
  );
  console.log(
    "  F-14  Write Prescription           — data: appt4 (CONFIRMED+PAID, dedicated) ✅; doctor clicks Write Prescription on that card",
  );
  console.log(
    "  F-15  View Prescriptions           — data: 3 prescriptions for appt1 in DB ✅;\n" +
      "         • Path A: patient opens completed appt card → 'View Prescriptions' button → filtered view (appt1 only)\n" +
      "           → 'Download for this Appointment (3)' button downloads those 3 Rx as PDF\n" +
      "         • Path B: sidebar 'Prescriptions' link → full list (3 Rx) → use filter dropdown to pick appt1\n" +
      "           → 'Download All (3)' downloads everything; 'Download for this Appointment (3)' downloads filtered set",
  );
  console.log(
    "  F-16  Set Doctor Verification Badge  — ✅ done automatically by seed script in Phase 5 — doctorsdb.doctors.verification_status set to 'approved'; enables patient visibility + slot creation + booking",
  );
  console.log(
    "  F-17  Mark as Complete             — data: appt9 (CONFIRMED+PAID, ENDED slot) ✅; doctor clicks Mark as Complete from UI — works immediately (slot has ended at DEMO_DT)",
  );
  console.log(
    "  F-Join Join/Create Session         — data: appt10 (CONFIRMED+PAID, LIVE slot) ✅; patient clicks Join Session; doctor clicks Create Session — both enabled during slot window",
  );
  console.log(
    "  F-18  Admin Cancel (Postman)       — data: any pending/confirmed appt ✅; DELETE /api/v1/appointments/:id with admin JWT",
  );
  console.log(
    "  F-19  Event History (Postman)      — data: events recorded for all 10 appts ✅; GET /api/v1/appointments/:id/events",
  );
  console.log(
    "  F-20  Doctor Doc Upload            ❌  GAP-5: no API routes; not demonstrable",
  );
  console.log(
    "  F-21  Patient Reports Stub         ⚠️  GAP-6: stub returns []; pending patient-management-service integration",
  );
  console.log(
    "  F-22  Create Doctor Profile        — data: doctor2 verified, NO doctorsdb profile ✅; log in as doctor2 → inline form shows with pre-filled name + specialization from registration",
  );
  console.log(
    "  F-23  Update Doctor Profile        — data: doctor1 profile ✅; My Profile → Edit button on dashboard",
  );
  console.log(
    "  F-24  View Single Appt (Postman)   — data: any appointment ✅; GET /api/v1/appointments/:id",
  );
  console.log("");
  console.log(
    "─── Minimum Login Required Per Flow ──────────────────────────────────────\n",
  );
  console.log(`  Patient login  (${PATIENT_EMAIL}) : PREREQ-2, F-01 to F-06`);
  console.log(
    `  Doctor1 login  (${DOCTOR_EMAIL})  : PREREQ-5, F-07 to F-15, F-17, F-23`,
  );
  console.log(`  Doctor2 login  (${DOCTOR2_EMAIL})  : F-22`);
  console.log(
    `  Admin login    (${ADMIN_EMAIL})   : PREREQ-4, PREREQ-6, F-16, F-17 (admin path), F-18`,
  );
  console.log("  No login needed                       : PREREQ-1, PREREQ-3");
  console.log("");
  console.log(
    "─── Open Gaps ───────────────────────────────────────────────────────────\n",
  );
  console.log(
    "  GAP-5:  F-20 Doctor Document Upload — no API routes; table orphaned.",
  );
  console.log(
    "  GAP-6:  F-21 Patient Reports (doctor-side) — stub only; pending patient-management-service.",
  );
  console.log(
    "  GAP-7:  F-17 admin force-set — no admin-service frontend page; use Postman with admin JWT.",
  );
  console.log("  All other gaps (GAP-2,4,8,9,10,11,12,13,14,15) are FIXED.");
  console.log("");
};

main().catch((err) => {
  console.error("\n[UNHANDLED ERROR]", err);
  process.exit(1);
});
