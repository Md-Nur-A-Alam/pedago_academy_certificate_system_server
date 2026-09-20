const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { toNodeHandler } = require('better-auth/node');
const env = require('./config/env');
const { getAuth } = require('./config/auth');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration (restricted to CLIENT_URL with credentials)
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

// Logging middleware
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Cookie parser middleware
app.use(cookieParser());

// Better Auth API routes (handled before body parsing to preserve stream compatibility)
app.all('/api/auth/*', (req, res) => {
  return toNodeHandler(getAuth())(req, res);
});

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Static uploads serving
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Main API Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
