const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connString = process.env.MONGODB_URI;
    
    await mongoose.connect(connString, {
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout
    });
  } catch (error) {
    console.error(`[Database Connection Error] ${error.message}`);
    throw error;
  }
};
module.exports = connectDB;
