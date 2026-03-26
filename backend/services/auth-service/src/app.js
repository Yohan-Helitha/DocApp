import express from 'express';
import env from './config/environment.js';
import logger from './config/logger.js';
import db from './config/db.js';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';

const app = express();

// Enable CORS for local frontend testing. For production restrict origins.
app.use(cors());

app.use(express.json());
// Accept URL-encoded bodies (forms) as well
app.use(express.urlencoded({ extended: true }));

// Attach logger and db to request for handlers
app.use((req, res, next) => {
  req.log = logger;
  req.db = db;
  next();
});

app.get('/health', async (req, res) => {
  try {
    // simple DB check
    await db.query('SELECT 1');
    res.json({ status: 'ok', env: env.NODE_ENV });
  } catch (err) {
    req.log.error(err, 'healthcheck failed');
    res.status(500).json({ status: 'error' });
  }
});

// Mount auth routes
app.use(authRoutes);

export default app;
