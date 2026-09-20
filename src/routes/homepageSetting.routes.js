const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/requireRole');
const {
  getHomepageSetting,
  updateHomepageSetting,
} = require('../controllers/homepageSettingController');

// Public read access for home page rendering
router.get('/', getHomepageSetting);

// Protected admin update access
router.patch('/', requireAuth, updateHomepageSetting);
router.put('/', requireAuth, updateHomepageSetting);

module.exports = router;
