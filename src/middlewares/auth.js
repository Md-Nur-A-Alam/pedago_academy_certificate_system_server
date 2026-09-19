const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const authMiddleware = async (req, res, next) => {
  try {
    const token =
      req.cookies?.['better-auth.session_token'] ||
      req.cookies?.['__Secure-better-auth.session_token'] ||
      (req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null);

    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Session token missing' });
    }

    const db = mongoose.connection.db;
    const sessionCollection = db.collection('session');
    const session = await sessionCollection.findOne({ token });

    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired session' });
    }

    // Try finding admin by session.userId (if object id or string) or lookup in user collection first
    let admin = null;
    if (mongoose.Types.ObjectId.isValid(session.userId)) {
      admin = await Admin.findById(session.userId);
    }

    if (!admin) {
      const userCollection = db.collection('user');
      const authUser = await userCollection.findOne({
        $or: [{ _id: session.userId }, { id: session.userId }]
      });

      if (authUser && authUser.email) {
        admin = await Admin.findOne({ email: authUser.email.toLowerCase() });
      }
    }

    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Admin account inactive or not found' });
    }

    req.admin = admin;
    req.session = session;
    next();
  } catch (error) {
    console.error('[AuthMiddleware Error]:', error);
    return res.status(500).json({ success: false, message: 'Internal authentication error' });
  }
};

module.exports = authMiddleware;
