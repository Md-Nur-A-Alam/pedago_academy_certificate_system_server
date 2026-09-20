const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/requireRole');
const {
  createCompetition,
  listCompetitions,
  getCompetitionById,
  updateCompetition,
  archiveCompetition,
} = require('../controllers/competitionController');

// Public read-only endpoints for visitors and home page
router.get('/', listCompetitions);
router.get('/:id', getCompetitionById);

// Protected mutation endpoints for admin management
router.use(requireAuth);
router.post('/', createCompetition);
router.patch('/:id', updateCompetition);
router.delete('/:id', archiveCompetition);

module.exports = router;
