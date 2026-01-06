const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dpis_forum';

const connectMongo = async () => {
  if (!MONGODB_URI || MONGODB_URI === 'mongodb://localhost:27017/dpis_forum') {
    console.warn('⚠️  MONGODB_URI not set or using localhost');
    console.warn('⚠️  Forum features will not work without MongoDB');
    console.warn('💡 Set MONGODB_URI in Render environment variables');
    console.warn('💡 Use MongoDB Atlas (free tier): https://www.mongodb.com/cloud/atlas');
    return false;
  }

  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // Timeout after 10 seconds
    });
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    if (error.message.includes('authentication failed')) {
      console.error('💡 Check your MongoDB username and password');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('💡 Check your MongoDB connection string (MONGODB_URI)');
    } else if (error.message.includes('timeout')) {
      console.error('💡 MongoDB server might be unreachable or IP whitelist needs updating');
    }
    console.warn('⚠️  Server will start but forum features require MongoDB');
    return false;
  }
};

module.exports = connectMongo;
