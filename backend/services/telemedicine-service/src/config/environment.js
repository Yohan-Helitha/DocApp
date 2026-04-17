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
  // Used to validate appointment status before session creation.
  // In k8s, api-gateway is reachable via service DNS.
  API_GATEWAY_URL: getEnv(
    'API_GATEWAY_URL',
    getEnv('NODE_ENV', 'development') === 'development'
      ? 'http://localhost:4000'
      : 'http://api-gateway:4000',
  ),
  // Optional shared secret for HS256 verification (must match auth-service JWT_SECRET)
  JWT_SECRET: getEnv('JWT_SECRET', ''),
  // Path to auth-service public key for RS256 verification
  AUTH_PUBLIC_KEY_PATH: getEnv('AUTH_PUBLIC_KEY_PATH', './keys/public.pem'),
  NOTIFICATION_SERVICE_URL: getEnv(
    'NOTIFICATION_SERVICE_URL',
    'http://notification-service:6000',
  ),
};
