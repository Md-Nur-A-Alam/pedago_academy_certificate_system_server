const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    competitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
    },
    refNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    age: {
      type: Number,
      required: true,
      min: 1,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      default: 'General',
    },
    sourceUrl: {
      type: String,
      required: true,
      trim: true,
    },
    mediaUrl: {
      type: String,
      default: '',
      trim: true,
    },
    achievementType: {
      type: String,
      enum: ['participant', 'winner'],
      default: 'participant',
      required: true,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    lastDownloadedAt: {
      type: Date,
      default: null,
    },
    validatedCount: {
      type: Number,
      default: 0,
    },
    lastValidatedAt: {
      type: Date,
      default: null,
    },
    posterDownloadCount: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

participantSchema.index({ competitionId: 1, achievementType: 1 });
participantSchema.index({ name: 'text', phone: 1 });

module.exports = mongoose.models.Participant || mongoose.model('Participant', participantSchema);
