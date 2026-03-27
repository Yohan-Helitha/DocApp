import 'dotenv/config';

const getEnv = (name, defaultValue) => process.env[name] || defaultValue;

export default {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: Number(getEnv('PORT', '4000')),
  // Gateway talks to auth-service on its internal port 4001
  AUTH_SERVICE_URL: getEnv('AUTH_SERVICE_URL', 'http://auth-service:4001'),
  // Gateway talks to telemedicine service on its internal port 4010
  TELEMEDICINE_SERVICE_URL: getEnv('TELEMEDICINE_SERVICE_URL', 'http://telemedicine:4010'),
  LOG_LEVEL: getEnv('LOG_LEVEL', 'info')
};
