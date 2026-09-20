const mongoose = require('mongoose');
const env = require('./env');

// Cache database connection across serverless / Vercel invocations
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn && mongoose.connection.readyState >= 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
      })
      .then((m) => {
        console.log(`[MongoDB] Connected to database: ${m.connection.host}`);
        return m;
      })
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error(`[MongoDB] Connection error: ${error.message}`);
    // Only exit in standalone local development if not in serverless
    if (!process.env.VERCEL && env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    throw error;
  }

  return cached.conn;
};

module.exports = connectDB;

