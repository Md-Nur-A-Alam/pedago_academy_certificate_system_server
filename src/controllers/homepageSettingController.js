const { z } = require('zod');
const HomepageSetting = require('../models/HomepageSetting');

const buttonSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, 'Button label is required'),
  link: z.string().min(1, 'Button link is required'),
  bgColor: z.string().optional().default('#F0442E'),
  textColor: z.string().optional().default('#FFFFFF'),
  variant: z.enum(['solid', 'outline']).optional().default('solid'),
  isVisible: z.boolean().optional().default(true),
});

const pictureStyleSchema = z
  .object({
    borderWidth: z.number().min(0).max(20).optional().default(4),
    borderColor: z.string().optional().default('rgba(255, 255, 255, 0.2)'),
    borderStyle: z
      .enum(['solid', 'dashed', 'double', 'none'])
      .optional()
      .default('solid'),
    shadow: z.enum(['none', 'soft', 'strong', 'glow']).optional().default('glow'),
    shadowColor: z.string().optional().default('rgba(245, 158, 11, 0.4)'),
    animation: z
      .enum(['none', 'float', 'pulse-glow', 'morph-amoeba'])
      .optional()
      .default('float'),
    shape: z
      .enum(['rounded', 'circle', 'amoeba', 'squircle'])
      .optional()
      .default('rounded'),
    size: z.enum(['small', 'medium', 'large']).optional().default('medium'),
    fadeStyle: z
      .enum(['none', 'bottom', 'vignette', 'radial'])
      .optional()
      .default('bottom'),
  })
  .optional();

const homepageSettingSchema = z.object({
  hero: z
    .object({
      badgeText: z.string().optional().default('Official Verification Portal'),
      showBadge: z.boolean().optional().default(true),
      title: z.string().min(1, 'Hero title is required'),
      titleHighlight: z.string().optional().default(''),
      titleColor: z.string().optional().default('#FFFFFF'),
      titleHighlightColor: z.string().optional().default('#F59E0B'),
      subtitle: z.string().optional().default(''),
      subtitleColor: z.string().optional().default('rgba(255, 255, 255, 0.9)'),
      layoutMode: z.enum(['background', 'flex']).optional().default('background'),
      imageUrl: z.string().optional().default('/HeroBG.jpg'),
      bgOverlayColor: z.string().optional().default('#1A284A'),
      bgType: z.enum(['solid', 'gradient']).optional().default('solid'),
      bgSolidColor: z.string().optional().default('#1A284A'),
      bgGradient: z
        .object({
          direction: z
            .enum(['to-r', 'to-br', 'to-b', 'to-tr', 'radial'])
            .optional()
            .default('to-r'),
          colorStart: z.string().optional().default('#1A284A'),
          colorEnd: z.string().optional().default('#29479B'),
        })
        .optional(),
      bgOverlayOpacity: z.number().min(0).max(100).optional().default(80),
      showButtons: z.boolean().optional().default(true),
      pictureStyle: pictureStyleSchema,
      buttons: z.array(buttonSchema).optional().default([]),
    })
    .optional(),
  featuredCompetitions: z
    .object({
      title: z.string().optional().default('চলমান ও জনপ্রিয় প্রতিযোগিতা | Featured Competitions'),
      subtitle: z.string().optional().default(''),
      limit: z.number().min(1).max(24).optional().default(6),
      showSection: z.boolean().optional().default(true),
    })
    .optional(),
  quickPortals: z
    .object({
      title: z.string().optional().default('Quick Access Portals'),
      subtitle: z.string().optional().default(''),
      showSection: z.boolean().optional().default(true),
    })
    .optional(),
});

// Public GET homepage settings
const getHomepageSetting = async (req, res, next) => {
  try {
    let setting = await HomepageSetting.findOne();
    if (!setting) {
      setting = new HomepageSetting();
      await setting.save();
    }

    res.status(200).json({
      success: true,
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};

// Admin PATCH/PUT homepage settings
const updateHomepageSetting = async (req, res, next) => {
  try {
    const validatedData = homepageSettingSchema.parse(req.body);

    let setting = await HomepageSetting.findOne();
    if (!setting) {
      setting = new HomepageSetting({
        ...validatedData,
        updatedBy: req.admin?._id || null,
      });
    } else {
      if (validatedData.hero) {
        setting.hero = { ...setting.hero.toObject(), ...validatedData.hero };
      }
      if (validatedData.featuredCompetitions) {
        setting.featuredCompetitions = {
          ...setting.featuredCompetitions.toObject(),
          ...validatedData.featuredCompetitions,
        };
      }
      if (validatedData.quickPortals) {
        setting.quickPortals = {
          ...setting.quickPortals.toObject(),
          ...validatedData.quickPortals,
        };
      }
      if (req.admin?._id) {
        setting.updatedBy = req.admin._id;
      }
    }

    await setting.save();

    res.status(200).json({
      success: true,
      message: 'Home page settings updated successfully',
      data: setting,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: error.errors,
      });
    }
    next(error);
  }
};

module.exports = {
  getHomepageSetting,
  updateHomepageSetting,
};
