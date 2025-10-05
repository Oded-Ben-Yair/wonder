/**
 * Database integration module for PostgreSQL
 * Provides fresh nurse data queries instead of in-memory caching
 */

import pg from 'pg';
const { Pool } = pg;

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 20, // Maximum pool connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Fetch active, approved nurses from database
 * @returns {Promise<Array>} Array of nurse records
 */
export async function fetchNursesFromDB() {
  const client = await pool.connect();

  try {
    const { rows } = await client.query(`
      SELECT
        nurse_id,
        gender,
        name,
        mobility,
        municipality,
        treatment_type as specialization,
        is_active,
        is_approved,
        is_profile_updated,
        is_onboarding_completed,
        created_at,
        updated_at
      FROM nurses
      WHERE is_active = true
        AND is_approved = true
      ORDER BY updated_at DESC
    `);

    console.log(`[DB] Fetched ${rows.length} active nurses from database`);
    return rows;

  } catch (error) {
    console.error('[DB] Error fetching nurses:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get nurse count from database
 * @returns {Promise<number>} Count of active, approved nurses
 */
export async function getNurseCount() {
  const client = await pool.connect();

  try {
    const { rows } = await client.query(`
      SELECT COUNT(*) as count
      FROM nurses
      WHERE is_active = true
        AND is_approved = true
    `);

    return parseInt(rows[0].count, 10);

  } catch (error) {
    console.error('[DB] Error getting nurse count:', error);
    return 0;
  } finally {
    client.release();
  }
}

/**
 * Test database connection
 * @returns {Promise<boolean>} True if connection successful
 */
export async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('[DB] PostgreSQL connection successful');
    return true;
  } catch (error) {
    console.error('[DB] PostgreSQL connection failed:', error.message);
    return false;
  }
}

/**
 * Close database pool (for graceful shutdown)
 */
export async function closePool() {
  await pool.end();
  console.log('[DB] Database pool closed');
}

// Export pool for advanced queries if needed
export { pool };
