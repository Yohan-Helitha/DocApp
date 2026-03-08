require('dotenv').config();

const getEnv = (name, defaultValue) => process.env[name] || defaultValue;

module.exports = {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  // Auth service listens on 4001 by default; API Gateway remains on 4000.
  PORT: Number(getEnv('PORT', '4001')),
  DATABASE_URL: getEnv('DATABASE_URL', ''),
  PGHOST: getEnv('PGHOST', 'localhost'),
  PGPORT: Number(getEnv('PGPORT', '5432')),
  PGUSER: getEnv('PGUSER', 'postgres'),
  PGPASSWORD: getEnv('PGPASSWORD', 'postgres'),
  PGDATABASE: getEnv('PGDATABASE', 'authdb'),
  JWT_SECRET: getEnv('JWT_SECRET', 'change-me'),
  BCRYPT_SALT_ROUNDS: Number(getEnv('BCRYPT_SALT_ROUNDS', '10')),
  LOG_LEVEL: getEnv('LOG_LEVEL', 'info')
};
