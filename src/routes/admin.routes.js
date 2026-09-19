const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');

// Admin routes placeholder
router.use(authMiddleware);

module.exports = router;
