import pkg from 'pg';
import env from './environment.js';

const { Pool } = pkg;

const connectionString =
  env.DATABASE_URL ||
  `postgresql://${env.PGUSER}:${env.PGPASSWORD}@${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE}`;

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
