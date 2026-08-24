const { Pool } = require('pg');
const config = require('./index');
const logger = require('../utils/logger');

/**
 * PostgreSQL connection pool.
 * Uses a pool to efficiently manage database connections.
 */
const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Log pool errors (don't crash the app)
pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error:', err);
});

/**
 * Execute a SQL query using the connection pool.
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = async (text, params) => {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (config.env === 'development') {
    logger.debug('Executed query', {
      text: text.substring(0, 100),
      duration: `${duration}ms`,
      rows: result.rowCount,
    });
  }

  return result;
};

/**
 * Get a client from the pool for transactions.
 * IMPORTANT: Always release the client in a finally block.
 * @returns {Promise<import('pg').PoolClient>}
 */
const getClient = async () => {
  const client = await pool.connect();
  return client;
};

/**
 * Health check — verifies the database is reachable.
 * @returns {Promise<boolean>}
 */
const healthCheck = async () => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
};

/**
 * Gracefully close all pool connections.
 */
const close = async () => {
  await pool.end();
  logger.info('PostgreSQL pool closed');
};

module.exports = {
  pool,
  query,
  getClient,
  healthCheck,
  close,
};
