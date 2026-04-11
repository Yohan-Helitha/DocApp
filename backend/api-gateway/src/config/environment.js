import 'dotenv/config';

const getEnv = (name, defaultValue) => process.env[name] || defaultValue;

export default {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: Number(getEnv('PORT', '4000')),
  // Service URLs for internal routing
  AUTH_SERVICE_URL: getEnv('AUTH_SERVICE_URL', 'http://auth-service:4001'),
  PATIENT_SERVICE_URL: getEnv('PATIENT_SERVICE_URL', 'http://patient-management-service:6001'),
  NOTIFICATION_SERVICE_URL: getEnv('NOTIFICATION_SERVICE_URL', 'http://notification-service:6000'),
  LOG_LEVEL: getEnv('LOG_LEVEL', 'info')
};
