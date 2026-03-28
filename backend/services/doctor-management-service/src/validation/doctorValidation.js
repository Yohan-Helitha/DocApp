export const validateCreateDoctor = (req, res, next) => {
  const { full_name, specialization, license_number } = req.body || {};
  if (!full_name) return res.status(400).json({ error: "full_name_required" });
  if (!specialization)
    return res.status(400).json({ error: "specialization_required" });
  if (!license_number)
    return res.status(400).json({ error: "license_number_required" });
  next();
};

export const validateAddSlot = (req, res, next) => {
  const { slot_date, start_time, end_time } = req.body || {};
  if (!slot_date) return res.status(400).json({ error: "slot_date_required" });
  if (!start_time)
    return res.status(400).json({ error: "start_time_required" });
  if (!end_time) return res.status(400).json({ error: "end_time_required" });
  next();
};

export const validateCreatePrescription = (req, res, next) => {
  const { patient_id, medication } = req.body || {};
  if (!patient_id)
    return res.status(400).json({ error: "patient_id_required" });
  if (!medication)
    return res.status(400).json({ error: "medication_required" });
  next();
};
