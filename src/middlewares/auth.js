const { fromNodeHeaders } = require('better-auth/node');
const { getAuth } = require('../config/auth');
const Admin = require('../models/Admin');

/**
 * Clean session authentication middleware using official Better Auth API
 */
const authMiddleware = async (req, res, next) => {
  try {
    const auth = getAuth();

    // Convert Express headers to Web Standard Headers for Better Auth
    const headers = fromNodeHeaders(req.headers);

    // If Bearer token is provided in Authorization header, ensure cookie is also available for getSession
    if (req.headers.authorization && !headers.get('cookie')?.includes('session_token')) {
      const token = req.headers.authorization.replace('Bearer ', '').trim();
      const existingCookie = headers.get('cookie') || '';
      headers.set(
        'cookie',
        existingCookie
          ? `${existingCookie}; better-auth.session_token=${token}`
          : `better-auth.session_token=${token}`
      );
    }

    const session = await auth.api.getSession({
      headers,
    });

    if (!session || !session.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Session missing, invalid, or expired',
      });
    }

    // Find corresponding Admin record by email
    const admin = await Admin.findOne({
      email: session.user.email.toLowerCase(),
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Admin account not found',
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin account is inactive',
      });
    }

    // Attach authenticated context to request
    req.admin = admin;
    req.user = session.user;
    req.session = session.session;

    next();
  } catch (error) {
    console.error('[Auth Middleware Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal authentication error',
    });
  }
};

module.exports = authMiddleware;
