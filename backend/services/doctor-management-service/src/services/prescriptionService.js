// ─── Prescriptions ────────────────────────────────────────────────────────────

export const createPrescription = async (
  db,
  doctorId,
  {
    patient_id,
    appointment_id,
    diagnosis,
    medication,
    dosage,
    frequency,
    duration,
    instructions,
  },
) => {
  const { rows } = await db.query(
    `INSERT INTO prescriptions
       (doctor_id, patient_id, appointment_id, diagnosis,
        medication, dosage, frequency, duration, instructions)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      doctorId,
      patient_id,
      appointment_id ?? null,
      diagnosis ?? null,
      medication,
      dosage ?? null,
      frequency ?? null,
      duration ?? null,
      instructions ?? null,
    ],
  );
  return rows[0];
};

export const listPrescriptions = async (db, doctorId) => {
  const { rows } = await db.query(
    `SELECT * FROM prescriptions
     WHERE doctor_id = $1
     ORDER BY issued_at DESC`,
    [doctorId],
  );
  return rows;
};

export const getPrescriptionById = async (db, doctorId, prescriptionId) => {
  const { rows } = await db.query(
    `SELECT * FROM prescriptions
     WHERE doctor_id = $1 AND prescription_id = $2`,
    [doctorId, prescriptionId],
  );
  if (!rows[0]) {
    const e = new Error("prescription_not_found");
    e.status = 404;
    throw e;
  }
  return rows[0];
};

export const listPrescriptionsByPatient = async (
  db,
  patientId,
  appointmentId = null,
) => {
  const sqlParams = [patientId];
  let filter = `WHERE p.patient_id = $1`;
  if (appointmentId) {
    sqlParams.push(appointmentId);
    filter += ` AND p.appointment_id = $2`;
  }
  const { rows } = await db.query(
    `SELECT p.*,
            d.full_name        AS doctor_name,
            d.specialization   AS doctor_specialization,
            d.license_number   AS doctor_license_number
       FROM prescriptions p
       LEFT JOIN doctors d ON d.doctor_id = p.doctor_id
      ${filter}
      ORDER BY p.issued_at DESC`,
    sqlParams,
  );
  return rows;
};
