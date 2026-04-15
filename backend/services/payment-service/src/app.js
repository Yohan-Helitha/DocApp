import express from 'express';
import cors from 'cors';
import env from './config/environment.js';
import logger from './config/logger.js';
import db from './config/db.js';
import paymentRoutes from './routes/paymentRoutes.js';

const app = express();

const corsOrigin = String(env.CORS_ORIGIN || '').trim();
app.use(
  cors(
    corsOrigin
      ? {
          origin: corsOrigin.split(',').map((s) => s.trim()).filter(Boolean),
          methods: ['GET', 'POST', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization'],
          credentials: true
        }
      : undefined
  )
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  req.log = logger;
  req.db = db;
  next();
});

app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', env: env.NODE_ENV });
  } catch (err) {
    req.log.error(err, 'payment healthcheck failed');
    res.status(500).json({ status: 'error' });
  }
});

app.use('/api/v1/payments', paymentRoutes);

export default app;
