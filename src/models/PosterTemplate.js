const mongoose = require('mongoose');

const photoZoneSchema = new mongoose.Schema(
  {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    w: { type: Number, default: 200 },
    h: { type: Number, default: 200 },
    shape: { type: String, enum: ['circle', 'square', 'rounded'], default: 'circle' },
  },
  { _id: false }
);

const posterTemplateSchema = new mongoose.Schema(
  {
    competitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
    },
    type: {
      type: String,
      enum: ['winner', 'participant'],
      required: true,
    },
    backgroundImageUrl: {
      type: String,
      required: true,
    },
    photoZone: {
      type: photoZoneSchema,
      default: () => ({}),
    },
    textZones: [
      {
        key: { type: String },
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        font: { type: String, default: 'Montserrat' },
        style: { type: String, default: 'normal' },
        size: { type: Number, default: 20 },
        color: { type: String, default: '#1A284A' },
        align: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
      },
    ],
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

posterTemplateSchema.index({ competitionId: 1, type: 1 });

module.exports = mongoose.models.PosterTemplate || mongoose.model('PosterTemplate', posterTemplateSchema);
