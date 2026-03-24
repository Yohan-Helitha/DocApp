import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pool from './src/config/db.js';

import notificationRoutes from './src/routes/notificationRoutes.js';
import attemptRoutes from './src/routes/attemptRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Test DB connection at startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected! Current time:', res.rows[0].now);
  }
});

// Main API Routes with v1 versioning as per SPEC
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/attempts', attemptRoutes);

const PORT = process.env.PORT || 6000;

app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
});