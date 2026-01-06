/**
 * Migration: Add username column to users table
 * 
 * Run this script to add the username column to existing databases.
 * 
 * Usage:
 *   node scripts/add-username-column.js
 */

const { Pool } = require('pg');
require('dotenv').config();

async function addUsernameColumn() {
  let pool;

  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  } else {
    pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'dpis_db',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
    });
  }

  try {
    console.log('🔧 Adding username column to users table...');

    // Check if column already exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='username'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ Username column already exists');
      await pool.end();
      return;
    }

    // Add username column
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN username VARCHAR(100) UNIQUE
    `);

    // Create index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)
    `);

    console.log('✅ Username column added successfully');
    console.log('✅ Index created');

  } catch (error) {
    console.error('❌ Error adding username column:', error.message);
    if (error.code === '42710') {
      console.log('⚠️  Column or index already exists - this is okay');
    } else {
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

addUsernameColumn().catch(console.error);
