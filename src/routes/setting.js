const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/requireRole');
const { getSettings, updateSettings } = require('../controllers/systemSettingController');

router.get('/', getSettings);
router.patch('/', requireAuth, updateSettings);

module.exports = router;
