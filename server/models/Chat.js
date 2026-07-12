// models/Chat.js
import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
  },

  { timestamps: true }
);

// Ensure a chat between two users is not duplicated
chatSchema.index({ participants: 1 }, { unique: true });

const Chat = mongoose.model("Chat", chatSchema);
chatSchema.index({ participants: 1 });
export default Chat;