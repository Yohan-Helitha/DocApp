import express from 'express';
import env from './config/environment.js';
import logger from './config/logger.js';
import db from './config/db.js';
import cors from 'cors';
import telemedicineRoutes from './routes/telemedicineRoutes.js';

const app = express();

app.use(cors());
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
    req.log.error(err, 'healthcheck failed');
    res.status(500).json({ status: 'error' });
  }
});

app.use(telemedicineRoutes);

export default app;
