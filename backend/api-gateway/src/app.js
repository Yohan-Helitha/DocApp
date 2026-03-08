const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const env = require('./config/environment');
const logger = require('./config/logger');

const app = express();

// Enable CORS for local frontend testing. For production restrict origins.
app.use(cors());

app.use(express.json());

// Attach logger to request for handlers
app.use((req, res, next) => {
  req.log = logger;
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
      logger.info(
        {
          method: req.method,
          path: req.originalUrl
        },
        'Proxying request to auth-service'
      );

      // If body is present (express.json consumed it), forward it to target
      // so POST/PUT requests are proxied correctly.
      if (req.body && Object.keys(req.body).length) {
        const bodyData = JSON.stringify(req.body);
        // ensure content-type and length headers are set on proxied request
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onError(err, req, res) {
      logger.error({ err }, 'Error proxying request to auth-service');
      if (!res.headersSent) {
        res.status(502).json({ error: 'auth_service_unavailable' });
      }
    }
  })
);

module.exports = app;
