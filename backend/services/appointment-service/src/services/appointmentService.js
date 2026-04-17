/**
 * appointmentService.js — all database operations for appointments.
 * Pure DB layer: no HTTP calls, no business-rule decisions.
 */

const VALID_STATUSES = [
  "pending",
  "confirmed",
  "rejected",
  "completed",
  "cancelled",
];

// ─── Appointments ─────────────────────────────────────────────────────────────

export const createAppointment = async (
  db,
  {
    patient_id,
    doctor_id,
    slot_id,
    patient_email,
    doctor_email,
    reason_for_visit,
    doctor_name,
    patient_name,
    slot_date,
    start_time,
    end_time,
    consultation_fee,
  },
) => {
  const { rows } = await db.query(
    `INSERT INTO appointments
       (patient_id, doctor_id, slot_id, patient_email, doctor_email, reason_for_visit,
        doctor_name, patient_name, slot_date, start_time, end_time, consultation_fee)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      patient_id,
      doctor_id,
      slot_id,
      patient_email ?? null,
      doctor_email ?? null,
      reason_for_visit ?? null,
      doctor_name ?? null,
      patient_name ?? null,
      slot_date ?? null,
      start_time ?? null,
      end_time ?? null,
      consultation_fee ?? null,
    ],
  );
  return rows[0];
};

export const getAppointmentById = async (db, appointmentId) => {
  const { rows } = await db.query(
    `SELECT * FROM appointments WHERE appointment_id = $1`,
    [appointmentId],
  );
  if (!rows[0]) {
    const e = new Error("appointment_not_found");
    e.status = 404;
    throw e;
  }
  return rows[0];
};

export const listByPatient = async (db, patientId) => {
  const { rows } = await db.query(
    `SELECT * FROM appointments
     WHERE patient_id = $1
     ORDER BY created_at DESC`,
    [patientId],
  );
  return rows;
};

export const listUpcomingForPatient = async (db, patientId) => {
  const { rows } = await db.query(
    `SELECT * FROM appointments
     WHERE patient_id = $1
       AND appointment_status IN ('pending', 'confirmed')
       AND slot_date IS NOT NULL
       AND start_time IS NOT NULL
       AND end_time IS NOT NULL
       AND (
         slot_date > CURRENT_DATE
         OR (slot_date = CURRENT_DATE AND start_time >= CURRENT_TIME)
       )
     ORDER BY slot_date ASC, start_time ASC, created_at ASC`,
    [patientId],
  );
  return rows;
};

export const listByDoctor = async (db, doctorId) => {
  const { rows } = await db.query(
    `SELECT * FROM appointments
     WHERE doctor_id = $1
     ORDER BY created_at DESC`,
    [doctorId],
  );
  return rows;
};

export const updateAppointment = async (db, appointmentId, updates) => {
  const allowed = ["slot_id", "reason_for_visit"];
  const fields = Object.keys(updates).filter((k) => allowed.includes(k));
  if (fields.length === 0) {
    const e = new Error("no_valid_fields");
    e.status = 400;
    throw e;
  }

  const sets = fields.map((f, i) => `${f} = $${i + 1}`);
  sets.push("updated_at = now()");
  const values = fields.map((f) => updates[f]);
  values.push(appointmentId);

  const { rows } = await db.query(
    `UPDATE appointments
     SET ${sets.join(", ")}
     WHERE appointment_id = $${values.length}
     RETURNING *`,
    values,
  );
  if (!rows[0]) {
    const e = new Error("appointment_not_found");
    e.status = 404;
    throw e;
  }
  return rows[0];
};

export const setStatus = async (db, appointmentId, status) => {
  if (!VALID_STATUSES.includes(status)) {
    const e = new Error("invalid_appointment_status");
    e.status = 400;
    throw e;
  }
  const { rows } = await db.query(
    `UPDATE appointments
     SET appointment_status = $1, updated_at = now()
     WHERE appointment_id = $2
     RETURNING *`,
    [status, appointmentId],
  );
  if (!rows[0]) {
    const e = new Error("appointment_not_found");
    e.status = 404;
    throw e;
  }
  return rows[0];
};

// ─── Appointment Events ───────────────────────────────────────────────────────

export const addEvent = async (
  db,
  appointmentId,
  { event_type, event_actor, notes },
) => {
  const { rows } = await db.query(
    `INSERT INTO appointment_events (appointment_id, event_type, event_actor, notes)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [appointmentId, event_type, event_actor ?? null, notes ?? null],
  );
  return rows[0];
};

export const getEvents = async (db, appointmentId) => {
  const { rows } = await db.query(
    `SELECT * FROM appointment_events
     WHERE appointment_id = $1
     ORDER BY event_timestamp ASC`,
    [appointmentId],
  );
  return rows;
};

// --- Payment Deadline -----------------------------------------------------

export const setPaymentDeadline = async (db, appointmentId, deadline) => {
  const { rows } = await db.query(
    `UPDATE appointments
     SET payment_deadline = $1, updated_at = now()
     WHERE appointment_id = $2
     RETURNING *`,
    [deadline, appointmentId],
  );
  if (!rows[0]) {
    const e = new Error("appointment_not_found");
    e.status = 404;
    throw e;
  }
  return rows[0];
};

// --- Payment Status -------------------------------------------------------

const VALID_PAYMENT_STATUSES = ["unpaid", "paid", "refunded", "expired"];

export const updatePaymentStatus = async (db, appointmentId, paymentStatus) => {
  if (!VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
    const e = new Error("invalid_payment_status");
    e.status = 400;
    throw e;
  }
  const { rows } = await db.query(
    `UPDATE appointments
     SET payment_status = $1, updated_at = now()
     WHERE appointment_id = $2
     RETURNING *`,
    [paymentStatus, appointmentId],
  );
  if (!rows[0]) {
    const e = new Error("appointment_not_found");
    e.status = 404;
    throw e;
  }
  return rows[0];
};
