import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import env from "./config/environment.js";
import logger from "./config/logger.js";

const app = express();

// Enable CORS for local frontend testing. For production restrict origins.
app.use(cors());

// NOTE: We intentionally do NOT use express.json/urlencoded here.
// The gateway just proxies raw requests; the auth-service parses JSON.
// Accept URL-encoded bodies (forms) too — frontend may submit form-encoded data
app.use(express.urlencoded({ extended: true }));

// Attach logger to request for handlers
app.use((req, res, next) => {
  req.log = logger;
  next();
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "api-gateway", env: env.NODE_ENV });
});

// Proxy all auth routes to the auth-service.
// This keeps the frontend talking only to the gateway while the
// auth microservice owns the actual auth logic.
app.use(
  "/api/v1/auth",
  createProxyMiddleware({
    target: env.AUTH_SERVICE_URL,
    changeOrigin: false,
    // Preserve original path (/api/v1/auth/...) so the auth-service
    // routes match exactly as defined.
    logProvider: () => logger,
    onProxyReq(proxyReq, req) {
      logger.info(
        {
          method: req.method,
          path: req.originalUrl,
        },
        "Proxying request to auth-service",
      );

      // We don't touch the body here; http-proxy-middleware streams
      // the original request (including JSON) directly to auth-service.
    },
    onError(err, req, res) {
      logger.error({ err }, "Error proxying request to auth-service");
      if (!res.headersSent) {
        res.status(502).json({ error: "auth_service_unavailable" });
      }
    },
  }),
);

// Proxy all doctor routes to doctor-management-service.
app.use(
  "/api/v1/doctors",
  createProxyMiddleware({
    target: env.DOCTOR_SERVICE_URL,
    changeOrigin: false,
    logProvider: () => logger,
    onProxyReq(proxyReq, req) {
      logger.info(
        { method: req.method, path: req.originalUrl },
        "Proxying request to doctor-management-service",
      );
    },
    onError(err, req, res) {
      logger.error(
        { err },
        "Error proxying request to doctor-management-service",
      );
      if (!res.headersSent) {
        res.status(502).json({ error: "doctor_service_unavailable" });
      }
    },
  }),
);

// Proxy prescription routes to doctor-management-service.
app.use(
  "/api/v1/prescriptions",
  createProxyMiddleware({
    target: env.DOCTOR_SERVICE_URL,
    changeOrigin: false,
    logProvider: () => logger,
    onProxyReq(proxyReq, req) {
      logger.info(
        { method: req.method, path: req.originalUrl },
        "Proxying request to doctor-management-service (prescriptions)",
      );
    },
    onError(err, req, res) {
      logger.error(
        { err },
        "Error proxying request to doctor-management-service",
      );
      if (!res.headersSent) {
        res.status(502).json({ error: "doctor_service_unavailable" });
      }
    },
  }),
);

// Proxy all appointment routes to appointment-service.
app.use(
  "/api/v1/appointments",
  createProxyMiddleware({
    target: env.APPOINTMENT_SERVICE_URL,
    changeOrigin: false,
    logProvider: () => logger,
    onProxyReq(proxyReq, req) {
      logger.info(
        { method: req.method, path: req.originalUrl },
        "Proxying request to appointment-service",
      );
    },
    onError(err, req, res) {
      logger.error({ err }, "Error proxying request to appointment-service");
      if (!res.headersSent) {
        res.status(502).json({ error: "appointment_service_unavailable" });
      }
    },
  }),
);

// Proxy telemedicine routes to telemedicine-service.
app.use(
  "/api/v1/telemedicine",
  createProxyMiddleware({
    target: env.TELEMEDICINE_SERVICE_URL,
    changeOrigin: false,
    logProvider: () => logger,
    onProxyReq(proxyReq, req) {
      logger.info(
        {
          method: req.method,
          path: req.originalUrl,
        },
        "Proxying request to telemedicine-service",
      );
    },
    onError(err, req, res) {
      logger.error({ err }, "Error proxying request to telemedicine-service");
      if (!res.headersSent) {
        res.status(502).json({ error: "telemedicine_service_unavailable" });
      }
    },
  }),
);

// Proxy AI symptom checker routes to ai-symptom-checker-service.
app.use(
  "/api/v1/symptom-checker",
  createProxyMiddleware({
    target: env.SYMPTOM_CHECKER_SERVICE_URL,
    changeOrigin: false,
    logProvider: () => logger,
    onProxyReq(proxyReq, req) {
      logger.info(
        {
          method: req.method,
          path: req.originalUrl,
        },
        "Proxying request to ai-symptom-checker-service",
      );
    },
    onError(err, req, res) {
      logger.error(
        { err },
        "Error proxying request to ai-symptom-checker-service",
      );
      if (!res.headersSent) {
        res.status(502).json({ error: "symptom_checker_service_unavailable" });
      }
    },
  }),
);

export default app;
