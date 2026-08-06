import mongoose from "mongoose";

const StreamFeedbackSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GameSession",
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

    gamePost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AllPost",
      required: true,
      index: true,
    },

    issues: [
      {
        type: String,
        enum: [
          "connection_lost",
          "lag_stutter",
          "waiting_issues",
          "other",
        ],
      },
    ],

    playTimeMs: {
      type: Number,
      default: 0,
    },

    queueType: {
      type: String,
      enum: ["direct", "queued"],
    },

    creditsConsumed: {
      type: Number,
      default: 0,
    },

    exitReason: String,
  },
  {
    timestamps: true,
  }
);

StreamFeedbackSchema.index({
  gamePost: 1,
  createdAt: -1,
});

StreamFeedbackSchema.index({
  user: 1,
  createdAt: -1,
});

export default mongoose.model(
  "StreamFeedback",
  StreamFeedbackSchema
);