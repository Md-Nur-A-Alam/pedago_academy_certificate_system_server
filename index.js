const app = require('./src/app');

// Only start the standalone HTTP listener when running locally via `node index.js`, NEVER on Vercel
if (!process.env.VERCEL && require.main === module) {
  require('./src/index.js');
}

// Export for serverless environments (Vercel)
module.exports = app;
