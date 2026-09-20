const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/requireRole');
const {
  createParticipant,
  listParticipants,
  updateParticipant,
  archiveParticipant,
  bulkUpload,
  verifyParticipant,
  updateParticipantPhoto,
  recordDownload,
} = require('../controllers/participantController');

// Public endpoints (no admin auth required)
router.get('/verify', verifyParticipant);
router.post('/update-photo', updateParticipantPhoto);
router.post('/record-download', recordDownload);

// Admin-only endpoints
router.use(requireAuth);

router.post('/', createParticipant);
router.get('/', listParticipants);
router.post('/bulk-upload', bulkUpload);
router.patch('/:id', updateParticipant);
router.delete('/:id', archiveParticipant);

module.exports = router;
