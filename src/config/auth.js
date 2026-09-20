const { betterAuth } = require('better-auth');
const { mongodbAdapter } = require('@better-auth/mongo-adapter');
const { bearer } = require('better-auth/plugins');
const mongoose = require('mongoose');
const env = require('./env');

let authInstance = null;

/**
 * Initialize or get Better Auth instance
 */
const getAuth = () => {
  if (authInstance) {
    return authInstance;
  }

  const mongoClient = mongoose.connection.getClient();
  const db = mongoClient.db();

  authInstance = betterAuth({
    database: mongodbAdapter(db),
    baseURL: env.BETTER_AUTH_URL || env.SERVER_URL,
    secret: env.BETTER_AUTH_SECRET,
    plugins: [bearer()], // Enables both Cookie and Authorization: Bearer <token> authentication
    emailAndPassword: {
      enabled: true,
      disableSignUp: true, // Strictly admin-only; no public self-registration (§3)
    },
    trustedOrigins: [env.CLIENT_URL],
    advanced: {
      defaultCookieAttributes: {
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
        httpOnly: true,
      },
    },
  });

  return authInstance;
};

module.exports = {
  getAuth,
};
