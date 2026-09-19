const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/requireRole');
const {
  listTemplates,
  createOrUpdateTemplate,
} = require('../controllers/certificateTemplateController');

router.get('/templates', requireAuth, listTemplates);
router.post('/templates', requireAuth, createOrUpdateTemplate);

module.exports = router;
