const { Pool } = require('pg');
const env = require('./environment');

const connectionString = env.DATABASE_URL || `postgresql://${env.PGUSER}:${env.PGPASSWORD}@${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE}`;

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params)
};
