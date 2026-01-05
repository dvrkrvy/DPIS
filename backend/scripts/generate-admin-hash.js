// Script to generate bcrypt hash for admin password
const bcrypt = require('bcryptjs');
const password = process.argv[2] || 'admin123';
const hash = bcrypt.hashSync(password, 10);
console.log(`Password: ${password}`);
console.log(`Hash: ${hash}`);
console.log('\nUpdate backend/config/init.sql with this hash');
