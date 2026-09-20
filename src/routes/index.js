const express = require('express');
const router = express.Router();

const adminRoutes = require('./admin');
const competitionRoutes = require('./competition');
const settingRoutes = require('./setting');
const participantRoutes = require('./participant.routes');
const certificateRoutes = require('./certificate.routes');
const posterRoutes = require('./poster.routes');
const uploadRoutes = require('./upload.routes');

router.use('/admins', adminRoutes);
router.use('/competitions', competitionRoutes);
router.use('/settings', settingRoutes);
router.use('/participants', participantRoutes);
router.use('/certificates', certificateRoutes);
router.use('/posters', posterRoutes);
router.use('/upload', uploadRoutes);

module.exports = router;
