import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import authAdminRs256 from "../middleware/authAdminRs256.js";
import {
  validateCreateDoctor,
  validateAddSlot,
} from "../validation/doctorValidation.js";
import * as doctorController from "../controllers/doctorController.js";

const router = express.Router();

// ─── Doctor profiles ──────────────────────────────────────────────────────────
router.post(
  "/api/v1/doctors",
  authMiddleware,
  validateCreateDoctor,
  doctorController.createDoctor,
);
router.get("/api/v1/doctors", authMiddleware, doctorController.listDoctors);
router.get(
  "/api/v1/doctors/:doctorId",
  authMiddleware,
  doctorController.getDoctorById,
);
router.put(
  "/api/v1/doctors/:doctorId",
  authMiddleware,
  doctorController.updateDoctor,
);
router.put(
  "/api/v1/doctors/:doctorId/verification-status",
  authAdminRs256,
  doctorController.setVerificationStatus,
);

// ─── Availability slots ───────────────────────────────────────────────────────
router.post(
  "/api/v1/doctors/:doctorId/availability-slots",
  authMiddleware,
  validateAddSlot,
  doctorController.addSlot,
);
router.get(
  "/api/v1/doctors/:doctorId/availability-slots",
  authMiddleware,
  doctorController.listSlots,
);
router.get(
  "/api/v1/doctors/:doctorId/availability-slots/:slotId",
  authMiddleware,
  doctorController.getSlotById,
);
router.put(
  "/api/v1/doctors/:doctorId/availability-slots/:slotId",
  authMiddleware,
  doctorController.updateSlot,
);
router.delete(
  "/api/v1/doctors/:doctorId/availability-slots/:slotId",
  authMiddleware,
  doctorController.deleteSlot,
);

// ─── Patient reports stub ─────────────────────────────────────────────────────
router.get(
  "/api/v1/doctors/:doctorId/patients/:patientId/reports",
  authMiddleware,
  doctorController.getPatientReports,
);

export default router;
