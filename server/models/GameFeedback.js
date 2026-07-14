import mongoose from "mongoose";

const GameFeedbackSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GameSession",
      required: true,
      unique: true, // one feedback per session
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

    overall: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },

    suggestions: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    
    // Snapshot values copied from the session
    playTimeMs: {
      type: Number,
      default: 0,
    },

    creditsConsumed: {
      type: Number,
      default: 0,
    },

    queueType: {
      type: String,
      enum: ["direct", "queued"],
    },

    exitReason: {
      type: String,
    },

    sessionStartedAt: Date,
    sessionEndedAt: Date,
  },
  {
    timestamps: true,
  }
);

GameFeedbackSchema.index({
  gamePost: 1,
  createdAt: -1,
});

GameFeedbackSchema.index({
  user: 1,
  createdAt: -1,
});

export default mongoose.model("GameFeedback", GameFeedbackSchema);