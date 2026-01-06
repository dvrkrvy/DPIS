const { Pool } = require('pg');
require('dotenv').config();

let pool;

if (process.env.DATABASE_URL) {
  // Hosted Postgres (e.g. Render)
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });
} else {
  // Local/dev fallback
  pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'dpis_db',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

// Test connection (non-blocking)
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.warn('⚠️  PostgreSQL connection warning:', err.message);
    console.warn('⚠️  Server will start but database features require PostgreSQL');
  } else {
    console.log('✅ PostgreSQL connected successfully');
  }
});

module.exports = pool;
