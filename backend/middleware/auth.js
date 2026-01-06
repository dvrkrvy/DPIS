const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Handle admin authentication
    if (decoded.role === 'admin') {
      const result = await pool.query(
        'SELECT id, email, name, institution, is_active FROM admins WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0 || !result.rows[0].is_active) {
        return res.status(401).json({ message: 'Admin not found or inactive' });
      }

      req.user = {
        id: result.rows[0].id,
        email: result.rows[0].email,
        name: result.rows[0].name,
        institution: result.rows[0].institution,
        role: 'admin'
      };

      return next();
    }

    // Handle student/user authentication
    const result = await pool.query(
      'SELECT id, anonymous_id, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    req.user = {
      id: result.rows[0].id,
      anonymousId: result.rows[0].anonymous_id,
      role: result.rows[0].role || 'student'
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

const requireStudent = (req, res, next) => {
  if (req.user?.role !== 'student') {
    return res.status(403).json({ message: 'Student access required' });
  }
  next();
};

module.exports = { authenticate, requireAdmin, requireStudent };
