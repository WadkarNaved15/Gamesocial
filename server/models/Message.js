import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // normal text
    text: { type: String, default: "" },

    // media
    mediaUrl: { type: String, default: null },
    mediaKey: {
      type: String,
      default: null,
    },
    mediaType: { type: String, enum: ["image", "video", null], default: null },

    // 🔥 post sharing
    messageType: {
      type: String,
      enum: ["text", "media", "post"],
      default: "text"
    },

    sharedPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null
    },
    // reply message
    replyTo: {
      messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null,
      },

      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      text: {
        type: String,
        default: null,
        maxlength: 5000,
      },

      messageType: {
        type: String,
        enum: ["text", "media", "post", null],
        default: null,
      },

      mediaType: {
        type: String,
        enum: ["image", "video", null],
        default: null,
      },

      mediaUrl: {
        type: String,
        default: null,
      },
    },
    seen: {
      type: Boolean,
      default: false
    },
    seenAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

messageSchema.index({
  chatId: 1,
  createdAt: -1,
  _id: -1
});

messageSchema.index({
  receiverId: 1,
  seen: 1,
});

messageSchema.index({
  receiverId: 1,
  chatId: 1,
  seen: 1,
});

messageSchema.index({
  senderId: 1,
  receiverId: 1,
});

const Message = mongoose.model("Message", messageSchema);
export default Message;
