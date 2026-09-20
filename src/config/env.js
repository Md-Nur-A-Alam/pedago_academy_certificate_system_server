const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file (if present locally)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Graceful resolution for Vercel and local environments:
// Allows both standard and NEXT_PUBLIC_ prefixed environment variable names
const SERVER_URL = (
  process.env.SERVER_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5000')
).trim().replace(/\/+$/, '');

const CLIENT_URL = (
  process.env.CLIENT_URL ||
  process.env.NEXT_PUBLIC_CLIENT_URL ||
  'https://pedago-academy-certificate-system-c.vercel.app'
).trim().replace(/\/+$/, '');

const BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET ||
  'KKj0fKdBtIoFGr5iIxD1fLG0X6ryVFwb';

const BETTER_AUTH_URL = (
  process.env.BETTER_AUTH_URL ||
  SERVER_URL
).trim().replace(/\/+$/, '');

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://PedagoAcademy:k47pjsX0iG6F8GB0@ac-xdtfxsh-shard-00-00.0zmykqn.mongodb.net:27017,ac-xdtfxsh-shard-00-01.0zmykqn.mongodb.net:27017,ac-xdtfxsh-shard-00-02.0zmykqn.mongodb.net:27017/pedago_academy_db?ssl=true&replicaSet=atlas-esirnl-shard-0&authSource=admin&appName=Cluster0';

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  MONGODB_URI,
  IMGBB_API_KEY: process.env.IMGBB_API_KEY || '8d8681f7efba818251ffb798dc2e6aaa',
  IMGBB_UPLOAD_URL: process.env.IMGBB_UPLOAD_URL || 'https://api.imgbb.com/1/upload',
  SERVER_URL,
  CLIENT_URL,
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
  SEED_SUPER_ADMIN_EMAIL: process.env.SEED_SUPER_ADMIN_EMAIL || 'mdnuralam2812@gmail.com',
  SEED_SUPER_ADMIN_PASSWORD: process.env.SEED_SUPER_ADMIN_PASSWORD || '01725.Nur',
};
