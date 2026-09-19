const env = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');

const startServer = async () => {
  try {
    await connectDB();

    app.listen(env.PORT, () => {
      console.log(`[Express] Server running on ${env.SERVER_URL} (Port ${env.PORT})`);
    });
  } catch (error) {
    console.error(`[Server Error] Failed to start server:`, error);
    process.exit(1);
  }
};

startServer();
