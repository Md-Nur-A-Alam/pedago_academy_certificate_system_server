const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middlewares/requireRole');
const {
  getMe,
  changePassword,
  listAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
} = require('../controllers/adminController');

// Routes accessible to any authenticated admin
router.get('/me', requireAuth, getMe);
router.post('/change-password', requireAuth, changePassword);

// Routes restricted strictly to Super Admins
router.get('/', requireRole('super_admin'), listAdmins);
router.post('/', requireRole('super_admin'), createAdmin);
router.patch('/:id', requireRole('super_admin'), updateAdmin);
router.delete('/:id', requireRole('super_admin'), deleteAdmin);

module.exports = router;
