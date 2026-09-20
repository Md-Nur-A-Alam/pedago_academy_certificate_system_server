const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/requireRole');
const {
  listPosterTemplates,
  createOrUpdatePosterTemplate,
  deletePosterTemplate,
} = require('../controllers/posterTemplateController');

router.get('/templates', listPosterTemplates);
router.post('/templates', requireAuth, createOrUpdatePosterTemplate);
router.delete('/templates/:id', requireAuth, deletePosterTemplate);

module.exports = router;
