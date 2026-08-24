const fs = require('fs');
const path = require('path');
const { pool } = require('../../config/database');
const logger = require('../../utils/logger');

/**
 * Run all seed files in order.
 */
const seed = async () => {
  const seedsDir = path.join(__dirname);
  const files = fs
    .readdirSync(seedsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const client = await pool.connect();

  try {
    for (const file of files) {
      const filePath = path.join(seedsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      logger.info(`Running seed: ${file}`);
      await client.query(sql);
      logger.info(`Seed applied: ${file}`);
    }

    logger.info('All seeds applied successfully');
  } finally {
    client.release();
  }
};

// Run seeds if this file is executed directly
if (require.main === module) {
  const config = require('../../config/index');
  logger.info(`Seeding database ${config.db.host}:${config.db.port}/${config.db.name}`);

  seed()
    .then(() => {
      logger.info('Seeding complete');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Seeding failed:', err);
      process.exit(1);
    });
}

module.exports = { seed };
