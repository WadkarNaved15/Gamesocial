import mongoose from "mongoose";

const GameSessionRequestSchema = new mongoose.Schema(
  {
    gamePost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AllPost",
      required: true,
      index: true,
    },

    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    message: {
      type: String,
      trim: true,
      maxlength: 250,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "pending",
        "notified",
      ],
      default: "pending",
      index: true,
    },

    notifiedAt: {
      type: Date,
      default: null,
    },
    comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
    default: null,
},
  },
  {
    timestamps: true,
  }
);

GameSessionRequestSchema.index(
  {
    gamePost: 1,
    requestedBy: 1,
  },
  {
    unique: true,
  }
);

export default mongoose.model(
  "GameSessionRequest",
  GameSessionRequestSchema
);