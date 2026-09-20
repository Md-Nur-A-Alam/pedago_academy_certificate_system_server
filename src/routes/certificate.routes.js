const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/requireRole');
const {
  listTemplates,
  createOrUpdateTemplate,
  deleteTemplate,
} = require('../controllers/certificateTemplateController');

router.get('/templates', requireAuth, listTemplates);
router.post('/templates', requireAuth, createOrUpdateTemplate);
router.delete('/templates/:id', requireAuth, deleteTemplate);

module.exports = router;
