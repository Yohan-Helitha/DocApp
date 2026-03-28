import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { validateCreatePrescription } from "../validation/doctorValidation.js";
import * as prescriptionController from "../controllers/prescriptionController.js";

const router = express.Router();

router.post(
  "/api/v1/doctors/:doctorId/prescriptions",
  authMiddleware,
  validateCreatePrescription,
  prescriptionController.createPrescription,
);
router.get(
  "/api/v1/doctors/:doctorId/prescriptions",
  authMiddleware,
  prescriptionController.listPrescriptions,
);
router.get(
  "/api/v1/doctors/:doctorId/prescriptions/:prescriptionId",
  authMiddleware,
  prescriptionController.getPrescriptionById,
);

export default router;
