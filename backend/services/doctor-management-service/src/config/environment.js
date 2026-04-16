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
  LOG_LEVEL: getEnv("LOG_LEVEL", "info"),
};
