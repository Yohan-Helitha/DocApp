import 'dotenv/config';

const getEnv = (name, defaultValue) => process.env[name] || defaultValue;

export default {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  // Auth service listens on 4001 by default; API Gateway remains on 4000.
  PORT: Number(getEnv('PORT', '4001')),
  DATABASE_URL: getEnv('DATABASE_URL', ''),
  PGHOST: getEnv('PGHOST', 'localhost'),
  PGPORT: Number(getEnv('PGPORT', '5432')),
  PGUSER: getEnv('PGUSER', 'postgres'),
  PGPASSWORD: getEnv('PGPASSWORD', 'postgres'),
  PGDATABASE: getEnv('PGDATABASE', 'authdb'),
  JWT_SECRET: getEnv('JWT_SECRET', ''),
  // RSA key paths (dev defaults)
  AUTH_PRIVATE_KEY_PATH: getEnv('AUTH_PRIVATE_KEY_PATH', './keys/private.pem'),
  AUTH_PUBLIC_KEY_PATH: getEnv('AUTH_PUBLIC_KEY_PATH', './keys/public.pem'),
  JWKS_PATH: getEnv('JWKS_PATH', '/.well-known/jwks.json'),
  BCRYPT_SALT_ROUNDS: Number(getEnv('BCRYPT_SALT_ROUNDS', '10')),
  LOG_LEVEL: getEnv('LOG_LEVEL', 'info')
};
