import mongoose from "mongoose";

const userActivityEventSchema =
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      sessionId: {
        type: String,
        required: true,
        index: true,
      },

      eventType: {
        type: String,
        required: true,
        index: true,
      },

      targetType: {
        type: String,
        enum: [
          "post",
          "game_post",
          "model_post",
          "user",
          "comment",
          "ad",
          "search",
          "page",
          null,
        ],
        default: null,
        index: true,
      },

      targetId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
        index: true,
      },

      metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },

      source: {
        type: String,
        enum: ["web", "mobile"],
        default: "web",
      },

      createdAt: {
        type: Date,
        default: Date.now,
        index: true,
      },
    },
    {
      timestamps: false,
    }
  );

userActivityEventSchema.index({
  user: 1,
  createdAt: -1,
});

userActivityEventSchema.index({
  eventType: 1,
  createdAt: -1,
});

userActivityEventSchema.index({
  targetType: 1,
  targetId: 1,
});

userActivityEventSchema.index({
  sessionId: 1,
});

export default mongoose.model(
  "UserActivityEvent",
  userActivityEventSchema
);