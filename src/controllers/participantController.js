const { z } = require('zod');
const Participant = require('../models/Participant');
const Competition = require('../models/Competition');

const participantSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  competitionId: z.string().min(1, 'Competition ID is required'),
  achievementType: z.enum(['participant', 'winner']).default('participant'),
});

const generateRefNumber = async (competition) => {
  // Count existing participants for this competition to determine next index
  const count = await Participant.countDocuments({ competitionId: competition._id });
  const nextNum = count + 1;
  const paddedNum = String(nextNum).padStart(competition.refPadding || 0, '0');
  return `${competition.refPrefix}-${paddedNum}`;
};

const createParticipant = async (req, res, next) => {
  try {
    const validatedData = participantSchema.parse(req.body);

    const competition = await Competition.findOne({ _id: validatedData.competitionId, isDeleted: false });
    if (!competition) {
      return res.status(404).json({ success: false, message: 'Competition not found' });
    }

    const refNumber = await generateRefNumber(competition);

    const participant = new Participant({
      ...validatedData,
      refNumber,
    });

    await participant.save();

    res.status(201).json({
      success: true,
      message: 'Participant created successfully',
      data: participant,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation Error', errors: error.errors });
    }
    next(error);
  }
};

const listParticipants = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = { isDeleted: false };

    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: 'i' };
      filter.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { refNumber: searchRegex },
      ];
    }

    if (req.query.competitionId) {
      filter.competitionId = req.query.competitionId;
    }

    if (req.query.achievementType && ['participant', 'winner'].includes(req.query.achievementType)) {
      filter.achievementType = req.query.achievementType;
    }

    const total = await Participant.countDocuments(filter);
    const participants = await Participant.find(filter)
      .populate('competitionId', 'name refPrefix refPadding')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: participants,
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

const updateParticipant = async (req, res, next) => {
  try {
    const participant = await Participant.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!participant) {
      return res.status(404).json({ success: false, message: 'Participant not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Participant updated successfully',
      data: participant,
    });
  } catch (error) {
    next(error);
  }
};

const archiveParticipant = async (req, res, next) => {
  try {
    const participant = await Participant.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!participant) {
      return res.status(404).json({ success: false, message: 'Participant not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Participant archived successfully',
      data: participant,
    });
  } catch (error) {
    next(error);
  }
};

const bulkUpload = async (req, res, next) => {
  try {
    const { competitionId, rows } = req.body;
    if (!competitionId || !Array.isArray(rows)) {
      return res.status(400).json({ success: false, message: 'Invalid bulk upload payload' });
    }

    const competition = await Competition.findOne({ _id: competitionId, isDeleted: false });
    if (!competition) {
      return res.status(404).json({ success: false, message: 'Competition not found' });
    }

    let count = await Participant.countDocuments({ competitionId });
    const inserted = [];
    const duplicates = [];

    for (const row of rows) {
      if (!row.name || !row.phone) continue;

      // Check for duplicate by phone + competition
      const existing = await Participant.findOne({
        competitionId,
        phone: row.phone.trim(),
        isDeleted: false,
      });

      if (existing) {
        duplicates.push({ row, existing });
        continue;
      }

      count += 1;
      const paddedNum = String(count).padStart(competition.refPadding || 0, '0');
      const refNumber = `${competition.refPrefix}-${paddedNum}`;

      const participant = new Participant({
        name: row.name.trim(),
        phone: row.phone.trim(),
        competitionId,
        refNumber,
        achievementType: row.achievementType === 'winner' ? 'winner' : 'participant',
      });

      await participant.save();
      inserted.push(participant);
    }

    res.status(200).json({
      success: true,
      message: `Bulk import processed: ${inserted.length} inserted, ${duplicates.length} duplicates flagged.`,
      data: {
        insertedCount: inserted.length,
        duplicateCount: duplicates.length,
        duplicates,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createParticipant,
  listParticipants,
  updateParticipant,
  archiveParticipant,
  bulkUpload,
};
