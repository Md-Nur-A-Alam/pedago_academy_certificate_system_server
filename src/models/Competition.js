const mongoose = require('mongoose');

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
    description: {
      type: String,
      default: '',
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
