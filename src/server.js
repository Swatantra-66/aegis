const config = require('./config/index');
const logger = require('./utils/logger');
const app = require('./app');
const db = require('./config/database');
const redisModule = require('./config/redis');
const { migrate } = require('./db/migrate');

/**
 * Server entry point.
 * Connects to services, runs migrations, starts HTTP server.
 * Registers graceful shutdown handlers.
 */

const startServer = async () => {
  try {
    // 1. Verify database connection
    const dbHealthy = await db.healthCheck();
    if (!dbHealthy) {
      throw new Error('Cannot connect to PostgreSQL');
    }
    logger.info(`PostgreSQL connected to ${config.db.host}:${config.db.port}/${config.db.name}`);

    // 2. Verify Redis connection
    const redisHealthy = await redisModule.healthCheck();
    if (!redisHealthy) {
      throw new Error('Cannot connect to Redis');
    }
    logger.info('Redis connected');

    // 3. Run pending migrations
    await migrate();

    // 4. Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`${config.app.name} running on port ${config.port} (${config.env})`);
      logger.info(`API Docs: ${config.app.url}/api/docs`);
      logger.info(`Health:   ${config.app.url}/health`);
    });

    // Graceful Shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Close database pool
          await db.close();
          // Close Redis connection
          await redisModule.close();

          logger.info('Graceful shutdown complete');
          process.exit(0);
        } catch (err) {
          logger.error('Error during shutdown:', err);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection:', reason);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    return server;
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

module.exports = startServer;
