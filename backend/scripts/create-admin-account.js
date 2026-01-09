const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Use Render database if DATABASE_URL is set
let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
} else {
  pool = require('../config/database');
}

const createAdminAccount = async () => {
  try {
    console.log('🔧 Creating admin account...\n');

    const email = process.argv[2] || 'admin@dpis.edu';
    const password = process.argv[3] || 'admin123';
    const name = process.argv[4] || 'System Admin';
    const institution = process.argv[5] || 'DPIS Institution';

    // Check if admin already exists
    const existing = await pool.query(
      'SELECT id, email FROM admins WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      console.log(`⚠️  Admin account already exists: ${email}`);
      console.log('   Use a different email or delete the existing account first.\n');
      await pool.end();
      return;
    }

    // Generate password hash
    console.log(`📝 Creating admin account:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Name: ${name}`);
    console.log(`   Institution: ${institution}\n`);

    const passwordHash = await bcrypt.hash(password, 10);

    // Insert admin account
    const result = await pool.query(
      `INSERT INTO admins (email, password_hash, name, institution, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, email, name`,
      [email, passwordHash, name, institution]
    );

    console.log('✅ Admin account created successfully!');
    console.log(`   ID: ${result.rows[0].id}`);
    console.log(`   Email: ${result.rows[0].email}`);
    console.log(`   Name: ${result.rows[0].name}\n`);
    console.log('🔑 You can now use these credentials to login:\n');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}\n`);

    await pool.end();
  } catch (error) {
    console.error('❌ Error creating admin account:', error.message);
    if (error.code === '23505') {
      console.error('   This email already exists in the database.');
    } else if (error.code === '42P01') {
      console.error('   The admins table does not exist. Run database initialization first.');
    }
    process.exit(1);
  }
};

createAdminAccount();
