const { z } = require('zod');
const Competition = require('../models/Competition');
const CompetitionTopic = require('../models/CompetitionTopic');

const categoryGroupZodSchema = z.object({
  name: z.string().min(1, 'Category/group name is required').trim(),
  details: z.string().optional().default(''),
  criteria: z.string().optional().default(''),
  rules: z.string().optional().default(''),
  pictures: z.array(z.string()).max(2, 'Maximum 2 pictures allowed per category/group').optional().default([]),
});

const BASELINE_TOPICS = [
  'ছবি আঁকা',
  'চিঠি',
  'ভিডিও',
  'কবিতা আবৃত্তি',
  'রচনা / গল্প',
  'কুইজ',
  'সাধারণ (General)',
];

const ensureBaselineTopics = async () => {
  const count = await CompetitionTopic.countDocuments();
  if (count === 0) {
    for (const name of BASELINE_TOPICS) {
      await CompetitionTopic.updateOne(
        { name },
        { $setOnInsert: { name } },
        { upsert: true }
      );
    }
  }
};

const saveNewTopicsToDb = async (topicsArray = []) => {
  if (!Array.isArray(topicsArray)) return;
  for (const rawName of topicsArray) {
    if (typeof rawName === 'string' && rawName.trim()) {
      const name = rawName.trim();
      await CompetitionTopic.updateOne(
        { name },
        { $setOnInsert: { name } },
        { upsert: true }
      );
    }
  }
};

const prizesZodSchema = z.object({
  firstPrize: z.string().optional().default(''),
  secondPrize: z.string().optional().default(''),
  thirdPrize: z.string().optional().default(''),
  topNPrizes: z.string().optional().default(''),
  allParticipantPrize: z.string().optional().default(''),
}).optional().default({});

const competitionSchema = z.object({
  name: z.string().min(1, 'Competition name is required'),
  category: z.string().optional().default('General'),
  categories: z.array(z.string().min(1, 'Category name cannot be empty')).optional().default(['General']),
  categoryGroups: z.array(categoryGroupZodSchema).optional().default([]),
  topicType: z.string().optional().default('সাধারণ (General)'),
  topicTypes: z.array(z.string()).optional().default(['সাধারণ (General)']),
  minAge: z.coerce.number().min(0).max(120).optional().default(0),
  maxAge: z.coerce.number().min(0).max(120).optional().default(0),
  description: z.string().optional().default(''),
  mainRules: z.string().optional().default(''),
  mainCriteria: z.string().optional().default(''),
  galleryImages: z.array(z.string()).max(5, 'Maximum 5 gallery pictures allowed').optional().default([]),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  resultPublishDate: z.string().optional().default(''),
  providesCertificate: z.boolean().optional().default(true),
  prizes: prizesZodSchema,
  refPrefix: z.string().min(1, 'Reference prefix is required').toUpperCase().trim(),
  refPadding: z.number().min(0).max(6).optional().default(0),
  sourceLink: z.string().optional().default(''),
  imageUrl: z.string().optional().default(''),
  status: z.enum(['draft', 'active', 'archived']).optional().default('draft'),
});

const updateCompetitionSchema = competitionSchema.partial();

const syncCategoriesAndGroups = (data) => {
  if (data.categoryGroups && data.categoryGroups.length > 0) {
    data.categories = data.categoryGroups.map((g) => g.name.trim()).filter(Boolean);
    data.category = data.categories[0] || 'General';
  } else if (data.categories && data.categories.length > 0) {
    data.category = data.categories[0];
    data.categoryGroups = data.categories.map((c) => ({
      name: c,
      details: '',
      criteria: '',
      rules: '',
      pictures: [],
    }));
  } else if (data.category) {
    data.categories = [data.category];
    data.categoryGroups = [
      {
        name: data.category,
        details: '',
        criteria: '',
        rules: '',
        pictures: [],
      },
    ];
  }

  // Sync topicTypes and topicType
  if (data.topicTypes && data.topicTypes.length > 0) {
    data.topicType = data.topicTypes[0];
  } else if (data.topicType) {
    data.topicTypes = [data.topicType];
  }
};

