const mongoose = require('mongoose');
const env = require('./env');

let authInstance = null;
let initPromise = null;

/**
 * Initialize or get Better Auth instance asynchronously using dynamic import (avoids ERR_REQUIRE_ESM on Linux/Vercel)
 */
const getAuth = async () => {
  if (authInstance) {
    return authInstance;
  }

  if (!initPromise) {
    initPromise = (async () => {
      const [{ betterAuth }, { mongodbAdapter }, { bearer }] = await Promise.all([
        import('better-auth'),
        import('@better-auth/mongo-adapter'),
        import('better-auth/plugins'),
      ]);

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
        trustedOrigins: [
          env.CLIENT_URL,
          env.SERVER_URL,
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'https://*.vercel.app',
        ]
          .filter(Boolean)
          .map((u) => u.trim().replace(/\/+$/, '')),
        advanced: {
          defaultCookieAttributes: {
            sameSite: 'lax',
            secure: env.NODE_ENV === 'production',
            httpOnly: true,
          },
        },
      });

      return authInstance;
    })();
  }

  return initPromise;
};

module.exports = {
  getAuth,
};
