const mongoose = require('mongoose');

// Disable Mongoose command buffering so queries fail immediately if MongoDB is not connected
// instead of hanging/waiting for 1-10 seconds
mongoose.set('bufferCommands', false);

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri || uri.includes('<username>') || uri.trim() === '') {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  [MongoDB Warning] MONGO_URI is missing or not configured in .env.');
    console.warn('\x1b[33m%s\x1b[0m', 'ℹ️  Operating in instant sub-millisecond in-memory mode.');
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
    });
    console.log('\x1b[32m%s\x1b[0m', `✅ [MongoDB Connected] Atlas Host: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `❌ [MongoDB Connection Error] ${error.message}`);
    console.warn('\x1b[33m%s\x1b[0m', 'ℹ️  Operating in instant in-memory mode for zero-latency operations.');
    return false;
  }
};

module.exports = connectDB;
