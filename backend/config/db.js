const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connString = process.env.MONGODB_URI;
    console.log(`[Database] Attempting connection to MongoDB Atlas...`);
    
    const conn = await mongoose.connect(connString, {
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout
    });
    
    console.log(`[Database] MongoDB Connected Successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`\x1b[31m[Database Connection Error]\x1b[0m Failed to connect to MongoDB Atlas!`);
    console.error(`Error details: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
