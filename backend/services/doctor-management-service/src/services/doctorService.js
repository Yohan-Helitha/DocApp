/**
 * Doctor Service — all database operations for doctors, slots, and stubs.
 * All field names used in SET / WHERE come from a whitelist to prevent
 * SQL injection (values are always parameterised with $N placeholders).
 */

// ─── Doctors ─────────────────────────────────────────────────────────────────

export const createDoctor = async (
  db,
  {
    user_id,
    email,
    full_name,
    specialization,
    license_number,
    experience_years,
    consultation_fee,
    bio,
  },
) => {
  const { rows } = await db.query(
    `INSERT INTO doctors
       (user_id, email, full_name, specialization, license_number,
        experience_years, consultation_fee, bio)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      user_id,
      email,
      full_name,
      specialization,
      license_number,
      experience_years ?? 0,
      consultation_fee ?? 0,
      bio ?? null,
    ],
  );
  return rows[0];
};

export const listDoctors = async (db, { specialization, name } = {}) => {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (specialization) {
    conditions.push(`LOWER(specialization) = LOWER($${idx++})`);
    values.push(specialization);
  }
  if (name) {
    conditions.push(`full_name ILIKE $${idx++}`);
    values.push(`%${name}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await db.query(
    `SELECT doctor_id, user_id, email, full_name, specialization, license_number,
            experience_years, consultation_fee, bio, verification_status,
            created_at, updated_at
     FROM doctors ${where}
     ORDER BY created_at DESC`,
    values,
  );
  return rows;
};

export const getDoctorById = async (db, doctorId) => {
  const { rows } = await db.query(
    `SELECT doctor_id, user_id, email, full_name, specialization, license_number,
            experience_years, consultation_fee, bio, verification_status,
            created_at, updated_at
     FROM doctors WHERE doctor_id = $1`,
    [doctorId],
  );
  if (!rows[0]) {
    const e = new Error("doctor_not_found");
    e.status = 404;
    throw e;
  }
  return rows[0];
};

export const updateDoctor = async (db, doctorId, updates) => {
  const allowed = [
    "full_name",
    "specialization",
    "license_number",
    "experience_years",
    "consultation_fee",
    "bio",
  ];
  const fields = Object.keys(updates).filter((k) => allowed.includes(k));
  if (fields.length === 0) {
    const e = new Error("no_valid_fields");
    e.status = 400;
    throw e;
  }

  const sets = fields.map((f, i) => `${f} = $${i + 1}`);
  sets.push("updated_at = now()");
  const values = fields.map((f) => updates[f]);
  const doctorIdx = values.length + 1;
  values.push(doctorId);

  const { rows } = await db.query(
    `UPDATE doctors SET ${sets.join(", ")}
     WHERE doctor_id = $${doctorIdx}
     RETURNING *`,
    values,
  );
  if (!rows[0]) {
    const e = new Error("doctor_not_found");
    e.status = 404;
    throw e;
  }
  return rows[0];
};

export const setVerificationStatus = async (db, doctorId, status) => {
  const allowed = ["pending", "approved", "rejected"];
  if (!allowed.includes(status)) {
    const e = new Error("invalid_verification_status");
    e.status = 400;
    throw e;
  }
  const { rows } = await db.query(
    `UPDATE doctors
     SET verification_status = $1, updated_at = now()
     WHERE doctor_id = $2
     RETURNING *`,
    [status, doctorId],
  );
  if (!rows[0]) {
    const e = new Error("doctor_not_found");
    e.status = 404;
    throw e;
  }
  return rows[0];
};

// ─── Availability Slots ───────────────────────────────────────────────────────

export const addSlot = async (
  db,
  doctorId,
  { slot_date, start_time, end_time },
) => {
  const { rows } = await db.query(
    `INSERT INTO doctor_availability_slots (doctor_id, slot_date, start_time, end_time)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [doctorId, slot_date, start_time, end_time],
  );
  return rows[0];
};

export const listSlots = async (db, doctorId, { date, status } = {}) => {
  const conditions = ["doctor_id = $1"];
  const values = [doctorId];
  let idx = 2;

  if (date) {
    conditions.push(`slot_date = $${idx++}`);
    values.push(date);
  }
  if (status) {
    conditions.push(`slot_status = $${idx++}`);
    values.push(status);
  }

  const { rows } = await db.query(
    `SELECT * FROM doctor_availability_slots
     WHERE ${conditions.join(" AND ")}
     ORDER BY slot_date, start_time`,
    values,
  );
  return rows;
};

export const updateSlot = async (db, doctorId, slotId, updates) => {
  const allowed = ["slot_date", "start_time", "end_time", "slot_status"];
  const fields = Object.keys(updates).filter((k) => allowed.includes(k));
  if (fields.length === 0) {
    const e = new Error("no_valid_fields");
    e.status = 400;
    throw e;
  }

  const sets = fields.map((f, i) => `${f} = $${i + 1}`);
  const values = fields.map((f) => updates[f]);
  const doctorIdx = values.length + 1;
  const slotIdx = values.length + 2;
  values.push(doctorId, slotId);

  const { rows } = await db.query(
    `UPDATE doctor_availability_slots
     SET ${sets.join(", ")}
     WHERE doctor_id = $${doctorIdx} AND slot_id = $${slotIdx}
     RETURNING *`,
    values,
  );
  if (!rows[0]) {
    const e = new Error("slot_not_found");
    e.status = 404;
    throw e;
  }
  return rows[0];
};

export const getSlotById = async (db, doctorId, slotId) => {
  const { rows } = await db.query(
    `SELECT * FROM doctor_availability_slots
     WHERE doctor_id = $1 AND slot_id = $2`,
    [doctorId, slotId],
  );
  if (!rows[0]) {
    const e = new Error("slot_not_found");
    e.status = 404;
    throw e;
  }
  return rows[0];
};

export const deleteSlot = async (db, doctorId, slotId) => {
  const { rowCount } = await db.query(
    `DELETE FROM doctor_availability_slots
     WHERE doctor_id = $1 AND slot_id = $2`,
    [doctorId, slotId],
  );
  if (rowCount === 0) {
    const e = new Error("slot_not_found");
    e.status = 404;
    throw e;
  }
};
