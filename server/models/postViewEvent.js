import mongoose from "mongoose";

const PostViewEventSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AllPost",
      required: true,
      index: true,
    },

    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    source: {
      type: String,
      enum: ["feed", "profile", "search", "direct", "share", "other"],
      default: "other",
    },

    deviceType: {
      type: String,
      enum: ["desktop", "mobile", "tablet", "other"],
      default: "other",
    },

    watchTimeMs: {
      type: Number,
      default: 0,
    },

    isUnique: {
      type: Boolean,
      default: true,
    },

    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

PostViewEventSchema.index({ post: 1, viewer: 1 });
PostViewEventSchema.index({ post: 1, viewedAt: -1 });

export default mongoose.model("PostViewEvent", PostViewEventSchema);