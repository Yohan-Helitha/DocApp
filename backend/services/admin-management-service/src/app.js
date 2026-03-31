import express from 'express';
import cors from 'cors';
import env from './config/environment.js';
import logger from './config/logger.js';
import db from './config/db.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach logger and db to request for handlers
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
    logger.error(err, 'healthcheck failed');
    res.status(500).json({ status: 'error' });
  }
});

// Mount admin routes
app.use(adminRoutes);

export default app;
