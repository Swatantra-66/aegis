const winston = require('winston');

// Determine log level — must not depend on config/index.js to avoid circular dependency
const LOG_LEVEL = process.env.LOG_LEVEL || 'debug';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Custom format for console output in development.
 */
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} ${level}: ${message} ${metaStr}`;
  })
);

/**
 * Structured JSON format for production.
 */
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Winston logger instance.
 * - Development: colorized console output
 * - Production: structured JSON
 */
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: NODE_ENV === 'production' ? prodFormat : devFormat,
  defaultMeta: { service: 'iam-portal' },
  transports: [
    new winston.transports.Console(),
  ],
  // Don't exit on uncaught exceptions handled by the logger
  exitOnError: false,
});

// Add file transport in production
if (NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    })
  );
}

module.exports = logger;
