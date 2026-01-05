// Simplified MongoDB connection that doesn't fail if DB is not available
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dpis_forum';

const connectMongo = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 2000, // Timeout after 2 seconds
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.warn('⚠️  MongoDB connection warning:', error.message);
    console.warn('⚠️  Server will start but forum features will not work until MongoDB is running.');
    // Don't throw - let the server continue
  }
};

module.exports = connectMongo;
