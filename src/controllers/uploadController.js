const imageService = require('../services/imageService');

/**
 * Handle multipart image file upload
 * POST /api/upload
 */
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded. Please select a file to upload.',
      });
    }

    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only images (PNG, JPEG, WebP, GIF) are allowed.',
      });
    }

    const result = await imageService.uploadImageBuffer(
      req.file.buffer,
      req.file.originalname
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Upload Controller Error]:', error);
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Failed to upload image file.',
    });
  }
};

/**
 * Handle image extraction / download from URL (e.g. Facebook CDN, web link)
 * POST /api/upload/from-url
 */
const uploadFromUrl = async (req, res, next) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'URL is required',
      });
    }

    const result = await imageService.processImageFromUrl(url);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to process image from URL',
    });
  }
};

module.exports = {
  uploadFile,
  uploadFromUrl,
};
