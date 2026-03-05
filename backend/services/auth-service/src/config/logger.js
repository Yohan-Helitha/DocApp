const pino = require('pino');

const isProd = process.env.NODE_ENV === 'production';

let logger;
if (!isProd) {
  logger = pino({ level: process.env.LOG_LEVEL || 'debug' }, pino.transport({ target: 'pino-pretty', options: { colorize: true } }));
} else {
  logger = pino({ level: process.env.LOG_LEVEL || 'info' });
}

module.exports = logger;
