const mongoose = require('mongoose');

const categoryGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: String,
      default: '',
    },
    criteria: {
      type: String,
      default: '',
    },
    rules: {
      type: String,
      default: '',
    },
    pictures: {
      type: [String],
      default: [],
    },
  },
  { _id: true }
);

const competitionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      default: 'General',
    },
    categories: {
      type: [String],
      default: ['General'],
    },
    categoryGroups: {
      type: [categoryGroupSchema],
      default: [],
    },
    topicType: {
      type: String,
      default: 'সাধারণ (General)',
      trim: true,
    },
    topicTypes: {
      type: [String],
      default: ['সাধারণ (General)'],
    },
    minAge: {
      type: Number,
      default: 0,
      min: 0,
      max: 120,
    },
    maxAge: {
      type: Number,
      default: 0,
      min: 0,
      max: 120,
    },
    description: {
      type: String,
      default: '',
    },
    mainRules: {
      type: String,
      default: '',
    },
    mainCriteria: {
      type: String,
      default: '',
    },
    galleryImages: {
      type: [String],
      default: [],
    },
    startDate: {
      type: String,
      default: '',
    },
    endDate: {
      type: String,
      default: '',
    },
    resultPublishDate: {
      type: String,
      default: '',
    },
    providesCertificate: {
      type: Boolean,
      default: true,
    },
    prizes: {
      firstPrize: { type: String, default: '' },
      secondPrize: { type: String, default: '' },
      thirdPrize: { type: String, default: '' },
      topNPrizes: { type: String, default: '' },
      allParticipantPrize: { type: String, default: '' },
    },
    refPrefix: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    refPadding: {
      type: Number,
      default: 0,
      min: 0,
      max: 6,
    },
    sourceLink: {
      type: String,
      default: '',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'draft',
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

competitionSchema.index({ isDeleted: 1, status: 1 });

module.exports = mongoose.models.Competition || mongoose.model('Competition', competitionSchema);
