const mongoose = require('mongoose');

const textZoneSchema = new mongoose.Schema(
  {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    font: { type: String, default: 'Montserrat' },
    style: { type: String, default: 'normal' },
    size: { type: Number, default: 24 },
    color: { type: String, default: '#1A284A' },
    align: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
    rotation: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const dateZoneSchema = new mongoose.Schema(
  {
    x: { type: Number, default: 25 },
    y: { type: Number, default: 85 },
    font: { type: String, default: 'Montserrat' },
    style: { type: String, default: 'normal' },
    size: { type: Number, default: 16 },
    color: { type: String, default: '#1A284A' },
    align: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
    rotation: { type: Number, default: 0 },
    format: { type: String, default: 'DD/MM/YYYY' },
    enabled: { type: Boolean, default: false },
  },
  { _id: false }
);

const signatureZoneSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, default: '' },
    x: { type: Number, default: 75 },
    y: { type: Number, default: 85 },
    width: { type: Number, default: 16 },
    rotation: { type: Number, default: 0 },
    enabled: { type: Boolean, default: false },
  },
  { _id: false }
);

const certificateTemplateSchema = new mongoose.Schema(
  {
    competitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
    },
    variant: {
      type: String,
      enum: ['winner', 'participant'],
      required: true,
    },
    backgroundImageUrl: {
      type: String,
      required: true,
    },
    nameZone: {
      type: textZoneSchema,
      default: () => ({ enabled: true }),
    },
    refZone: {
      type: textZoneSchema,
      default: () => ({ enabled: true }),
    },
    dateZone: {
      type: dateZoneSchema,
      default: () => ({ enabled: false }),
    },
    signatureZone: {
      type: signatureZoneSchema,
      default: () => ({ enabled: false }),
    },
    version: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

certificateTemplateSchema.index({ competitionId: 1, variant: 1 });

module.exports = mongoose.models.CertificateTemplate || mongoose.model('CertificateTemplate', certificateTemplateSchema);
