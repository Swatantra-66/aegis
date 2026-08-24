const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Lightweight migration runner.
 * - Reads numbered .sql files from the migrations/ directory
 * - Tracks applied migrations in a `migrations` table
 * - Runs pending migrations in order
 */

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Ensure the migrations tracking table exists.
 */
const ensureMigrationsTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
};

/**
 * Get list of already-applied migrations.
 */
const getAppliedMigrations = async (client) => {
  const result = await client.query('SELECT name FROM migrations ORDER BY id');
  return result.rows.map((row) => row.name);
};

/**
 * Get all migration files sorted by name.
 */
const getMigrationFiles = () => {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();
};

/**
 * Run all pending migrations in a transaction.
 */
const migrate = async () => {
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);

    const applied = await getAppliedMigrations(client);
    const files = getMigrationFiles();
    const pending = files.filter((file) => !applied.includes(file));

    if (pending.length === 0) {
      logger.info('No pending migrations');
      return;
    }

    logger.info(`Found ${pending.length} pending migration(s)`);

    for (const file of pending) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      logger.info(`Running migration: ${file}`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        logger.info(`✅ Migration applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`❌ Migration failed: ${file}`, { error: err.message });
        throw err;
      }
    }

    logger.info('All migrations applied successfully');
  } finally {
    client.release();
  }
};

/**
 * Rollback: drop all tables (DANGER — development only).
 */
const rollback = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot rollback in production');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      DROP TABLE IF EXISTS login_events CASCADE;
      DROP TABLE IF EXISTS scim_resources CASCADE;
      DROP TABLE IF EXISTS sso_identities CASCADE;
      DROP TABLE IF EXISTS sessions CASCADE;
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS refresh_tokens CASCADE;
      DROP TABLE IF EXISTS user_roles CASCADE;
      DROP TABLE IF EXISTS role_permissions CASCADE;
      DROP TABLE IF EXISTS permissions CASCADE;
      DROP TABLE IF EXISTS roles CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS migrations CASCADE;
    `);
    await client.query('COMMIT');
    logger.info('All tables dropped');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Run migrations if this file is executed directly
if (require.main === module) {
  const config = require('../config/index');
  logger.info(`Running migrations against ${config.db.host}:${config.db.port}/${config.db.name}`);

  migrate()
    .then(() => {
      logger.info('Migration complete');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrate, rollback };
