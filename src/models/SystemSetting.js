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
