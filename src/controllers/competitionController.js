const { z } = require('zod');
const Competition = require('../models/Competition');

const competitionSchema = z.object({
  name: z.string().min(1, 'Competition name is required'),
  category: z.string().min(1, 'Category is required').default('General'),
  description: z.string().optional().default(''),
  refPrefix: z.string().min(1, 'Reference prefix is required').toUpperCase().trim(),
  refPadding: z.number().min(0).max(6).optional().default(0),
  sourceLink: z.string().optional().default(''),
  imageUrl: z.string().optional().default(''),
  status: z.enum(['draft', 'active', 'archived']).optional().default('draft'),
});

const updateCompetitionSchema = competitionSchema.partial();

const createCompetition = async (req, res, next) => {
  try {
    const validatedData = competitionSchema.parse(req.body);
    const competition = new Competition(validatedData);
    await competition.save();

    res.status(201).json({
      success: true,
      message: 'Competition created successfully',
      data: competition,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation Error', errors: error.errors });
    }
    next(error);
  }
};

const listCompetitions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = { isDeleted: false };

    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: 'i' };
    }

    if (req.query.status && ['draft', 'active', 'archived'].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const total = await Competition.countDocuments(filter);
    const competitions = await Competition.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: competitions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getCompetitionById = async (req, res, next) => {
  try {
    const competition = await Competition.findOne({ _id: req.params.id, isDeleted: false });

    if (!competition) {
      return res.status(404).json({ success: false, message: 'Competition not found' });
    }

    res.status(200).json({
      success: true,
      data: competition,
    });
  } catch (error) {
    next(error);
  }
};

const updateCompetition = async (req, res, next) => {
  try {
    const validatedData = updateCompetitionSchema.parse(req.body);

    const competition = await Competition.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { $set: validatedData },
      { new: true, runValidators: true }
    );

    if (!competition) {
      return res.status(404).json({ success: false, message: 'Competition not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Competition updated successfully',
      data: competition,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation Error', errors: error.errors });
    }
    next(error);
  }
};

const archiveCompetition = async (req, res, next) => {
  try {
    const competition = await Competition.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { $set: { isDeleted: true, status: 'archived' } },
      { new: true }
    );

    if (!competition) {
      return res.status(404).json({ success: false, message: 'Competition not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Competition archived successfully',
      data: competition,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCompetition,
  listCompetitions,
  getCompetitionById,
  updateCompetition,
  archiveCompetition,
};
