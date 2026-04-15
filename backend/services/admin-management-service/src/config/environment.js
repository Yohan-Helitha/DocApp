import 'dotenv/config';

const getEnv = (name, defaultValue) => process.env[name] || defaultValue;

export default {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  // Admin service listens on its own port; default 4008
  PORT: Number(getEnv('PORT', '4008')),
  DATABASE_URL: getEnv('DATABASE_URL', ''),
  PGHOST: getEnv('PGHOST', 'postgres'),
  PGPORT: Number(getEnv('PGPORT', '5432')),
  PGUSER: getEnv('PGUSER', 'postgres'),
  PGPASSWORD: getEnv('PGPASSWORD', 'postgres'),
  PGDATABASE: getEnv('PGDATABASE', 'authdb'),
  LOG_LEVEL: getEnv('LOG_LEVEL', 'info'),
  AUTH_SERVICE_BASE_URL: getEnv('AUTH_SERVICE_BASE_URL', 'http://auth-service:4001'),
  DOCTOR_SERVICE_BASE_URL: getEnv('DOCTOR_SERVICE_BASE_URL', 'http://doctor-management-service:4000'),
  PAYMENT_SERVICE_BASE_URL: getEnv('PAYMENT_SERVICE_BASE_URL', 'http://payment-service:4000'),
  INTERNAL_API_KEY: getEnv('INTERNAL_API_KEY', '')
};
