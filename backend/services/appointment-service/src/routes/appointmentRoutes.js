import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { validateBookAppointment } from "../validation/appointmentValidation.js";
import * as appointmentController from "../controllers/appointmentController.js";

const router = express.Router();

// ─── IMPORTANT: Static/literal path segments MUST be declared before
//     /:appointmentId, otherwise Express treats "doctors" and "patients"
//     as appointment IDs.

// Doctor search (proxies to doctor-management-service)
router.get(
  "/api/v1/appointments/doctors/search",
  authMiddleware,
  appointmentController.searchDoctors,
);

// List appointments by patient
router.get(
  "/api/v1/appointments/patients/:patientId",
  authMiddleware,
  appointmentController.listByPatient,
);

// List appointments by doctor
router.get(
  "/api/v1/appointments/doctors/:doctorId",
  authMiddleware,
  appointmentController.listByDoctor,
);

// Book appointment
router.post(
  "/api/v1/appointments",
  authMiddleware,
  validateBookAppointment,
  appointmentController.bookAppointment,
);

// Get single appointment
router.get(
  "/api/v1/appointments/:appointmentId",
  authMiddleware,
  appointmentController.getAppointment,
);

// Reschedule appointment (patient only)
router.put(
  "/api/v1/appointments/:appointmentId",
  authMiddleware,
  appointmentController.updateAppointment,
);

// Cancel appointment
router.delete(
  "/api/v1/appointments/:appointmentId",
  authMiddleware,
  appointmentController.cancelAppointment,
);

// Force-set status (admin only)
router.put(
  "/api/v1/appointments/:appointmentId/status",
  authMiddleware,
  appointmentController.setStatus,
);

// Get appointment event history
router.get(
  "/api/v1/appointments/:appointmentId/events",
  authMiddleware,
  appointmentController.getAppointmentEvents,
);

// Doctor accept/reject decision
router.put(
  "/api/v1/appointments/:appointmentId/doctor-decision",
  authMiddleware,
  appointmentController.doctorDecision,
);

export default router;
