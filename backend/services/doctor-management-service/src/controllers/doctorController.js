import * as doctorService from "../services/doctorService.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const handleError = (err, res, req, context) => {
  req.log.error(err, context);
  if (err.status) return res.status(err.status).json({ error: err.message });
  return res.status(500).json({ error: "internal_error" });
};

// ─── Doctor CRUD ──────────────────────────────────────────────────────────────

export const createDoctor = async (req, res) => {
  try {
    if (req.user.role !== "doctor")
      return res.status(403).json({ error: "forbidden" });
    const doctor = await doctorService.createDoctor(req.db, {
      user_id: req.user.id,
      email: req.user.email,
      ...req.body,
    });
    return res.status(201).json({ doctor });
  } catch (err) {
    return handleError(err, res, req, "createDoctor");
  }
};

export const listDoctors = async (req, res) => {
  try {
    const { specialization, name } = req.query;
    const doctors = await doctorService.listDoctors(req.db, {
      specialization,
      name,
    });
    return res.json({ doctors });
  } catch (err) {
    return handleError(err, res, req, "listDoctors");
  }
};

export const getDoctorById = async (req, res) => {
  try {
    const doctor = await doctorService.getDoctorById(
      req.db,
      req.params.doctorId,
    );
    return res.json({ doctor });
  } catch (err) {
    return handleError(err, res, req, "getDoctorById");
  }
};

export const updateDoctor = async (req, res) => {
  try {
    const doctor = await doctorService.getDoctorById(
      req.db,
      req.params.doctorId,
    );
    if (req.user.role !== "admin" && doctor.user_id !== req.user.id) {
      return res.status(403).json({ error: "forbidden" });
    }
    const updated = await doctorService.updateDoctor(
      req.db,
      req.params.doctorId,
      req.body,
    );
    return res.json({ doctor: updated });
  } catch (err) {
    return handleError(err, res, req, "updateDoctor");
  }
};

export const setVerificationStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ error: "forbidden" });
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ error: "status_required" });
    const doctor = await doctorService.setVerificationStatus(
      req.db,
      req.params.doctorId,
      status,
    );
    return res.json({ doctor });
  } catch (err) {
    return handleError(err, res, req, "setVerificationStatus");
  }
};

// ─── Availability Slots ───────────────────────────────────────────────────────

const assertSlotOwner = async (db, doctorId, user) => {
  const doctor = await doctorService.getDoctorById(db, doctorId);
  // 'service' role is used by appointment-service for service-to-service slot updates
  if (
    user.role !== "admin" &&
    user.role !== "service" &&
    doctor.user_id !== user.id
  ) {
    const e = new Error("forbidden");
    e.status = 403;
    throw e;
  }
};

export const addSlot = async (req, res) => {
  try {
    await assertSlotOwner(req.db, req.params.doctorId, req.user);
    const slot = await doctorService.addSlot(
      req.db,
      req.params.doctorId,
      req.body,
    );
    return res.status(201).json({ slot });
  } catch (err) {
    return handleError(err, res, req, "addSlot");
  }
};

export const listSlots = async (req, res) => {
  try {
    const { date, status } = req.query;
    const slots = await doctorService.listSlots(req.db, req.params.doctorId, {
      date,
      status,
    });
    return res.json({ slots });
  } catch (err) {
    return handleError(err, res, req, "listSlots");
  }
};

export const updateSlot = async (req, res) => {
  try {
    await assertSlotOwner(req.db, req.params.doctorId, req.user);
    const slot = await doctorService.updateSlot(
      req.db,
      req.params.doctorId,
      req.params.slotId,
      req.body,
    );
    return res.json({ slot });
  } catch (err) {
    return handleError(err, res, req, "updateSlot");
  }
};

export const deleteSlot = async (req, res) => {
  try {
    await assertSlotOwner(req.db, req.params.doctorId, req.user);
    await doctorService.deleteSlot(
      req.db,
      req.params.doctorId,
      req.params.slotId,
    );
    return res.status(204).send();
  } catch (err) {
    return handleError(err, res, req, "deleteSlot");
  }
};

// ─── Patient Reports (stub) ───────────────────────────────────────────────────

export const getPatientReports = async (req, res) => {
  try {
    const doctor = await doctorService.getDoctorById(
      req.db,
      req.params.doctorId,
    );
    if (doctor.user_id !== req.user.id)
      return res.status(403).json({ error: "forbidden" });
    return res.json({
      reports: [],
      message: "patient_management_service_not_yet_integrated",
    });
  } catch (err) {
    return handleError(err, res, req, "getPatientReports");
  }
};
