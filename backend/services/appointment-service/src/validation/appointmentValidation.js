// Validates the POST /api/v1/appointments booking body.
export const validateBookAppointment = (req, res, next) => {
  const { doctor_id, slot_id } = req.body || {};
  if (!doctor_id) return res.status(400).json({ error: "doctor_id_required" });
  if (!slot_id) return res.status(400).json({ error: "slot_id_required" });
  next();
};
