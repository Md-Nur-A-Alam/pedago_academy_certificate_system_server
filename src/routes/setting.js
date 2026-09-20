const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/requireRole');
const { getSettings, updateSettings } = require('../controllers/systemSettingController');
const {
  getHomepageSetting,
  updateHomepageSetting,
} = require('../controllers/homepageSettingController');

router.get('/', getSettings);
router.patch('/', requireAuth, updateSettings);

// Homepage settings route aliases under /api/settings/homepage
router.get('/homepage', getHomepageSetting);
router.patch('/homepage', requireAuth, updateHomepageSetting);
router.put('/homepage', requireAuth, updateHomepageSetting);

module.exports = router;
