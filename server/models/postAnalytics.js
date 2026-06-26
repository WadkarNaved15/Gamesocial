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

    // ─── TOP-LEVEL COUNTERS (kept for fast reads / backward compat) ───────────
    totalViews: { type: Number, default: 0, min: 0 },
    uniqueViews: { type: Number, default: 0, min: 0 },
    totalWatchTimeMs: { type: Number, default: 0, min: 0 },
    avgWatchTimeMs: { type: Number, default: 0, min: 0 },

    lastViewedAt: { type: Date, default: null },

    viewsBySource: {
      feed:    { type: Number, default: 0 },
      profile: { type: Number, default: 0 },
      search:  { type: Number, default: 0 },
      direct:  { type: Number, default: 0 },
      share:   { type: Number, default: 0 },
      other:   { type: Number, default: 0 },
    },

    viewsByDevice: {
      desktop: { type: Number, default: 0 },
      mobile:  { type: Number, default: 0 },
      tablet:  { type: Number, default: 0 },
      bot:     { type: Number, default: 0 },
      other:   { type: Number, default: 0 },
    },

    // ─── LIFETIME BLOCK ──────────────────────────────────────────────────────
    // Single source of truth for all-time aggregates.
    // Updated atomically whenever an event is processed.
    lifetime: {
      views:          { type: Number, default: 0, min: 0 },
      uniqueViews:    { type: Number, default: 0, min: 0 },
      watchTimeMs:    { type: Number, default: 0, min: 0 },

      likes:          { type: Number, default: 0, min: 0 },
      comments:       { type: Number, default: 0, min: 0 },
      shares: {
        type: Number,
        default: 0,
        min: 0,
      },
      saves: {
        type: Number,
        default: 0,
        min: 0,
      },

      demoConsumptions: { type: Number, default: 0, min: 0 },

      // Game-specific
      sessions:         { type: Number, default: 0, min: 0 },
      sessionPlayTimeMs:{ type: Number, default: 0, min: 0 },

      uniquePlayers:    { type: Number, default: 0, min: 0 },
      repeatPlayers:    { type: Number, default: 0, min: 0 },
    },

    // ─── DAILY STATS ─────────────────────────────────────────────────────────
    dailyStats: [
      {
        date: { type: String, required: true }, // "YYYY-MM-DD"

        views:       { type: Number, default: 0, min: 0 },
        uniqueViews: { type: Number, default: 0, min: 0 },
        watchTimeMs: { type: Number, default: 0, min: 0 },

        likes:    { type: Number, default: 0 }, // can go negative transiently
        comments: { type: Number, default: 0 },
        shares: {
          type: Number,
          default: 0
        },
        saves: {
          type: Number,
          default: 0,
        },

        demoConsumptions: { type: Number, default: 0, min: 0 },

        // Game-specific
        sessions:         { type: Number, default: 0, min: 0 },
        sessionPlayTimeMs:{ type: Number, default: 0, min: 0 },

        uniquePlayers: { type: Number, default: 0, min: 0 },
      },
    ],

    hourlyStats: [
      {
        hour:        { type: String, required: true }, // "2026-06-02T14:00:00Z"
        views:       { type: Number, default: 0 },
        uniqueViews: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

PostAnalyticsSchema.index({ post: 1 }, { unique: true });
// Speeds up dailyStats range queries in the analytics route
PostAnalyticsSchema.index({ post: 1, "dailyStats.date": 1 });

export default mongoose.model("PostAnalytics", PostAnalyticsSchema);