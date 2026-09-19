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

router.use(requireAuth);

router.post('/', createCompetition);
router.get('/', listCompetitions);
router.get('/:id', getCompetitionById);
router.patch('/:id', updateCompetition);
router.delete('/:id', archiveCompetition);

module.exports = router;
