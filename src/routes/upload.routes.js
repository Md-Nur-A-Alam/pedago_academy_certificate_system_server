const express = require('express');
const multer = require('multer');
const router = express.Router();
const uploadController = require('../controllers/uploadController');

// Multer memory storage (up to 32MB matching ImgBB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 32 * 1024 * 1024,
  },
});

// File upload route
router.post('/', upload.single('image'), uploadController.uploadFile);

// URL detection and import route
router.post('/from-url', uploadController.uploadFromUrl);

module.exports = router;
