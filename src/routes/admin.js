const express = require('express');
const router = express.Router();
const { requireRole } = require('../middlewares/requireRole');
const {
  listAdmins,
  createAdmin,
  updateAdmin,
} = require('../controllers/adminController');

router.use(requireRole('super_admin'));

router.get('/', listAdmins);
router.post('/', createAdmin);
router.patch('/:id', updateAdmin);

module.exports = router;
