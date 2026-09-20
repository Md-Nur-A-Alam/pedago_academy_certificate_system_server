const SystemSetting = require('../models/SystemSetting');
const { z } = require('zod');

const settingsSchema = z.object({
  heroBgUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  siteTitle: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  footerText: z.string().optional(),
});

const getSettings = async (req, res, next) => {
  try {
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = new SystemSetting({
        heroBgUrl: '/HeroBG.jpg',
        logoUrl: '/pedagoLogo.png',
        siteTitle: 'Pedago Academy',
      });
      await settings.save();
    }

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const validatedData = settingsSchema.parse(req.body);

    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = new SystemSetting({
        ...validatedData,
        updatedBy: req.admin?._id || null,
      });
    } else {
      Object.assign(settings, validatedData);
      if (req.admin?._id) {
        settings.updatedBy = req.admin._id;
      }
    }

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'System settings updated successfully',
      data: settings,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    }
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
