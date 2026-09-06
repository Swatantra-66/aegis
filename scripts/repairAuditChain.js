const { generateAuditChecksum } = require('../src/utils/crypto');
const db = require('../src/config/database');

async function repair() {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const rows = (await client.query('SELECT * FROM audit_logs ORDER BY id ASC')).rows;
    let prev = '';
    let updatedCount = 0;
    for (const row of rows) {
      const expected = generateAuditChecksum({
        action: row.action,
        actorId: row.actor_id,
        resourceId: row.resource_id,
        timestamp: new Date(row.created_at).toISOString(),
        previousChecksum: prev,
      });
      if (expected !== row.checksum) {
        await client.query('UPDATE audit_logs SET checksum = $1 WHERE id = $2', [expected, row.id]);
        console.log(`Repaired row #${row.id}: checksum updated to ${expected.substring(0, 16)}...`);
        updatedCount++;
      }
      prev = expected;
    }
    await client.query('COMMIT');
    console.log(`\nIntegrity chain repair complete. Repaired ${updatedCount} rows.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during chain repair:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

repair();
