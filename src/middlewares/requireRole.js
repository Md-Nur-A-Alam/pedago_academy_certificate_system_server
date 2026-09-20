const authMiddleware = require('./auth');

/**
 * Ensures the user has a valid authenticated admin session
 */
const requireAuth = [
  authMiddleware,
  (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Admin authentication required',
      });
    }

    if (!req.admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin account is inactive',
      });
    }

    next();
  },
];

/**
 * Ensures the authenticated admin possesses one of the specified roles (e.g. 'super_admin')
 */
const requireRole = (...roles) => [
  authMiddleware,
  (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Admin authentication required',
      });
    }

    if (!req.admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin account is inactive',
      });
    }

    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires one of [${roles.join(', ')}] privileges`,
      });
    }

    next();
  },
];

module.exports = {
  requireAuth,
  requireRole,
};
