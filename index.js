const app = require('./src/app');
const connectDB = require('./src/config/db');

// If executed directly (e.g. `node index.js` or `npm start` for local development)
if (require.main === module) {
  require('./src/index.js');
}

// Export for serverless environments (Vercel)
module.exports = async (req, res) => {
  await connectDB();
  return app(req, res);
};
