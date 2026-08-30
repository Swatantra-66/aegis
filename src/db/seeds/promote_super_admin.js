const { pool } = require('../../config/database');
const logger = require('../../utils/logger');

const promoteUser = async (email) => {
  const client = await pool.connect();
  try {
    // 1. Get user ID
    const userRes = await client.query(
      'SELECT id, email, first_name, last_name FROM users WHERE email = $1',
      [email]
    );
    if (userRes.rows.length === 0) {
      logger.warn(`User with email "${email}" not found in database.`);
      return;
    }
    const user = userRes.rows[0];

    // 2. Get super_admin role ID
    const roleRes = await client.query("SELECT id FROM roles WHERE name = 'super_admin'");
    if (roleRes.rows.length === 0) {
      logger.error("Role 'super_admin' not found.");
      return;
    }
    const superAdminRoleId = roleRes.rows[0].id;

    // 3. Assign role
    await client.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [user.id, superAdminRoleId]
    );

    logger.info(`Successfully promoted ${user.email} (${user.id}) to SUPER_ADMIN!`);
  } catch (err) {
    logger.error('Error promoting user:', err);
  } finally {
    client.release();
  }
};

if (require.main === module) {
  promoteUser('maverickswatantra@gmail.com')
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { promoteUser };
