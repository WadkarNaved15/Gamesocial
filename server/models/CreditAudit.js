import mongoose from "mongoose";

const CreditAuditSchema = new mongoose.Schema(
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

    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    action: {
      type: String,
      enum: [
        "purchase",
        "gift",
        "deduct",
        "set_balance",
        "consumption",
        "refund",
        "reactivate",
        "hide",
        "unhide",
      ],
      required: true,
      index: true,
    },

    credits: {
      type: Number,
      required: true,
    },

    previousBalance: {
      type: Number,
      required: true,
    },

    newBalance: {
      type: Number,
      required: true,
    },

    reason: {
      type: String,
      default: "",
    },

    metadata: {
      sessionId: String,
      paymentId: String,
      invoiceId: String,
      purchaseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CreditPurchase",
      },
    },
  },
  {
    timestamps: true,
  }
);

CreditAuditSchema.index({
  gamePost: 1,
  createdAt: -1,
});

export default mongoose.model(
  "CreditAudit",
  CreditAuditSchema
);