/**
 * seed-demo.js — Full demo data seeder for DocApp
 *
 * Populates ALL tables needed to demonstrate every flow in SERVICE_DEMO_FLOWS.md:
 *   authdb:        users (5: admin, patient, 3 doctors), doctor_verification_requests, refresh_tokens
 *   doctorsdb:     doctors (1 profile), doctor_availability_slots (12 slots), prescriptions (1)
 *   appointmentsdb: appointments (9, covering ALL 5 status states + dedicated slots per interactive flow)
 *
 * Accounts seeded:
 *   admin1@example.com  — admin
 *   patient2@example.com — patient (owns all seeded appointments)
 *   doctor1@example.com  — verified, has profile → use for all doctor flows
 *   doctor2@example.com  — verified, NO profile in doctorsdb → log in to demo F-22 inline Create Profile
 *   doctor3@example.com  — registered, NOT verified → appears in admin pending list → demo PREREQ-4
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
 *   node seed-demo.js
 *   API_BASE=http://localhost:4000 node seed-demo.js
 */

const { execSync } = require("child_process");

const API_BASE = process.env.API_BASE || "http://localhost:4000";

// ─── Accounts ─────────────────────────────────────────────────────────────────
const ADMIN_EMAIL = "admin1@example.com";
const DOCTOR_EMAIL = "doctor1@example.com";
const DOCTOR2_EMAIL = "doctor2@example.com"; // verified, NO profile → demo F-22 inline Create Profile
const DOCTOR3_EMAIL = "doctor3@example.com"; // NOT verified → shows in admin pending list → demo PREREQ-4
const PATIENT_EMAIL = "patient2@example.com";
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

/**
 * Run a SQL statement inside a running postgres container via docker exec.
 * Silently skips if docker/psql fails (e.g. container name differs).
 */
