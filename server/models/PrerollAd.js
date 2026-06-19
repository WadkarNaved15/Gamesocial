import mongoose from "mongoose";

const PrerollAdAssetSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
  },

  type: {
    type: String,
    enum: ["video"],
    default: "video",
  },

  // Original upload
  url: {
    type: String,
    required: true,
  },

  key: {
    type: String,
    required: true,
  },

  // Optimized version
  optimizedUrl: {
    type: String,
    default: null,
  },

  optimizedKey: {
    type: String,
    default: null,
  },

  thumbnailUrl: {
    type: String,
    default: null,
  },

  sizeMB: Number,

  optimizedSizeMB: Number,

processingStatus: {
  type: String,
  enum: [
    "pending",
    "processing",
    "completed",
    "failed",
  ],
  default: "pending",
},

processingError: {
  type: String,
  default: null,
},

processedAt: {
  type: Date,
  default: null,
},
},
{ _id: false }
);

const PrerollAdSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    brandName: {
      type: String,
      required: true,
      maxlength: 80,
    },

    brandLogo: {
      type: String,
      default: null,
    },

    ctaText: {
      type: String,
      default: "PLAY NOW",
      maxlength: 40,
    },

    ctaLink: {
      type: String,
      default: "",
    },

    asset: {
      type: PrerollAdAssetSchema,
      required: true,
    },

    mechanics: {
      duration: {
        type: Number,
        default: 15,
      },
    },

    performance: {
      impressions: {
        type: Number,
        default: 0,
      },

      clicks: {
        type: Number,
        default: 0,
      },

      completedViews: {
        type: Number,
        default: 0,
      },

      skippedViews: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("PrerollAd", PrerollAdSchema);