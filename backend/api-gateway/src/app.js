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

  // Extract Identity from JWT if present
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const payloadBase64 = token.split('.')[1];
      if (payloadBase64) {
        // Use 'base64url' decoding (Node 14+) for robust JWT support
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString());
        // Standard JWT properties: 'sub' (User ID) and 'role'
        const userId = payload.sub || payload.userId;
        const userRole = payload.role;

        if (userId) {
          req.headers['x-user-id'] = userId;
          if (userRole) req.headers['x-user-role'] = userRole;
        }
      }
    } catch (e) {
      logger.warn('Failed to decode JWT in gateway identity extractor');
    }
  }

  next();
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "api-gateway", env: env.NODE_ENV });
});

// PayHere return/cancel URLs must typically use the same allowed domain/app
// as notify_url (domain security). These endpoints are used as stable targets
// (e.g., via ngrok) and then redirect the user back to the local SPA.
const isAllowedRedirectTarget = (targetUrl) => {
  try {
    const url = new URL(targetUrl);
    const protocolAllowed = url.protocol === 'http:' || url.protocol === 'https:';
    if (!protocolAllowed) return false;

    const allowedHosts = String(env.PAYHERE_RETURN_TO_ALLOWLIST || '')
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean);
    if (allowedHosts.length === 0) return false;

    return allowedHosts.includes(String(url.hostname || '').toLowerCase());
  } catch {
    return false;
  }
};

const buildRedirectWithQuery = (baseUrl, query) => {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (!key || key === 'to') return;
    if (value == null) return;
    params.append(key, String(value));
  });

  const qs = params.toString();
  if (!qs) return baseUrl;
  const separator = baseUrl.includes('?') ? '&' : '?';
  return baseUrl + separator + qs;
};

app.get('/payhere/return', (req, res) => {
  const to = String(req.query?.to || '').trim() || String(env.PAYHERE_DEFAULT_RETURN_TO || '').trim();
  if (to && isAllowedRedirectTarget(to)) {
    return res.redirect(302, buildRedirectWithQuery(to, req.query));
  }
  return res.redirect(302, buildRedirectWithQuery('/#/payments/return', req.query));
});

