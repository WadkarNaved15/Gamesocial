// models/DemoConsumption.js
import mongoose from "mongoose";

const demoConsumptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    gamePost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AllPost",
      required: true,
      index: true,
    },

    gameSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GameSession",
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "consumed", "expired", "cancelled"],
      default: "active",
      index: true,
    },

    startedAt: {
      type: Date,
      required: true,
    },

    consumedAt: {
      type: Date,
      default: null,
    },

    endedAt: {
      type: Date,
      default: null,
    },

    connectedSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    graceSecondsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },

    firstHeartbeatAt: {
      type: Date,
      default: null,
    },

    lastHeartbeatAt: {
      type: Date,
      default: null,
      index: true,
    },

    consumedReason: {
      type: String,
      enum: [
        "min_playtime_reached",
        "user_exit_before_threshold",
        "manual_admin_mark",
        "purchase_granted",
        "forced_consumption",
      ],
      default: "min_playtime_reached",
    },

    metadata: {
      hostId: String,
      appId: String,
      instanceId: String,
      region: String,
    },
  },
  { timestamps: true }
);

demoConsumptionSchema.index({ user: 1, gamePost: 1 }, { unique: true });
demoConsumptionSchema.index({ user: 1, status: 1 });
demoConsumptionSchema.index({ gamePost: 1, status: 1 });

export default mongoose.model("DemoConsumption", demoConsumptionSchema);