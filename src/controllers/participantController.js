const { z } = require('zod');
const Participant = require('../models/Participant');
const Competition = require('../models/Competition');
const CertificateTemplate = require('../models/CertificateTemplate');
const PosterTemplate = require('../models/PosterTemplate');

const participantSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  age: z.coerce.number().min(1, 'Age must be at least 1').max(120, 'Invalid age'),
  category: z.string().min(1, 'Category is required').default('General'),
  competitionId: z.string().min(1, 'Competition ID is required'),
  achievementType: z.enum(['participant', 'winner']).default('participant'),
  sourceUrl: z.string().min(1, 'Source URL is required'),
  mediaUrl: z.string().optional().default(''),
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
        { category: searchRegex },
      ];
    }

    if (req.query.competitionId) {
      filter.competitionId = req.query.competitionId;
    }

    if (req.query.category) {
      filter.category = { $regex: req.query.category, $options: 'i' };
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
    const { competitionId, achievementType, rows } = req.body;
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

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row.name ? String(row.name).trim() : '';
      const phone = row.phone ? String(row.phone).trim() : '';
      const sourceUrl = row.sourceUrl ? String(row.sourceUrl).trim() : '';
      const mediaUrl = row.mediaUrl ? String(row.mediaUrl).trim() : '';
      const age = Number(row.age) || 0;

      const category = (row.category || row.Category || row.CATEGORY || 'General').toString().trim();

      if (!name || !phone || !sourceUrl) {
        continue;
      }

      // Check for duplicate by phone + competition + category
      // (A single person can participate in multiple categories and competitions)
      const escapedCategory = category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existing = await Participant.findOne({
        competitionId,
        phone,
        category: { $regex: new RegExp(`^${escapedCategory}$`, 'i') },
        isDeleted: false,
      });

      if (existing) {
        duplicates.push({
          rowNumber: i + 1,
          name,
          phone,
          category,
          age: age || existing.age || 'N/A',
          sourceUrl,
          existingRefNumber: existing.refNumber,
          reason: `Phone already registered in this competition under Category "${category}" (Ref: ${existing.refNumber})`,
        });
        continue;
      }

      // Generate unique refNumber
      let refNumber = '';
      let isUnique = false;
      while (!isUnique) {
        count += 1;
        const paddedNum = String(count).padStart(competition.refPadding || 0, '0');
        refNumber = `${competition.refPrefix}-${paddedNum}`;
        const refExists = await Participant.findOne({ refNumber });
        if (!refExists) {
          isUnique = true;
        }
      }

      const participant = new Participant({
        name,
        phone,
        age: age > 0 ? age : 18,
        category,
        sourceUrl,
        mediaUrl,
        competitionId,
        refNumber,
        achievementType: (row.achievementType || achievementType || 'participant') === 'winner' ? 'winner' : 'participant',
      });

      await participant.save();
      inserted.push(participant);
    }

    res.status(200).json({
      success: true,
      message: `Bulk import completed: ${inserted.length} added, ${duplicates.length} duplicate rows skipped.`,
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

// Public lookup/verify endpoint with 6-digit phone matching and multi-result support
const verifyParticipant = async (req, res, next) => {
  try {
    const { refNumber, phone, query: searchQuery } = req.query;
    const input = (searchQuery || phone || refNumber || '').trim();

    if (!input) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a Reference Number or Phone Number',
      });
    }

    const digits = input.replace(/\D/g, '');
    let filter = { isDeleted: false };

    // If search term has 6 or more digits, match by last 6 digits of phone
    if (digits.length >= 6) {
      const last6 = digits.slice(-6);
      const phonePattern = last6.split('').join('\\D*') + '\\D*$';
      filter = {
        isDeleted: false,
        $or: [
          { phone: { $regex: new RegExp(phonePattern) } },
          { refNumber: input.toUpperCase() },
        ],
      };
    } else {
      filter = {
        isDeleted: false,
        $or: [
          { refNumber: input.toUpperCase() },
          { phone: input },
        ],
      };
    }

    if (req.query.competitionId) {
      filter.competitionId = req.query.competitionId;
    }

    const participants = await Participant.find(filter)
      .populate('competitionId', 'name refPrefix description imageUrl category')
      .sort({ createdAt: -1 });

    if (!participants || participants.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No participant record found with this reference code or phone number.',
      });
    }

    // Increment validation counters
    const participantIds = participants.map((p) => p._id);
    await Participant.updateMany(
      { _id: { $in: participantIds } },
      { $inc: { validatedCount: 1 }, $set: { lastValidatedAt: new Date() } }
    );

    // Fetch corresponding certificate and poster templates for each matching participant
    const results = await Promise.all(
      participants.map(async (p) => {
        const certTemplate = await CertificateTemplate.findOne({
          competitionId: p.competitionId?._id,
          variant: p.achievementType,
          isActive: true,
        });

        const posterTemplate = await PosterTemplate.findOne({
          competitionId: p.competitionId?._id,
          type: p.achievementType,
        });

        return {
          participant: {
            _id: p._id,
            name: p.name,
            phone: p.phone,
            age: p.age,
            category: p.category || 'General',
            refNumber: p.refNumber,
            achievementType: p.achievementType,
            mediaUrl: p.mediaUrl,
            competition: p.competitionId,
            downloadCount: p.downloadCount,
            posterDownloadCount: p.posterDownloadCount,
            validatedCount: p.validatedCount,
          },
          certificateTemplate: certTemplate || null,
          posterTemplate: posterTemplate || null,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        // Backwards compatibility for single-result consumers
        participant: results[0].participant,
        certificateTemplate: results[0].certificateTemplate,
        posterTemplate: results[0].posterTemplate,
        // All matching entries across categories and competitions
        totalResults: results.length,
        results,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Public update photo endpoint (for public poster generation)
const updateParticipantPhoto = async (req, res, next) => {
  try {
    const { refNumber, mediaUrl } = req.body;
    if (!refNumber || !mediaUrl) {
      return res.status(400).json({
        success: false,
        message: 'Reference number and media URL are required',
      });
    }

    const participant = await Participant.findOne({
      refNumber: refNumber.trim().toUpperCase(),
      isDeleted: false,
    });

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found',
      });
    }

    participant.mediaUrl = mediaUrl;
    await participant.save();

    res.status(200).json({
      success: true,
      message: 'Participant photo updated successfully',
      data: {
        mediaUrl: participant.mediaUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Public track download count
const recordDownload = async (req, res, next) => {
  try {
    const { refNumber, type = 'certificate' } = req.body;
    if (!refNumber) {
      return res.status(400).json({ success: false, message: 'Reference number is required' });
    }

    const participant = await Participant.findOne({
      refNumber: refNumber.trim().toUpperCase(),
      isDeleted: false,
    });

    if (!participant) {
      return res.status(404).json({ success: false, message: 'Participant not found' });
    }

    if (type === 'poster') {
      participant.posterDownloadCount = (participant.posterDownloadCount || 0) + 1;
    } else {
      participant.downloadCount = (participant.downloadCount || 0) + 1;
    }
    participant.lastDownloadedAt = new Date();
    await participant.save();

    res.status(200).json({
      success: true,
      data: {
        downloadCount: participant.downloadCount,
        posterDownloadCount: participant.posterDownloadCount,
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
  verifyParticipant,
  updateParticipantPhoto,
  recordDownload,
};
