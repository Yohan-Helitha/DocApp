import patientService from "../services/patientService.js";
import { Patient } from "../models/index.js";

export const getPatientByUserId = async (req, res) => {
  try {
    const patient = await Patient.findOne({
      where: { user_id: req.params.userId },
      attributes: [
        "id",
        "user_id",
        "first_name",
        "last_name",
        "email",
        "phone",
      ],
    });
    if (!patient) return res.status(404).json({ error: "patient_not_found" });
    return res.status(200).json({
      patient: {
        patient_id: patient.id,
        user_id: patient.user_id,
        full_name: `${patient.first_name} ${patient.last_name}`,
        email: patient.email,
        phone: patient.phone ?? null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createPatient = async (req, res) => {
  try {
    const newPatient = await patientService.createPatient(req.body, req.user);
    res.status(201).json(newPatient);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const getPatientById = async (req, res) => {
  try {
    const patient = await patientService.getPatientById(req.params.patientId);
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.status(200).json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updatePatient = async (req, res) => {
  try {
    const patient = await patientService.updatePatient(
      req.params.patientId,
      req.body,
    );
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.status(200).json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deletePatient = async (req, res) => {
  try {
    const patient = await patientService.deletePatient(req.params.patientId);
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.status(200).json({ message: "Patient deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
