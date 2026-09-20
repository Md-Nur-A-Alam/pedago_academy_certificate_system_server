const mongoose = require('mongoose');

const homePageButtonSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    label: {
      type: String,
      default: 'সার্টিফিকেট ডাউনলোড করুন',
      trim: true,
    },
    link: {
      type: String,
      default: '/certificates',
      trim: true,
    },
    bgColor: {
      type: String,
      default: '#F0442E',
    },
    textColor: {
      type: String,
      default: '#FFFFFF',
    },
    variant: {
      type: String,
      enum: ['solid', 'outline'],
      default: 'solid',
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const pictureStyleSchema = new mongoose.Schema(
  {
    borderWidth: {
      type: Number,
      default: 4,
      min: 0,
      max: 20,
    },
    borderColor: {
      type: String,
      default: 'rgba(255, 255, 255, 0.2)',
    },
    borderStyle: {
      type: String,
      enum: ['solid', 'dashed', 'double', 'none'],
      default: 'solid',
    },
    shadow: {
      type: String,
      enum: ['none', 'soft', 'strong', 'glow'],
      default: 'glow',
    },
    shadowColor: {
      type: String,
      default: 'rgba(245, 158, 11, 0.4)',
    },
    animation: {
      type: String,
      enum: ['none', 'float', 'pulse-glow', 'morph-amoeba'],
      default: 'float',
    },
    shape: {
      type: String,
      enum: ['rounded', 'circle', 'amoeba', 'squircle'],
      default: 'rounded',
    },
    size: {
      type: String,
      enum: ['small', 'medium', 'large'],
      default: 'medium',
    },
    fadeStyle: {
      type: String,
      enum: ['none', 'bottom', 'vignette', 'radial'],
      default: 'bottom',
    },
  },
  { _id: false }
);

const homepageSettingSchema = new mongoose.Schema(
  {
    hero: {
      badgeText: {
        type: String,
        default: 'Official Verification Portal',
        trim: true,
      },
      showBadge: {
        type: Boolean,
        default: true,
      },
      title: {
        type: String,
        default: 'Verify & Download Your Pedago Academy Certificates',
        trim: true,
      },
      titleHighlight: {
        type: String,
        default: 'Pedago Academy',
        trim: true,
      },
      titleColor: {
        type: String,
        default: '#FFFFFF',
      },
      titleHighlightColor: {
        type: String,
        default: '#F59E0B',
      },
      subtitle: {
        type: String,
        default: 'আপনার অনন্য রেফারেন্স কোড বা ফোন নম্বর দিয়ে অফিশিয়াল সার্টিফিকেট ও সোশ্যাল মিডিয়া পোস্টার ডাউনলোড করুন সহজে।',
        trim: true,
      },
      subtitleColor: {
        type: String,
        default: 'rgba(255, 255, 255, 0.9)',
      },
      layoutMode: {
        type: String,
        enum: ['background', 'flex'],
        default: 'background',
      },
      imageUrl: {
        type: String,
        default: '/HeroBG.jpg',
      },
      bgOverlayColor: {
        type: String,
        default: '#1A284A',
      },
      bgType: {
        type: String,
        enum: ['solid', 'gradient'],
        default: 'solid',
      },
      bgSolidColor: {
        type: String,
        default: '#1A284A',
      },
      bgGradient: {
        direction: {
          type: String,
          enum: ['to-r', 'to-br', 'to-b', 'to-tr', 'radial'],
          default: 'to-r',
        },
        colorStart: {
          type: String,
          default: '#1A284A',
        },
        colorEnd: {
          type: String,
          default: '#29479B',
        },
      },
      bgOverlayOpacity: {
        type: Number,
        min: 0,
        max: 100,
        default: 80,
      },
      showButtons: {
        type: Boolean,
        default: true,
      },
      pictureStyle: {
        type: pictureStyleSchema,
        default: () => ({}),
      },
      buttons: {
        type: [homePageButtonSchema],
        default: () => [
          {
            id: 'btn-1',
            label: 'সার্টিফিকেট ডাউনলোড করুন',
            link: '/certificates',
            bgColor: '#F0442E',
            textColor: '#FFFFFF',
            variant: 'solid',
            isVisible: true,
          },
          {
            id: 'btn-2',
            label: 'প্রতিযোগিতা দেখুন',
            link: '/competitions',
            bgColor: '#29479B',
            textColor: '#FFFFFF',
            variant: 'outline',
            isVisible: true,
          },
        ],
      },
    },
    featuredCompetitions: {
      title: {
        type: String,
        default: 'চলমান ও জনপ্রিয় প্রতিযোগিতা | Featured Competitions',
        trim: true,
      },
      subtitle: {
        type: String,
        default: 'পেডাগো একাডেমির সকল সক্রিয় ও সাম্প্রতিক প্রতিযোগিতার ফলাফল ও সার্টিফিকেট',
        trim: true,
      },
      limit: {
        type: Number,
        default: 6,
        min: 1,
        max: 24,
      },
      showSection: {
        type: Boolean,
        default: true,
      },
    },
    quickPortals: {
      title: {
        type: String,
        default: 'Quick Access Portals',
        trim: true,
      },
      subtitle: {
        type: String,
        default: 'খুব সহজেই আপনার সার্টিফিকেট যাচাই করুন, ডাউনলোড করুন অথবা সোশ্যাল মিডিয়ায় শেয়ারের জন্য পোস্টার তৈরি করুন',
        trim: true,
      },
      showSection: {
        type: Boolean,
        default: true,
      },
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

// Explicitly bind to user's created 'homepageSetting' collection in MongoDB
module.exports =
  mongoose.models.HomepageSetting ||
  mongoose.model('HomepageSetting', homepageSettingSchema, 'homepageSetting');
