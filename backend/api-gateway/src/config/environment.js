import "dotenv/config";

const getEnv = (name, defaultValue) => process.env[name] || defaultValue;

export default {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: Number(getEnv('PORT', '4000')),
  // Gateway talks to auth-service on its internal port 4001
  AUTH_SERVICE_URL: getEnv('AUTH_SERVICE_URL', 'http://auth-service:4001'),
  // Gateway talks to telemedicine service on its internal port 4010
  TELEMEDICINE_SERVICE_URL: getEnv('TELEMEDICINE_SERVICE_URL', 'http://telemedicine:4010'),
  // Gateway talks to AI symptom checker service on its internal port 4009
  SYMPTOM_CHECKER_SERVICE_URL: getEnv(
    'SYMPTOM_CHECKER_SERVICE_URL',
    'http://ai-symptom-checker-service:4009',
  ),
  DOCTOR_SERVICE_URL: getEnv(
    "DOCTOR_SERVICE_URL",
    "http://doctor-management-service:4002",
  ),
  APPOINTMENT_SERVICE_URL: getEnv(
    "APPOINTMENT_SERVICE_URL",
    "http://appointment-service:4003",
  ),
  LOG_LEVEL: getEnv("LOG_LEVEL", "info"),
};
