import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema({
    post: { type: mongoose.Schema.Types.ObjectId, ref: "AllPost", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, maxlength: 2000 },
    // ==================================================
    // NEW FIELDS FOR THREADING
    // ==================================================
    // null = top-level comment
    // ObjectId = reply
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
        default: null,
        index: true,
    },

    // Root comment of the thread.
    // null for top-level comments.
    rootComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
        default: null,
        index: true,
    },

    // Depth in tree.
    // Top level = 0
    // Reply = 1
    // Reply to reply = 2
    depth: {
        type: Number,
        default: 0,
        min: 0,
    },

    // Number of direct replies.
    // Used to show "View 8 replies".
    replyCount: {
        type: Number,
        default: 0,
        min: 0,
    },

    // Soft delete support.
    // Never physically delete immediately.
    isDeleted: {
        type: Boolean,
        default: false,
        index: true,
    },

    // ==================================================
    // EXISTING REVIEW DATA
    // ==================================================

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
// ======================================================
// INDEXES
// ======================================================

// Fetch top-level comments
CommentSchema.index({
    post: 1,
    parentComment: 1,
    createdAt: -1,
});

// Fetch replies
CommentSchema.index({
    parentComment: 1,
    createdAt: 1,
});

// Future use (thread operations)
CommentSchema.index({
    rootComment: 1,
    createdAt: 1,
});

// Existing
CommentSchema.index({ user: 1 });
CommentSchema.index({ mentions: 1 });
CommentSchema.index({
    "review.isGameReview": 1,
});
export default mongoose.model("Comment", CommentSchema);
