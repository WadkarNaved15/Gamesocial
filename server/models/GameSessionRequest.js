import mongoose from "mongoose";

const GameSessionRequestSchema = new mongoose.Schema({

    gamePost: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AllPost",
        required: true,
        index: true
    },

    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    status: {
        type: String,
        enum: [
            "pending",
            "fulfilled",
            "expired"
        ],
        default: "pending"
    }

}, {
    timestamps: true
});

GameSessionRequestSchema.index(
    {
        gamePost: 1,
        requestedBy: 1
    },
    {
        unique: true
    }
);

export default mongoose.model("GameSessionRequest", GameSessionRequestSchema);