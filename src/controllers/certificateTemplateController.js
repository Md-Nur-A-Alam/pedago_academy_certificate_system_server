const CertificateTemplate = require('../models/CertificateTemplate');

const listTemplates = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.competitionId) {
      filter.competitionId = req.query.competitionId;
    }

    const templates = await CertificateTemplate.find(filter)
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

const createOrUpdateTemplate = async (req, res, next) => {
  try {
    const { competitionId, variant, backgroundImageUrl, nameZone, refZone, dateZone, signatureZone } = req.body;

    if (!competitionId || !variant || !backgroundImageUrl) {
      return res.status(400).json({ success: false, message: 'competitionId, variant, and backgroundImageUrl are required' });
    }

    let existing = await CertificateTemplate.findOne({ competitionId, variant });

    if (existing) {
      existing.backgroundImageUrl = backgroundImageUrl;
      if (nameZone) existing.nameZone = nameZone;
      if (refZone) existing.refZone = refZone;
      if (dateZone) existing.dateZone = dateZone;
      if (signatureZone) existing.signatureZone = signatureZone;
      existing.version += 1;
      await existing.save();

      return res.status(200).json({
        success: true,
        message: 'Certificate template updated successfully',
        data: existing,
      });
    }

    const newTemplate = new CertificateTemplate({
      competitionId,
      variant,
      backgroundImageUrl,
      nameZone: nameZone || {},
      refZone: refZone || {},
      dateZone: dateZone || {},
      signatureZone: signatureZone || {},
      version: 1,
      isActive: true,
    });

    await newTemplate.save();

    res.status(201).json({
      success: true,
      message: 'Certificate template created successfully',
      data: newTemplate,
    });
  } catch (error) {
    next(error);
  }
};

const deleteTemplate = async (req, res, next) => {
  try {
    const template = await CertificateTemplate.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Certificate template not found' });
    }
    res.status(200).json({
      success: true,
      message: 'Certificate template deleted successfully',
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listTemplates,
  createOrUpdateTemplate,
  deleteTemplate,
};
