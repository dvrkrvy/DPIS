const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const connectDB = require('./config/database');
const connectMongo = require('./config/mongodb');

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
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
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
const startServer = () => {
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

  // Connect to MongoDB (non-blocking)
  connectMongo().catch(err => {
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
  });
};

startServer();
