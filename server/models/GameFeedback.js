import mongoose from "mongoose";

const GameFeedbackSchema = new mongoose.Schema(
  {
    // 👤 user who submitted feedback
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 🎮 session reference (VERY IMPORTANT for deduplication)
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GameSession",
      required: true,
      unique: true, // 🔥 ensures only 1 feedback per session
      index: true,
    },

    // 🎮 game reference (optional but useful for analytics)
    game: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AllPost",
      required: true,
      index: true,
    },

    // ⭐ ratings
    ratings: {
      overall: { type: Number, required: true, min: 1, max: 5 },
      gameplay: { type: Number, default: 0, min: 0, max: 5 },
      graphics: { type: Number, default: 0, min: 0, max: 5 },
      audio: { type: Number, default: 0, min: 0, max: 5 },
      performance: { type: Number, default: 0, min: 0, max: 5 },
    },

    // 👍 recommendation
    recommend: {
      type: Boolean,
      default: true,
    },

    // 💬 text feedback
    liked: {
      type: String,
      default: "",
      maxlength: 2000,
    },

    bugs: {
      type: String,
      default: "",
      maxlength: 2000,
    },

    suggestions: {
      type: String,
      default: "",
      maxlength: 2000,
    },

    // ⏱ optional analytics
    playTimeSeconds: {
      type: Number,
      default: 0,
    },

    // 🧠 metadata for future ML / ranking
    metadata: {
      device: String,
      browser: String,
      platform: String,
    },
  },
  {
    timestamps: true,
  }
);

// 🔥 IMPORTANT INDEXES
GameFeedbackSchema.index({ user: 1, createdAt: -1 });
GameFeedbackSchema.index({ game: 1, createdAt: -1 });

export default mongoose.model("GameFeedback", GameFeedbackSchema);