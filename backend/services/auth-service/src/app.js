const express = require('express');
const env = require('./config/environment');
const logger = require('./config/logger');
const db = require('./config/db');
const cors = require('cors');

const app = express();

// Enable CORS for local frontend testing. For production restrict origins.
app.use(cors());

app.use(express.json());

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
app.use(require('./routes/authRoutes'));

module.exports = app;
