const env = require('./src/config/environment');
const app = require('./src/app');
const logger = require('./src/config/logger');

const port = env.PORT || 4000;

const server = app.listen(port, () => {
  logger.info({ port }, 'API Gateway listening');
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down API Gateway');
  server.close(() => process.exit(0));
});
