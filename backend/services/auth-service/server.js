const env = require('./src/config/environment');
const app = require('./src/app');
const logger = require('./src/config/logger');

const port = env.PORT || 4000;

const server = app.listen(port, () => {
  logger.info({ port }, 'Auth service listening');
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down');
  server.close(() => process.exit(0));
});
