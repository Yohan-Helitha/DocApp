import 'dotenv/config';

const getEnv = (name, defaultValue) => process.env[name] || defaultValue;

export default {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: Number(getEnv('PORT', '4006')),
  DATABASE_URL: getEnv('PAYMENT_DATABASE_URL', ''),
  PGHOST: getEnv('PAYMENT_PGHOST', 'localhost'),
  PGPORT: Number(getEnv('PAYMENT_PGPORT', '5432')),
  PGUSER: getEnv('PAYMENT_PGUSER', 'postgres'),
  PGPASSWORD: getEnv('PAYMENT_PGPASSWORD', 'postgres'),
  PGDATABASE: getEnv('PAYMENT_PGDATABASE', 'paymentdb'),
  LOG_LEVEL: getEnv('LOG_LEVEL', 'info'),
  PAYHERE_MERCHANT_ID: getEnv('PAYHERE_MERCHANT_ID', ''),
  PAYHERE_MERCHANT_SECRET: getEnv('PAYHERE_MERCHANT_SECRET', ''),
  PAYHERE_SANDBOX: getEnv('PAYHERE_SANDBOX', 'true') === 'true',
  PAYHERE_RETURN_URL: getEnv('PAYHERE_RETURN_URL', 'http://localhost:8081/#/payments/return'),
  PAYHERE_CANCEL_URL: getEnv('PAYHERE_CANCEL_URL', 'http://localhost:8081/#/payments/cancel'),
  PAYHERE_NOTIFY_URL: getEnv('PAYHERE_NOTIFY_URL', 'http://localhost:4006/api/v1/payments/notify'),
  CORS_ORIGIN: getEnv('CORS_ORIGIN', '')
};
