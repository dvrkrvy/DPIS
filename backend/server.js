const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Database pool (PostgreSQL) and MongoDB connector
const connectDB = require('./config/database');
const connectMongo = require('./config/mongodb');
const initializeDatabase = require('./scripts/init-database');

// Routes
const authRoutes = require('./routes/auth');
const screeningRoutes = require('./routes/screening');
const aiRoutes = require('./routes/ai');
const resourceRoutes = require('./routes/resources');
const bookingRoutes = require('./routes/booking');
const forumRoutes = require('./routes/forum');
const progressRoutes = require('./routes/progress');
const adminRoutes = require('./routes/admin');
const emergencyRoutes = require('./routes/emergency');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      
      const requestOrigin = origin.split('/').slice(0, 3).join('/');
      
      if (allowedOrigins.some(allowed => {
        const allowedOrigin = allowed.split('/').slice(0, 3).join('/');
        return requestOrigin === allowedOrigin;
      })) {
        callback(null, true);
      } else if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Trust proxy (for rate limiting behind proxies like Render, Heroku, etc.)
app.set('trust proxy', 1);

// Middleware
app.use(helmet());

// CORS configuration - allow GitHub Pages and localhost
// Note: CORS origin is protocol + domain + port (no path)
// So 'https://dvrkrvy.github.io' matches, not 'https://dvrkrvy.github.io/DPIS'
const allowedOrigins = [
  'https://dvrkrvy.github.io',
  'http://localhost:3000'
];

// If FRONTEND_URL is set, extract just the origin (protocol + domain + port)
if (process.env.FRONTEND_URL) {
  try {
    const url = new URL(process.env.FRONTEND_URL);
    const origin = `${url.protocol}//${url.host}`;
    if (!allowedOrigins.includes(origin)) {
      allowedOrigins.push(origin);
    }
  } catch (e) {
    // If FRONTEND_URL is not a valid URL, just use it as-is
    if (!allowedOrigins.includes(process.env.FRONTEND_URL)) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }
  }
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Extract origin from the request (protocol + domain + port, no path)
    const requestOrigin = origin.split('/').slice(0, 3).join('/');
    
    // Check if origin matches any allowed origin
    if (allowedOrigins.some(allowed => {
      const allowedOrigin = allowed.split('/').slice(0, 3).join('/');
      return requestOrigin === allowedOrigin;
    })) {
      callback(null, true);
    } else {
      // For development, allow all origins
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        // In production, allow file:// origins and null origins for setup tools
        // This allows the HTML setup tool to work from local files and browser console
        if (origin === 'null' || !origin || origin.startsWith('file://')) {
          console.log(`Allowing origin for setup tool: ${origin || 'null'}`);
          callback(null, true);
        } else {
          console.warn(`CORS blocked origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      }
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Make io available to routes via req (must be before routes)
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/screening', screeningRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/emergency', emergencyRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-forum', (forumId) => {
    socket.join(`forum-${forumId}`);
  });

  socket.on('leave-forum', (forumId) => {
    socket.leave(`forum-${forumId}`);
  });

  socket.on('new-message', (data) => {
    socket.to(`forum-${data.forumId}`).emit('message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Start server (database connections are non-blocking)
const startServer = async () => {
  // Validate critical environment variables
  if (!process.env.JWT_SECRET) {
    console.error('❌ ERROR: JWT_SECRET is not set in environment variables');
    console.error('⚠️  Set JWT_SECRET in your .env file or Render environment variables');
    console.error('⚠️  Example: JWT_SECRET=your-super-secret-key-here');
    // Use a default for development, but warn
    if (process.env.NODE_ENV !== 'production') {
      process.env.JWT_SECRET = 'dev-secret-key-change-in-production';
      console.warn('⚠️  Using default JWT_SECRET for development. CHANGE THIS IN PRODUCTION!');
    } else {
      console.error('❌ Cannot start server without JWT_SECRET in production');
      process.exit(1);
    }
  }

  // Optionally auto-initialize PostgreSQL schema (for environments without shell access)
  const shouldAutoInitDb =
    process.env.AUTO_INIT_DB === 'true' || process.env.AUTO_INIT_DB === '1';

  if (shouldAutoInitDb) {
    try {
      console.log('🛠  AUTO_INIT_DB enabled – initializing PostgreSQL schema...');
      await initializeDatabase();
      console.log('✅ PostgreSQL schema initialization completed');
    } catch (err) {
      console.error('❌ Failed to auto-initialize PostgreSQL schema:', err.message);
      console.error('⚠️  Server will start, but database features may not work');
      console.error('💡 To initialize database manually, run: node init-render-db.js');
      // Don't crash the server - let it start and handle DB errors gracefully
      // User can initialize DB manually using the script
    }
  }

  // Touch the PostgreSQL pool so its connection test runs
  // (connectDB is the Pool instance; it logs connection status on import)
  if (connectDB) {
    console.log('ℹ️ PostgreSQL pool loaded');
  }

  // Connect to MongoDB (non-blocking)
  connectMongo().catch(() => {
    // Already handled in connectMongo, but catch just in case
  });
  
  server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⚠️  Note: Some features require PostgreSQL and MongoDB`);
    if (process.env.DATABASE_URL) {
      console.log(`✅ Using DATABASE_URL for PostgreSQL connection`);
    }
    if (shouldAutoInitDb) {
      console.log('🛠  AUTO_INIT_DB was enabled for this boot');
    }
  });
};

startServer();
