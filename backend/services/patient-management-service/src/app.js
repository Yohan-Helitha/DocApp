import express from "express";
import cors from "cors";
import morgan from "morgan";
import patientRoutes from "./routes/patientRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import historyRoutes from "./routes/historyRoutes.js";
import prescriptionRoutes from "./routes/prescriptionRoutes.js";
import internalAuthMiddleware from "./middleware/internalAuthMiddleware.js";
import { getPatientByUserId } from "./controllers/patientController.js";
import { getMedicalReports } from "./controllers/reportController.js";

const app = express();

// Health Check (Top level, no auth)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", service: "Patient Management Service" });
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(morgan("dev"));

// Static files (uploads) - Served from the root for microservice alignment
app.use(express.static("uploads"));

// Internal service-to-service route (no user JWT — uses X-Internal-Secret header)
app.get(
  "/api/v1/patients/by-user/:userId",
  internalAuthMiddleware,
  getPatientByUserId,
);

// Internal: service-to-service medical reports access (for doctor portal proxy)
app.get(
  "/api/v1/internal/patients/:patientId/medical-reports",
  internalAuthMiddleware,
  getMedicalReports,
);

// Routes - Internal microservice prefix
const apiPrefix = "/api/v1/patients";
app.use(apiPrefix, patientRoutes);
app.use(apiPrefix, reportRoutes);
app.use(apiPrefix, historyRoutes);
app.use(apiPrefix, prescriptionRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
  });
});

export default app;
