import "dotenv/config";

const getEnv = (name, defaultValue) => process.env[name] || defaultValue;

export default {
  NODE_ENV: getEnv("NODE_ENV", "development"),
  PORT: Number(getEnv("PORT", "4002")),
  DATABASE_URL: getEnv("DATABASE_URL", ""),
  PGHOST: getEnv("PGHOST", "localhost"),
  PGPORT: Number(getEnv("PGPORT", "5432")),
  PGUSER: getEnv("PGUSER", "postgres"),
  PGPASSWORD: getEnv("PGPASSWORD", "postgres"),
  PGDATABASE: getEnv("PGDATABASE", "doctorsdb"),
  JWT_SECRET: getEnv("JWT_SECRET", "change-me"),
  AUTH_PUBLIC_KEY_PATH: getEnv("AUTH_PUBLIC_KEY_PATH", ""),
  INTERNAL_API_KEY: getEnv("INTERNAL_API_KEY", ""),
  PATIENT_SERVICE_URL: getEnv(
    "PATIENT_SERVICE_URL",
    "http://patient-management-service:6001",
  ),
  INTERNAL_SECRET: getEnv("INTERNAL_SECRET", "change-me"),
  LOG_LEVEL: getEnv("LOG_LEVEL", "info"),
};
