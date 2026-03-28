import express from "express";
import cors from "cors";
import env from "./config/environment.js";
import logger from "./config/logger.js";
import db from "./config/db.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach logger and db pool to every request so controllers access via req.log / req.db
app.use((req, res, next) => {
  req.log = logger;
  req.db = db;
  next();
});

app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({
      status: "ok",
      service: "appointment-service",
      env: env.NODE_ENV,
    });
  } catch (err) {
    logger.error(err, "healthcheck failed");
    res.status(500).json({ status: "error" });
  }
});

app.use(appointmentRoutes);

export default app;
