import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema({
    post: { type: mongoose.Schema.Types.ObjectId, ref: "AllPost", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, maxlength: 2000 },
    review: {
        isGameReview: {
            type: Boolean,
            default: false,
            index: true,
        },

        feedback: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "GameFeedback",
            default: null,
        },
    },
    mentions: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        originalUsername: {
            type: String,
            required: true,
        },
    }],
    hasInteractMention: {
        type: Boolean,
        default: false,
    },
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true });
CommentSchema.index({ post: 1, createdAt: -1 });
CommentSchema.index({ user: 1 });
CommentSchema.index({ mentions: 1 });
CommentSchema.index({
    "review.isGameReview": 1,
});
export default mongoose.model("Comment", CommentSchema);
