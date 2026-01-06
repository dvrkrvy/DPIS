const express = require('express');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const router = express.Router();

// Generate anonymous user account with username
router.post('/register', async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const { username } = req.body;
    
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ message: 'Username is required and must be at least 3 characters' });
    }

    const trimmedUsername = username.trim();
    
    // Validate username format (alphanumeric, underscore, hyphen, 3-20 chars)
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(trimmedUsername)) {
      return res.status(400).json({ 
        message: 'Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens' 
      });
    }

    const anonymousId = `anon_${uuidv4().replace(/-/g, '')}`;
    
    const result = await pool.query(
      'INSERT INTO users (anonymous_id, username, role) VALUES ($1, $2, $3) RETURNING id, anonymous_id, username, created_at',
      [anonymousId, trimmedUsername, 'student']
    );

    const user = result.rows[0];
    
    const token = jwt.sign(
      { userId: user.id, anonymousId: user.anonymous_id, username: user.username, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Update last login
    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        anonymousId: user.anonymous_id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.code === '23505') { // Unique violation
      if (error.constraint && error.constraint.includes('username')) {
        return res.status(409).json({ message: 'Username already taken. Please choose another username.' });
      }
      return res.status(409).json({ message: 'Account already exists' });
    }
    if (error.code === '42P01') { // Table doesn't exist
      return res.status(500).json({ 
        message: 'Database not initialized. Please run database setup.',
        error: error.message 
      });
    }
    if (error.code === 'ECONNREFUSED' || error.message.includes('connect')) {
      return res.status(500).json({ 
        message: 'Database connection failed. Please check DATABASE_URL configuration.',
        error: error.message 
      });
    }
    res.status(500).json({ 
      message: 'Registration failed',
      error: error.message,
      code: error.code
    });
  }
});

// Login (using username)
router.post('/login', async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const { username } = req.body;

    if (!username || username.trim().length === 0) {
      return res.status(400).json({ message: 'Username is required' });
    }

    const result = await pool.query(
      'SELECT id, anonymous_id, username, role, is_active FROM users WHERE username = $1',
      [username.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Username not found. Please check your username or create a new account.' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is inactive' });
    }

    const token = jwt.sign(
      { userId: user.id, anonymousId: user.anonymous_id, username: user.username, role: user.role || 'student' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        anonymousId: user.anonymous_id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error.code === '42P01') { // Table doesn't exist
      return res.status(500).json({ message: 'Database not initialized. Please run database setup.' });
    }
    res.status(500).json({ 
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Admin login
router.post('/admin/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT id, email, password_hash, name, institution, is_active FROM admins WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const admin = result.rows[0];

    if (!admin.is_active) {
      return res.status(403).json({ message: 'Account is inactive' });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: admin.id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Admin login successful',
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        institution: admin.institution
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ valid: false, message: 'Server configuration error' });
    }

    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ valid: false });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role === 'admin') {
      const result = await pool.query('SELECT id, email, name, institution FROM admins WHERE id = $1', [decoded.userId]);
      if (result.rows.length === 0) {
        return res.status(401).json({ valid: false });
      }
      return res.json({ valid: true, role: 'admin', user: result.rows[0] });
    } else {
      const result = await pool.query('SELECT id, anonymous_id, username FROM users WHERE id = $1', [decoded.userId]);
      if (result.rows.length === 0) {
        return res.status(401).json({ valid: false });
      }
      const dbUser = result.rows[0];
      // Return camelCase for consistency with registration/login endpoints
      return res.json({ 
        valid: true, 
        role: 'student', 
        user: {
          id: dbUser.id,
          anonymousId: dbUser.anonymous_id,
          username: dbUser.username
        }
      });
    }
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ valid: false });
    }
    console.error('Token verification error:', error);
    res.status(500).json({ valid: false });
  }
});

module.exports = router;