const runSQL = (container, db, sql) => {
  try {
    execSync(`docker exec ${container} psql -U postgres -d ${db} -c "${sql}"`, {
      stdio: "pipe",
    });
  } catch (e) {
    // Best-effort — if container name changed, we log a warning and continue
    console.warn(
      `[cleanup] docker exec failed for ${container}: ${e.stderr?.toString().trim() || e.message}`,
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
  });

  // 1c. Doctor1 registration (requires multipart/form-data with license file)
  // full_name and specialization are stored in doctor_verification_requests.profile_data
  // and surfaced by GET /api/v1/auth/me registrationData — used by SuccessDoctor.jsx pre-fill (F-22)
  await registerUser(
    "/api/v1/auth/register/doctor",
    {
      email: DOCTOR_EMAIL,
      password: PASSWORD,
      full_name: "Dr. A. Demo",
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
      full_name: "Dr. B. Second",
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
      full_name: "Dr. C. Pending",
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
        full_name: "Dr. A. Demo",
        specialization: "General Medicine",
        license_number: "LIC-DEMO-001",
        experience_years: 5,
        consultation_fee: 50.0,
        bio: "Demo doctor — seeded for DocApp flow demonstration.",
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

  const tomorrow = dateOffset(1);
  const dayAfter = dateOffset(2);
  const threeDays = dateOffset(3);
  const fourDays = dateOffset(4);
  const fiveDays = dateOffset(5);

  const slotsToCreate = [
    // Slot 1 → patient will book → doctor ACCEPTS → prescription written → admin marks completed
    {
      slot_date: tomorrow,
      start_time: "09:00",
      end_time: "09:30",
      label: "slot1 (will be accepted)",
    },
    // Slot 2 → patient will book → doctor REJECTS → slot freed back to available (GAP-12 fixed)
    {
      slot_date: tomorrow,
      start_time: "10:00",
      end_time: "10:30",
      label: "slot2 (will be rejected)",
    },
    // Slot 3 → patient will book → stays PENDING (use for F-06 reschedule demo)
    {
      slot_date: tomorrow,
      start_time: "11:00",
      end_time: "11:30",
      label: "slot3 (stays pending)",
    },
    // Slots 4, 5, 6 → available (demonstrate browse-doctor availability page + F-06 reschedule targets)
    {
      slot_date: dayAfter,
      start_time: "09:00",
      end_time: "09:30",
      label: "slot4 (available)",
    },
    {
      slot_date: dayAfter,
      start_time: "14:00",
      end_time: "14:30",
      label: "slot5 (available)",
    },
    {
      slot_date: threeDays,
      start_time: "10:00",
      end_time: "10:30",
      label: "slot6 (available)",
    },
    // Slot 7 → patient will book → doctor ACCEPTS → stays CONFIRMED (no prescription yet)
    // Demonstrates: F-04/F-11 confirmed tab, F-07 dashboard confirmed count, F-14 Write Prescription button
    {
      slot_date: threeDays,
      start_time: "14:00",
      end_time: "14:30",
      label: "slot7 (will be confirmed — no prescription)",
    },
    // Slot 8 → patient will book → patient CANCELS → slot freed back to available
    // Demonstrates: F-04/F-11 cancelled tab, F-05 appt5-cancel (pre-seeded example)
    {
      slot_date: fourDays,
      start_time: "09:00",
      end_time: "09:30",
      label: "slot8 (will be cancelled by patient — pre-seeded F-05 example)",
    },
    // Slot 9 → patient will book → stays PENDING → patient cancels from UI = live F-05 demo
    {
      slot_date: fourDays,
      start_time: "11:00",
      end_time: "11:30",
      label: "slot9 (pending — patient cancels in UI = F-05 demo)",
    },
    // Slot 10 → patient will book → stays PENDING → doctor accepts from UI = live F-12 demo
    {
      slot_date: fourDays,
      start_time: "14:00",
      end_time: "14:30",
      label: "slot10 (pending — doctor accepts in UI = F-12 demo)",
    },
    // Slot 11 → patient will book → stays PENDING → doctor rejects from UI = live F-13 demo
    {
      slot_date: fiveDays,
      start_time: "09:00",
      end_time: "09:30",
      label: "slot11 (pending — doctor rejects in UI = F-13 demo)",
    },
    // Slot 12 → patient will book → doctor ACCEPTS (in seed) → stays CONFIRMED → doctor clicks Mark as Complete = live F-17 demo
    {
      slot_date: fiveDays,
      start_time: "11:00",
      end_time: "11:30",
      label: "slot12 (confirmed — doctor marks complete in UI = F-17 demo)",
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

  // We need the patient's user_id for prescriptions. Extract it from the JWT payload.
  // JWT payload: { sub: user_id, email, role } — the user ID is in the 'sub' claim.
  const patientUserId = JSON.parse(
    Buffer.from(patientToken.split(".")[1], "base64url").toString("utf8"),
  ).sub;
  log("patient-id", `extracted from JWT: ${patientUserId}`);
  summary.patientUserId = patientUserId;

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
    "Routine checkup (will be accepted + completed)",
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
    "Specialist consultation (confirmed — F-14 Write Prescription demo)",
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
    "Emergency consultation (pending — doctor accepts this in UI = live F-12 demo)",
  );
  const appt8 = await bookAppointment(
    slot11,
    "Pre-op assessment (pending — doctor rejects this in UI = live F-13 demo)",
  );
  // This one gets accepted by seed — stays confirmed, no prescription — doctor marks it complete from UI
  const appt9 = await bookAppointment(
    slot12,
    "Annual health check (confirmed — doctor marks complete in UI = live F-17 demo)",
  );

  summary.appointments = [
    {
      appointment_id: appt1.appointment_id,
      status: appt1.appointment_status,
      slot_id: slot1.slot_id,
    },
    {
      appointment_id: appt2.appointment_id,
      status: appt2.appointment_status,
      slot_id: slot2.slot_id,
    },
    {
      appointment_id: appt3.appointment_id,
      status: appt3.appointment_status,
      slot_id: slot3.slot_id,
    },
    {
      appointment_id: appt4.appointment_id,
      status: appt4.appointment_status,
      slot_id: slot7.slot_id,
    },
    {
      appointment_id: appt5.appointment_id,
      status: appt5.appointment_status,
      slot_id: slot8.slot_id,
    },
    {
      appointment_id: appt6.appointment_id,
      status: appt6.appointment_status,
      slot_id: slot9.slot_id,
    },
    {
      appointment_id: appt7.appointment_id,
      status: appt7.appointment_status,
      slot_id: slot10.slot_id,
    },
    {
      appointment_id: appt8.appointment_id,
      status: appt8.appointment_status,
      slot_id: slot11.slot_id,
    },
    {
      appointment_id: appt9.appointment_id,
      status: appt9.appointment_status,
      slot_id: slot12.slot_id,
    },
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE 8 — Doctor decisions (appointment_events inserted automatically)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n─── Phase 8: Doctor decisions ────────────────────────\n");

  // Accept appt1
  const acceptRes = await jsonFetch(
    `/api/v1/appointments/${appt1.appointment_id}/doctor-decision`,
    { method: "PUT", token: doctorToken, body: { decision: "accept" } },
  );
  must(
    acceptRes.status === 200,
    `accept appt1 failed: HTTP ${acceptRes.status} — ${JSON.stringify(acceptRes.body)}`,
  );
  log("doctor-decision", `accepted appointment_id=${appt1.appointment_id}`);
  summary.appointments[0].status =
    acceptRes.body?.appointment?.appointment_status ?? "confirmed";

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

  // Accept appt4 — leaves it in 'confirmed' state (no prescription written yet)
  // Demonstrates: F-04 confirmed tab, F-07 dashboard confirmed count, F-11 confirmed tab,
  //               F-14 Write Prescription button (only visible on confirmed cards in UI)
  const acceptRes4 = await jsonFetch(
    `/api/v1/appointments/${appt4.appointment_id}/doctor-decision`,
    { method: "PUT", token: doctorToken, body: { decision: "accept" } },
  );
  must(
    acceptRes4.status === 200,
    `accept appt4 failed: HTTP ${acceptRes4.status} — ${JSON.stringify(acceptRes4.body)}`,
  );
  log(
    "doctor-decision",
    `accepted appointment_id=${appt4.appointment_id} — stays confirmed (no prescription)`,
  );
  summary.appointments[3].status =
    acceptRes4.body?.appointment?.appointment_status ?? "confirmed";

  // appt3 stays pending — F-06 reschedule demo (reschedule to slot4/slot5/slot6 from UI)
  // appt6 stays pending — patient cancels it from UI (live F-05 demo)
  // appt7 stays pending — doctor accepts from UI (live F-12 demo)
  // appt8 stays pending — doctor rejects from UI (live F-13 demo)

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

  // Accept appt9 — stays CONFIRMED (no prescription written)
  // Dedicated for live F-17 (Mark as Complete) demo; keeps appt4 clean for live F-14 (Write Prescription) demo
  const acceptRes9 = await jsonFetch(
    `/api/v1/appointments/${appt9.appointment_id}/doctor-decision`,
    { method: "PUT", token: doctorToken, body: { decision: "accept" } },
  );
  must(
    acceptRes9.status === 200,
    `accept appt9 failed: HTTP ${acceptRes9.status} — ${JSON.stringify(acceptRes9.body)}`,
  );
  log(
    "doctor-decision",
    `accepted appointment_id=${appt9.appointment_id} — stays confirmed (for F-17 Mark as Complete)`,
  );
  summary.appointments[8].status =
    acceptRes9.body?.appointment?.appointment_status ?? "confirmed";

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE 9 — Prescription (doctorsdb.prescriptions)
  //           F-14: Doctor writes prescription for accepted/confirmed appointment
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n─── Phase 9: Write prescription ──────────────────────\n");

  const prescRes = await jsonFetch(
    `/api/v1/doctors/${doctorId}/prescriptions`,
    {
      method: "POST",
      token: doctorToken,
      body: {
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
    },
  );
  must(
    prescRes.status === 201 && prescRes.body?.prescription?.prescription_id,
    `create prescription failed: HTTP ${prescRes.status} — ${JSON.stringify(prescRes.body)}`,
  );
  const prescId = prescRes.body.prescription.prescription_id;
  log(
    "prescription",
    `created prescription_id=${prescId} for appointment_id=${appt1.appointment_id}`,
  );
  summary.prescriptionId = prescId;

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE 10 — Doctor marks appt1 as completed (GAP-14 fixed: doctor can now do this;
  //            using adminToken here to also demonstrate the admin force-set path)
  //            F-17: appointment lifecycle ends at 'completed'
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n─── Phase 10: Admin marks appointment completed ──────\n");

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

  console.log("Accounts:");
  console.log(
    `  Admin   : ${ADMIN_EMAIL} / ${PASSWORD}  — admin flows, PREREQ-6`,
  );
  console.log(
    `  Patient : ${PATIENT_EMAIL} / ${PASSWORD}  — all patient flows (F-01 to F-06)`,
  );
  console.log(
    `  Doctor1 : ${DOCTOR_EMAIL} / ${PASSWORD}  — all doctor flows (F-07 to F-17, F-23)`,
  );
  console.log(
    `  Doctor2 : ${DOCTOR2_EMAIL} / ${PASSWORD}  — verified, NO profile → log in to demo F-22 (inline Create Profile form)`,
  );
  console.log(
    `  Doctor3 : ${DOCTOR3_EMAIL} / ${PASSWORD}  — NOT verified → visible in admin pending list → demo PREREQ-4 (Admin Verify Doctor)`,
  );
  console.log("");
  console.log(`Doctor1 profile : doctor_id = ${summary.doctorId}`);
  console.log(`Patient user_id : ${summary.patientUserId}`);
  console.log(`Prescription    : prescription_id = ${summary.prescriptionId}`);
  console.log("");
  console.log("Availability Slots (12 total):");
  summary.slots.forEach((s, i) =>
    console.log(
      `  Slot ${String(i + 1).padStart(2)}: ${s.slot_id}  ${s.date} ${s.time}`,
    ),
  );
  console.log("");
  console.log("Appointments (9 total — all 5 status states covered):");
  const apptLabels = [
    "COMPLETED  — accepted + prescription written + admin completed (pre-seeded history)",
    "REJECTED   — slot freed back to available (pre-seeded history)",
    "PENDING    — dedicated for LIVE F-06 RESCHEDULE demo (reschedule to slot4/5/6 from UI)",
    "CONFIRMED  — dedicated for LIVE F-14 WRITE PRESCRIPTION demo (button visible in UI)",
    "CANCELLED  — patient-cancelled (pre-seeded; demonstrates cancelled tab)",
    "PENDING    — dedicated for LIVE F-05 CANCEL demo (patient cancels from UI)",
    "PENDING    — dedicated for LIVE F-12 ACCEPT demo (doctor accepts from UI)",
    "PENDING    — dedicated for LIVE F-13 REJECT demo (doctor rejects from UI)",
    "CONFIRMED  — dedicated for LIVE F-17 MARK AS COMPLETE demo (doctor completes from UI)",
  ];
  summary.appointments.forEach((a, i) =>
    console.log(`  Appt ${i + 1}: ${a.appointment_id}  ${apptLabels[i]}`),
  );
  console.log("");
  console.log(
    "─── Flow Coverage ─────────────────────────────────────────────────────────\n",
  );
  console.log(
    "  PREREQ-1  Patient Registration     — no prior data needed; just register via UI with any email",
  );
  console.log(
    "  PREREQ-2  Patient Login             — data: patient account ✅; just log in as patient2@example.com",
  );
  console.log(
    "  PREREQ-3  Doctor Registration       — no prior data needed; register via UI with any email + license file",
  );
  console.log(
    "  PREREQ-4  Admin Verify Doctor       — data: doctor3 seeded but NOT verified ✅; visible in admin pending list",
  );
  console.log(
    "  PREREQ-5  Doctor Login              — data: doctor1 account active ✅; log in as doctor1@example.com",
  );
  console.log(
    "  PREREQ-6  Admin Login               — data: admin account ✅; log in as admin1@example.com",
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
    "  F-07  Doctor Dashboard             — data: 9 appts with stats ✅; log in as doctor1 → dashboard",
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
    "  F-13  Reject Appointment           — data: appt8 (PENDING, dedicated) ✅; doctor clicks Reject on that card",
  );
  console.log(
    "  F-14  Write Prescription           — data: appt4 (CONFIRMED, dedicated) ✅; doctor clicks Write Prescription on that card",
  );
  console.log(
    "  F-15  View Prescriptions           — data: 1 prescription in DB ✅; patient views via 'View Prescriptions' button on completed appt card → filtered view; or via sidebar Prescriptions link → full view with appointment filter",
  );
  console.log(
    "  F-16  Set Doctor Verification Badge  — ✅ done automatically by seed script in Phase 5 — doctorsdb.doctors.verification_status set to 'approved'; enables patient visibility + slot creation + booking",
  );
  console.log(
    "  F-17  Mark as Complete             — data: appt9 (CONFIRMED, dedicated) ✅; doctor clicks Mark as Complete on that card",
  );
  console.log(
    "  F-18  Admin Cancel (Postman)       — data: any pending/confirmed appt ✅; DELETE /api/v1/appointments/:id with admin JWT",
  );
  console.log(
    "  F-19  Event History (Postman)      — data: events recorded for all 9 appts ✅; GET /api/v1/appointments/:id/events",
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
  console.log(
    "  Patient login  (patient2@example.com) : PREREQ-2, F-01 to F-06",
  );
  console.log(
    "  Doctor1 login  (doctor1@example.com)  : PREREQ-5, F-07 to F-15, F-17, F-23",
  );
  console.log("  Doctor2 login  (doctor2@example.com)  : F-22");
  console.log(
    "  Admin login    (admin1@example.com)   : PREREQ-4, PREREQ-6, F-16, F-17 (admin path), F-18",
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
