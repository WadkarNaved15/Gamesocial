import mongoose from "mongoose";

const PostAnalyticsSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AllPost",
      required: true,
      unique: true,
      index: true,
    },

    totalViews: {
      type: Number,
      default: 0,
      min: 0,
    },

    uniqueViews: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalWatchTimeMs: {
      type: Number,
      default: 0,
      min: 0,
    },

    avgWatchTimeMs: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastViewedAt: {
      type: Date,
      default: null,
    },

    viewsBySource: {
      feed: { type: Number, default: 0 },
      profile: { type: Number, default: 0 },
      search: { type: Number, default: 0 },
      direct: { type: Number, default: 0 },
      share: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },

    viewsByDevice: {
      desktop: { type: Number, default: 0 },
      mobile: { type: Number, default: 0 },
      tablet: { type: Number, default: 0 },
      bot: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },

    dailyStats: [
      {
        date: {
          type: String, // "2026-06-02"
          required: true,
        },
        views: { type: Number, default: 0 },
        uniqueViews: { type: Number, default: 0 },
        watchTimeMs: { type: Number, default: 0 },
      },
    ],

    hourlyStats: [
      {
        hour: {
          type: String, // "2026-06-02T14:00:00Z"
          required: true,
        },
        views: { type: Number, default: 0 },
        uniqueViews: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

PostAnalyticsSchema.index({ post: 1 }, { unique: true });

export default mongoose.model("PostAnalytics", PostAnalyticsSchema);
