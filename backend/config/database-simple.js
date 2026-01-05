// Simplified database connection that doesn't fail if DB is not available
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'dpis_db',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('PostgreSQL connection error:', err.message);
  // Don't exit - let the server continue
});

// Test connection (non-blocking)
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.warn('⚠️  PostgreSQL connection warning:', err.message);
    console.warn('⚠️  Server will start but database features will not work until PostgreSQL is running.');
  } else {
    console.log('✅ PostgreSQL connected successfully');
  }
});

module.exports = pool;
