import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import env from './config/environment.js';
import logger from './config/logger.js';

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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', env: env.NODE_ENV });
});

// Proxy all auth routes to the auth-service.
// This keeps the frontend talking only to the gateway while the
// auth microservice owns the actual auth logic.
app.use(
  '/api/v1/auth',
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
          path: req.originalUrl
        },
        'Proxying request to auth-service'
      );
    },
    onError(err, req, res) {
      logger.error({ err }, 'Error proxying request to auth-service');
      if (!res.headersSent) {
        res.status(502).json({ error: 'auth_service_unavailable' });
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
