import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const getEnv = (name, defaultValue) => process.env[name] || defaultValue;

// Helper: try to read auth-service .env and extract JWT_SECRET if not supplied
const resolveJwtSecretFromAuthService = () => {
  try {
    const authEnvPath = path.resolve(__dirname, '../../../auth-service/.env');
    if (!fs.existsSync(authEnvPath)) return null;
    const content = fs.readFileSync(authEnvPath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (key === 'JWT_SECRET' && val) return val.replace(/(^"|"$)/g, '');
    }
  } catch (e) {
    // ignore failures
  }
  return null;
};

const jwtFromEnv = process.env.JWT_SECRET || null;
const jwtFromAuthEnv = jwtFromEnv ? jwtFromEnv : resolveJwtSecretFromAuthService();

export default {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: Number(getEnv('PORT', '4010')),
  DATABASE_URL: getEnv('DATABASE_URL', ''),
  PGHOST: getEnv('PGHOST', 'localhost'),
  PGPORT: Number(getEnv('PGPORT', '5432')),
  PGUSER: getEnv('PGUSER', 'postgres'),
  PGPASSWORD: getEnv('PGPASSWORD', 'postgres'),
  PGDATABASE: getEnv('PGDATABASE', 'telemeddb'),
  JWT_SECRET: jwtFromAuthEnv || 'change-me',
  AUTH_JWKS_URL: getEnv('AUTH_JWKS_URL', 'http://localhost:4001/.well-known/jwks.json'),
};
