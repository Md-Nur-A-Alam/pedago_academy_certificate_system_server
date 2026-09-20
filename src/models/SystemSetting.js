const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema(
  {
    heroBgUrl: {
      type: String,
      default: '/HeroBG.jpg',
    },
    logoUrl: {
      type: String,
      default: '/pedagoLogo.png',
    },
    siteTitle: {
      type: String,
      default: 'Pedago Academy',
    },
    contactEmail: {
      type: String,
      default: 'support@pedago.academy',
      trim: true,
    },
    contactPhone: {
      type: String,
      default: '+880 1700-000000',
      trim: true,
    },
    footerText: {
      type: String,
      default: 'Pedago Academy - Official Certificate & Poster Verification Portal',
      trim: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.SystemSetting || mongoose.model('SystemSetting', systemSettingSchema);
