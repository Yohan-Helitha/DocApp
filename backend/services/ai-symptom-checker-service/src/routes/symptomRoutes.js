import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import requirePatient from "../middleware/requirePatient.js";
import * as symptomController from "../controllers/symptomController.js";

const router = express.Router();

router.post(
  "/api/v1/symptom-checker/analyze",
  authMiddleware,
  requirePatient,
  symptomController.analyze,
);

router.get(
  "/api/v1/symptom-checker/specialties/recommendations",
  authMiddleware,
  requirePatient,
  symptomController.specialtyRecommendations,
);

router.get(
  "/api/v1/symptom-checker/history/:patientId",
  authMiddleware,
  requirePatient,
  symptomController.history,
);

router.post(
  "/api/v1/symptom-checker/feedback",
  authMiddleware,
  requirePatient,
  symptomController.feedback,
);

export default router;
