import mongoose from "mongoose";

const userSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    source: {
      type: String,
      enum: ["web", "mobile"],
      default: "web",
      index: true,
    },

    startedAt: {
      type: Date,
      required: true,
      index: true,
    },

    lastActivityAt: {
      type: Date,
      required: true,
      index: true,
    },

    endedAt: {
      type: Date,
      default: null,
    },

    lastHeartbeatAt: {
      type: Date,
      default: Date.now,
    },

    durationMs: {
      type: Number,
      default: 0,
    },

    activeTimeMs: {
      type: Number,
      default: 0,
    },

    pageViews: {
      type: Number,
      default: 0,
    },

    actions: {
      type: Number,
      default: 0,
    },

    geo: {
      countryCode: String,
      country: String,

      region: String,
      city: String,

      timezone: String,

      latitude: Number,
      longitude: Number,

      postalCode: String,

      detectedAt: {
        type: Date,
        default: Date.now
      },

      isp: {
        name: String,
        organization: String,
        asn: Number
      }
    },

    device: {
      deviceType: {
        type: String,
        enum: [
          "desktop",
          "mobile",
          "tablet",
          "smarttv",
          "console",
          "bot",
          "unknown"
        ],
        default: "unknown"
      },

      vendor: String,
      model: String,

      browser: String,
      browserVersion: String,

      operatingSystem: String,
      operatingSystemVersion: String
    },

    locale: {
      language: String,
      languages: [String]
    },
    isBounce: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

userSessionSchema.index({
  user: 1,
  startedAt: -1,
});

userSessionSchema.index({
  startedAt: -1,
});

userSessionSchema.index({
  lastActivityAt: -1,
});

userSessionSchema.index({
  "geo.countryCode": 1,
  startedAt: -1
});

export default mongoose.model(
  "UserSession",
  userSessionSchema
);