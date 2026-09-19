const authMiddleware = require('./auth');

const requireAuth = [
  authMiddleware,
  (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Admin access required' });
    }
    next();
  },
];

const requireRole = (...roles) => [
  authMiddleware,
  (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Admin access required' });
    }
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions' });
    }
    next();
  },
];

module.exports = {
  requireAuth,
  requireRole,
};