app.get('/payhere/cancel', (req, res) => {
  const to = String(req.query?.to || '').trim() || String(env.PAYHERE_DEFAULT_CANCEL_TO || '').trim();
  if (to && isAllowedRedirectTarget(to)) {
    return res.redirect(302, buildRedirectWithQuery(to, req.query));
  }
  return res.redirect(302, buildRedirectWithQuery('/#/payments/cancel', req.query));
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
      if (req.headers['x-user-id']) proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
      if (req.headers['x-user-role']) proxyReq.setHeader('x-user-role', req.headers['x-user-role']);

      logger.info(
        {
          method: req.method,
          path: req.originalUrl,
        },
        "Proxying request to auth-service",
      );
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

// Proxy admin routes to admin-management-service.
app.use(
  "/api/v1/admin",
  createProxyMiddleware({
    target: env.ADMIN_SERVICE_URL,
    changeOrigin: false,
    logProvider: () => logger,
    onProxyReq(proxyReq, req) {
      logger.info(
        { method: req.method, path: req.originalUrl },
        "Proxying request to admin-management-service",
      );
    },
    onError(err, req, res) {
      logger.error(
        { err },
        "Error proxying request to admin-management-service",
      );
      if (!res.headersSent) {
        res.status(502).json({ error: "admin_service_unavailable" });
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

// Proxy payment routes to payment-service.
// In your gateway app.js, update the payment proxy:
app.use(
  '/api/v1/payments',
  createProxyMiddleware({
    target: env.PAYMENT_SERVICE_URL,
    changeOrigin: false,
    logProvider: () => logger,
    onProxyReq(proxyReq, req) {
      // Fix body forwarding for urlencoded POST requests
      if (req.body && Object.keys(req.body).length > 0) {
        const bodyData = new URLSearchParams(req.body).toString();
        proxyReq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
      logger.info(
        { method: req.method, path: req.originalUrl },
        'Proxying request to payment-service'
      );
    },
    onError(err, req, res) {
      logger.error({ err }, 'Error proxying request to payment-service');
      if (!res.headersSent) {
        res.status(502).json({ error: 'payment_service_unavailable' });
      }
    }
  })
);

// Proxy patient management routes to the patient-management-service
app.use(
  createProxyMiddleware('/api/v1/patients', {
    target: env.PATIENT_SERVICE_URL,
    changeOrigin: false,
    logProvider: () => logger,
    onProxyReq(proxyReq, req) {
      if (req.headers['x-user-id']) proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
      if (req.headers['x-user-role']) proxyReq.setHeader('x-user-role', req.headers['x-user-role']);

      logger.info(
        {
          method: req.method,
          path: req.originalUrl
        },
        'Proxying request to patient-management-service'
      );
    },
    onError(err, req, res) {
      logger.error({ err }, 'Error proxying request to patient-management-service');
      if (!res.headersSent) {
        res.status(502).json({ error: 'patient_service_unavailable' });
      }
    }
  })
);


// Proxy appointment routes to the patient-management-service (or appointment-service if separate)
app.use(
  createProxyMiddleware('/api/v1/appointments', {
    target: env.PATIENT_SERVICE_URL,
    changeOrigin: false,
    logProvider: () => logger,
    onProxyReq(proxyReq, req) {
      logger.info(
        {
          method: req.method,
          path: req.originalUrl
        },
        'Proxying request to appointments'
      );
    },
    onError(err, req, res) {
      logger.error({ err }, 'Error proxying request to appointments');
      if (!res.headersSent) {
        res.status(502).json({ error: 'appointment_service_unavailable' });
      }
    }
  })
);


// Proxy reports routes to the patient-management-service
app.use(
  createProxyMiddleware('/api/v1/reports', {
    target: env.PATIENT_SERVICE_URL,
    changeOrigin: false,
    logProvider: () => logger,
    onProxyReq(proxyReq, req) {
      if (req.headers['x-user-id']) proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
      if (req.headers['x-user-role']) proxyReq.setHeader('x-user-role', req.headers['x-user-role']);

      logger.info(
        {
          method: req.method,
          path: req.originalUrl
        },
        'Proxying request to reports'
      );
    },
    onError(err, req, res) {
      logger.error({ err }, 'Error proxying request to reports');
      if (!res.headersSent) {
        res.status(502).json({ error: 'reports_service_unavailable' });
      }
    }
  })
);


// Proxy notifications routes to the notification-service
app.use(
  '/api/v1/notifications',
  createProxyMiddleware({
    target: env.NOTIFICATION_SERVICE_URL,
    changeOrigin: false,
    logProvider: () => logger,
    onProxyReq(proxyReq, req) {
      if (req.headers['x-user-id']) proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
      if (req.headers['x-user-role']) proxyReq.setHeader('x-user-role', req.headers['x-user-role']);

      logger.info(
        {
          method: req.method,
          path: req.originalUrl
        },
        'Proxying request to notification-service'
      );
    },
    onError(err, req, res) {
      logger.error({ err }, 'Error proxying request to notification-service');
      if (!res.headersSent) {
        res.status(502).json({ error: 'notification_service_unavailable' });
      }
    }
  })
);

// Proxy uploads to the patient-management-service
app.use(
  '/uploads',
  createProxyMiddleware({
    target: env.PATIENT_SERVICE_URL,
    changeOrigin: false,
    logProvider: () => logger,
    onProxyReq(proxyReq, req) {
      logger.info({ path: req.originalUrl }, 'Proxying static file request to patient-service');
    },
    onError(err, req, res) {
      if (!res.headersSent) {
        res.status(502).json({ error: 'file_storage_unavailable' });
      }
    }
  })
);

export default app;
