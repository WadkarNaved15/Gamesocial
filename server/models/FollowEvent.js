import mongoose from "mongoose";

const followEventSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    action: {
      type: String,
      enum: ["follow", "unfollow"],
      required: true,
      index: true,
    },

    source: {
      type: String,
      enum: ["web", "mobile", "api"],
      default: "web",
    },
  },
  {
    timestamps: true,
  }
);

followEventSchema.index({
  following: 1,
  createdAt: -1,
});

followEventSchema.index({
  follower: 1,
  createdAt: -1,
});

followEventSchema.index({
  action: 1,
  createdAt: -1,
});

export default mongoose.model(
  "FollowEvent",
  followEventSchema
);

