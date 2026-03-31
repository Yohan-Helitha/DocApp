import pkg from 'pg';
import env from './environment.js';

const { Pool } = pkg;

// In production (Kubernetes), prefer explicit PG* env vars so that
// bundled .env files or DATABASE_URL defaults do not override the
// cluster configuration.
const connectionString =
  env.NODE_ENV === 'production'
    ? `postgresql://${env.PGUSER}:${env.PGPASSWORD}@${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE}`
    : env.DATABASE_URL || `postgresql://${env.PGUSER}:${env.PGPASSWORD}@${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE}`;

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000
});

export { pool };
export default {
  pool,
  query: (text, params) => pool.query(text, params)
};
