const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { toNodeHandler } = require('better-auth/node');
const env = require('./config/env');
const connectDB = require('./config/db');
const { getAuth } = require('./config/auth');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Security HTTP headers
app.use(helmet());

// Allowed origins for CORS (supports local dev, production CLIENT_URL, and Vercel preview URLs)
const allowedOrigins = [
  env.CLIENT_URL,
  env.SERVER_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]
  .filter(Boolean)
  .map((url) => url.trim().replace(/\/+$/, ''));

// CORS configuration (with credentials)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const cleanOrigin = origin.trim().replace(/\/+$/, '');
      if (
        allowedOrigins.includes(cleanOrigin) ||
        cleanOrigin.endsWith('.vercel.app') ||
        cleanOrigin === env.CLIENT_URL?.trim().replace(/\/+$/, '')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Logging middleware
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Cookie parser middleware
app.use(cookieParser());

// Ensure database connection is ready before processing requests (critical for Vercel serverless cold starts)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('[Database Middleware Error]:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Database connection failed',
    });
  }
});

// Better Auth API routes (handled before body parsing to preserve stream compatibility)
app.all('/api/auth/*', (req, res) => {
  return toNodeHandler(getAuth())(req, res);
});

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root welcome / health route (convenient for Vercel deployment check)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Pedago Academy Certificate System Server API',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Healthcheck routes
app.get(['/api/health', '/health'], (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Static uploads serving
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Main API Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;

