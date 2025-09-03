import mongoose from "mongoose";

const PostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  description: { type: String, required: true },
  type: {
    type: String,
    enum: ["normal_post", "game_post","exe_post"],
    required: true,
    default: "normal_post"
  },
  media: [{ type: String }],
  gameUrl: { type: String }, // For game posts
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });


export default mongoose.model("Post", PostSchema);
