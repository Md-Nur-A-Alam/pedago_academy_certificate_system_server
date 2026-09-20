const PosterTemplate = require('../models/PosterTemplate');

const listPosterTemplates = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.competitionId) {
      filter.competitionId = req.query.competitionId;
    }

    const templates = await PosterTemplate.find(filter)
      .populate('competitionId', 'name refPrefix')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
};

const createOrUpdatePosterTemplate = async (req, res, next) => {
  try {
    const { competitionId, type, backgroundImageUrl, photoZone, textZones } = req.body;

    if (!competitionId || !type || !backgroundImageUrl) {
      return res.status(400).json({ success: false, message: 'competitionId, type, and backgroundImageUrl are required' });
    }

    let existing = await PosterTemplate.findOne({ competitionId, type });

    if (existing) {
      existing.backgroundImageUrl = backgroundImageUrl;
      if (photoZone) existing.photoZone = photoZone;
      if (textZones) existing.textZones = textZones;
      existing.version += 1;
      await existing.save();

      return res.status(200).json({
        success: true,
        message: 'Poster template updated successfully',
        data: existing,
      });
    }

    const newTemplate = new PosterTemplate({
      competitionId,
      type,
      backgroundImageUrl,
      photoZone: photoZone || {},
      textZones: textZones || [],
      version: 1,
    });

    await newTemplate.save();

    res.status(201).json({
      success: true,
      message: 'Poster template created successfully',
      data: newTemplate,
    });
  } catch (error) {
    next(error);
  }
};

const deletePosterTemplate = async (req, res, next) => {
  try {
    const template = await PosterTemplate.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Poster template not found' });
    }
    res.status(200).json({
      success: true,
      message: 'Poster template deleted successfully',
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listPosterTemplates,
  createOrUpdatePosterTemplate,
  deletePosterTemplate,
};
