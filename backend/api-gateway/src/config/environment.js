require('dotenv').config();

const getEnv = (name, defaultValue) => process.env[name] || defaultValue;

module.exports = {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: Number(getEnv('PORT', '4000')),
  // Gateway talks to auth-service on its internal port 4001
  AUTH_SERVICE_URL: getEnv('AUTH_SERVICE_URL', 'http://auth-service:4001'),
  LOG_LEVEL: getEnv('LOG_LEVEL', 'info')
};
