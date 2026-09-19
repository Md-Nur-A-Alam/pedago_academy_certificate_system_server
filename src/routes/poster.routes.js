const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/requireRole');
const {
  listPosterTemplates,
  createOrUpdatePosterTemplate,
} = require('../controllers/posterTemplateController');

router.get('/templates', requireAuth, listPosterTemplates);
router.post('/templates', requireAuth, createOrUpdatePosterTemplate);

module.exports = router;
