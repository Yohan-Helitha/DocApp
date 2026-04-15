import "dotenv/config";

const getEnv = (name, defaultValue) => process.env[name] || defaultValue;

export default {
  NODE_ENV: getEnv("NODE_ENV", "development"),
  PORT: Number(getEnv("PORT", "4009")),

  DATABASE_URL: getEnv("DATABASE_URL", ""),
  PGHOST: getEnv("PGHOST", "localhost"),
  PGPORT: Number(getEnv("PGPORT", "5432")),
  PGUSER: getEnv("PGUSER", "postgres"),
  PGPASSWORD: getEnv("PGPASSWORD", "postgres"),
  PGDATABASE: getEnv("PGDATABASE", "symptom_checker_db"),

  JWT_SECRET: getEnv("JWT_SECRET", "change-me"),
  AUTH_PUBLIC_KEY_PATH: getEnv("AUTH_PUBLIC_KEY_PATH", ""),

  GEMINI_API_KEY: getEnv("GEMINI_API_KEY", ""),
  GEMINI_MODEL: getEnv("GEMINI_MODEL", "gemini-2.5-flash"),

  DOCTOR_SERVICE_URL: getEnv(
    "DOCTOR_SERVICE_URL",
    "http://doctor-management-service:4002",
  ),

  LOG_LEVEL: getEnv("LOG_LEVEL", "info"),
};
