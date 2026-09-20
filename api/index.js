const app = require('../src/app');
const connectDB = require('../src/config/db');

// Vercel Serverless Function entry point
module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (error) {
    console.error('[Vercel Serverless] Database connection error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database connection failed',
    });
  }

  return app(req, res);
};
