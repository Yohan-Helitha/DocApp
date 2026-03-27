import 'dotenv/config';
const getEnv = (name, defaultValue) => process.env[name] || defaultValue;

export default {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: Number(getEnv('PORT', '4010')),
  DATABASE_URL: getEnv('DATABASE_URL', ''),
  PGHOST: getEnv('PGHOST', 'localhost'),
  PGPORT: Number(getEnv('PGPORT', '5432')),
  PGUSER: getEnv('PGUSER', 'postgres'),
  PGPASSWORD: getEnv('PGPASSWORD', 'postgres'),
  PGDATABASE: getEnv('PGDATABASE', 'telemeddb'),
  JITSI_BASE_URL: getEnv('JITSI_BASE_URL', 'https://meet.jit.si'),
  // Optional shared secret for HS256 verification (must match auth-service JWT_SECRET)
  JWT_SECRET: getEnv('JWT_SECRET', ''),
  // Path to auth-service public key for RS256 verification
  AUTH_PUBLIC_KEY_PATH: getEnv('AUTH_PUBLIC_KEY_PATH', './keys/public.pem'),
};
