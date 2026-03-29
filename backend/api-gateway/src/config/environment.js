import "dotenv/config";

const getEnv = (name, defaultValue) => process.env[name] || defaultValue;

export default {
  NODE_ENV: getEnv("NODE_ENV", "development"),
  PORT: Number(getEnv("PORT", "4000")),
  // Gateway talks to each downstream service on its internal port
  AUTH_SERVICE_URL: getEnv("AUTH_SERVICE_URL", "http://auth-service:4001"),
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