const createCompetition = async (req, res, next) => {
  try {
    const validatedData = competitionSchema.parse(req.body);

    syncCategoriesAndGroups(validatedData);

    // Persist any newly added topics into CompetitionTopic collection
    if (validatedData.topicTypes && validatedData.topicTypes.length > 0) {
      await saveNewTopicsToDb(validatedData.topicTypes);
    } else if (validatedData.topicType) {
      await saveNewTopicsToDb([validatedData.topicType]);
    }

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

const getCompetitionTopics = async (req, res, next) => {
  try {
    // 1. Seed baseline topics directly into MongoDB if the collection is empty
    await ensureBaselineTopics();

    // 2. Also ensure any topics from previous competitions are captured in CompetitionTopic
    const fromTypes = await Competition.distinct('topicTypes', { isDeleted: false });
    const fromType = await Competition.distinct('topicType', { isDeleted: false });
    const prevTopics = [...fromTypes, ...fromType]
      .filter((t) => typeof t === 'string' && t.trim());

    if (prevTopics.length > 0) {
      await saveNewTopicsToDb(prevTopics);
    }

    // 3. Query topics strictly from the CompetitionTopic database collection
    const topicDocs = await CompetitionTopic.find().sort({ createdAt: 1, name: 1 });
    const topics = topicDocs.map((doc) => doc.name);

    res.status(200).json({
      success: true,
      data: topics,
    });
  } catch (error) {
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

    if (req.query.topic && req.query.topic !== 'all') {
      filter.$or = [
        { topicType: req.query.topic },
        { topicTypes: req.query.topic },
      ];
    }

    if (req.query.age) {
      const ageNum = parseInt(req.query.age, 10);
      if (!isNaN(ageNum) && ageNum > 0) {
        filter.$and = filter.$and || [];
        filter.$and.push(
          { $or: [{ minAge: { $lte: ageNum } }, { minAge: 0 }, { minAge: { $exists: false } }] },
          { $or: [{ maxAge: { $gte: ageNum } }, { maxAge: 0 }, { maxAge: { $exists: false } }] }
        );
      }
    }

    if (req.query.status && ['draft', 'active', 'archived'].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const total = await Competition.countDocuments(filter);
    const competitions = await Competition.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const sanitized = competitions.map((comp) => {
      const obj = comp.toObject();
      if ((!obj.categoryGroups || obj.categoryGroups.length === 0) && obj.categories?.length > 0) {
        obj.categoryGroups = obj.categories.map((cat) => ({
          name: cat,
          details: '',
          criteria: '',
          rules: '',
          pictures: [],
        }));
      }
      return obj;
    });

    res.status(200).json({
      success: true,
      data: sanitized,
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

    const compObj = competition.toObject();
    if ((!compObj.categoryGroups || compObj.categoryGroups.length === 0) && compObj.categories?.length > 0) {
      compObj.categoryGroups = compObj.categories.map((cat) => ({
        name: cat,
        details: '',
        criteria: '',
        rules: '',
        pictures: [],
      }));
    }

    res.status(200).json({
      success: true,
      data: compObj,
    });
  } catch (error) {
    next(error);
  }
};

const updateCompetition = async (req, res, next) => {
  try {
    const validatedData = updateCompetitionSchema.parse(req.body);

    syncCategoriesAndGroups(validatedData);

    // Persist any newly added topics into CompetitionTopic collection
    if (validatedData.topicTypes && validatedData.topicTypes.length > 0) {
      await saveNewTopicsToDb(validatedData.topicTypes);
    } else if (validatedData.topicType) {
      await saveNewTopicsToDb([validatedData.topicType]);
    }

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

const addCompetitionTopic = async (req, res, next) => {
  try {
    const rawNames = req.body.names || req.body.name || req.body.topic;
    const names = Array.isArray(rawNames)
      ? rawNames
      : typeof rawNames === 'string'
      ? rawNames.split(',')
      : [];

    const cleaned = names.map((n) => (typeof n === 'string' ? n.trim() : '')).filter(Boolean);

    if (cleaned.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid topic name is required',
      });
    }

    await saveNewTopicsToDb(cleaned);

    const topicDocs = await CompetitionTopic.find().sort({ createdAt: 1, name: 1 });
    const topics = topicDocs.map((doc) => doc.name);

    res.status(200).json({
      success: true,
      message: 'Topics saved successfully',
      data: topics,
    });
  } catch (error) {
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
  getCompetitionTopics,
  addCompetitionTopic,
  updateCompetition,
  archiveCompetition,
};
