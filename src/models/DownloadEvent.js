const mongoose = require('mongoose');

const downloadEventSchema = new mongoose.Schema(
  {
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant',
      required: true,
    },
    eventType: {
      type: String,
      enum: ['certificate_download', 'validation', 'poster_download'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

downloadEventSchema.index({ participantId: 1, eventType: 1 });

module.exports = mongoose.models.DownloadEvent || mongoose.model('DownloadEvent', downloadEventSchema);
