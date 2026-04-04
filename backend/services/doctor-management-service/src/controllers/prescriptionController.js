import * as prescriptionService from "../services/prescriptionService.js";
import * as doctorService from "../services/doctorService.js";

// Shared ownership guard: caller must be a doctor who owns the profile.
const assertDoctorOwner = async (db, doctorId, user) => {
  const doctor = await doctorService.getDoctorById(db, doctorId);
  if (user.role !== "doctor" || doctor.user_id !== user.id) {
    const e = new Error("forbidden");
    e.status = 403;
    throw e;
  }
  return doctor;
};

const handleError = (err, res, req, context) => {
  req.log.error(err, context);
  if (err.status) return res.status(err.status).json({ error: err.message });
  return res.status(500).json({ error: "internal_error" });
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const createPrescription = async (req, res) => {
  try {
    await assertDoctorOwner(req.db, req.params.doctorId, req.user);
    const prescription = await prescriptionService.createPrescription(
      req.db,
      req.params.doctorId,
      req.body,
    );
    return res.status(201).json({ prescription });
  } catch (err) {
    return handleError(err, res, req, "createPrescription");
  }
};

export const listPrescriptions = async (req, res) => {
  try {
    await assertDoctorOwner(req.db, req.params.doctorId, req.user);
    const prescriptions = await prescriptionService.listPrescriptions(
      req.db,
      req.params.doctorId,
    );
    return res.json({ prescriptions });
  } catch (err) {
    return handleError(err, res, req, "listPrescriptions");
  }
};

export const getPrescriptionById = async (req, res) => {
  try {
    await assertDoctorOwner(req.db, req.params.doctorId, req.user);
    const prescription = await prescriptionService.getPrescriptionById(
      req.db,
      req.params.doctorId,
      req.params.prescriptionId,
    );
    return res.json({ prescription });
  } catch (err) {
    return handleError(err, res, req, "getPrescriptionById");
  }
};

export const listPrescriptionsByPatient = async (req, res) => {
  try {
    if (req.user.role !== "patient" && req.user.role !== "admin") {
      return res.status(403).json({ error: "forbidden" });
    }
    if (req.user.role === "patient" && req.user.id !== req.params.patientId) {
      return res.status(403).json({ error: "forbidden" });
    }
    const prescriptions = await prescriptionService.listPrescriptionsByPatient(
      req.db,
      req.params.patientId,
    );
    return res.json({ prescriptions });
  } catch (err) {
    return handleError(err, res, req, "listPrescriptionsByPatient");
  }
};
