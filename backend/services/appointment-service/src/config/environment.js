import "dotenv/config";

const getEnv = (name, defaultValue) => process.env[name] || defaultValue;

export default {
  NODE_ENV: getEnv("NODE_ENV", "development"),
  PORT: Number(getEnv("PORT", "4003")),
  DATABASE_URL: getEnv("DATABASE_URL", ""),
  PGHOST: getEnv("PGHOST", "localhost"),
  PGPORT: Number(getEnv("PGPORT", "5432")),
  PGUSER: getEnv("PGUSER", "postgres"),
  PGPASSWORD: getEnv("PGPASSWORD", "postgres"),
  PGDATABASE: getEnv("PGDATABASE", "appointmentsdb"),
  JWT_SECRET: getEnv("JWT_SECRET", "change-me"),
  DOCTOR_SERVICE_URL: getEnv(
    "DOCTOR_SERVICE_URL",
    "http://doctor-management-service:4002",
  ),
  NOTIFICATION_SERVICE_URL: getEnv(
    "NOTIFICATION_SERVICE_URL",
    "http://notification-service:6000",
  ),
  PATIENT_SERVICE_URL: getEnv(
    "PATIENT_SERVICE_URL",
    "http://patient-management-service:4005",
  ),
  LOG_LEVEL: getEnv("LOG_LEVEL", "info"),
  INTERNAL_SECRET: getEnv("INTERNAL_SECRET", "change-me-internal"),
};
