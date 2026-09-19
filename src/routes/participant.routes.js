const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/requireRole');
const {
  createParticipant,
  listParticipants,
  updateParticipant,
  archiveParticipant,
  bulkUpload,
} = require('../controllers/participantController');

router.use(requireAuth);

router.post('/', createParticipant);
router.get('/', listParticipants);
router.post('/bulk-upload', bulkUpload);
router.patch('/:id', updateParticipant);
router.delete('/:id', archiveParticipant);

module.exports = router;
