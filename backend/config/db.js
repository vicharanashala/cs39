const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connString = process.env.MONGODB_URI;
    console.log('[Database] Attempting MongoDB connection...');
    
    const conn = await mongoose.connect(connString, {
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout
    });
    
    console.log(`[Database] MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database Connection Error] ${error.message}`);
    throw error;
  }
};
module.exports = connectDB;
