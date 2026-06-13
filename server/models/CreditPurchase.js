import mongoose from "mongoose";

const CreditPurchaseSchema = new mongoose.Schema(
  {
    creator: {
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

    creditsPurchased: {
      type: Number,
      required: true,
    },

    amountPaid: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "INR",
    },

    paymentProvider: {
      type: String,
      enum: [
        "razorpay",
        "stripe",
        "paypal",
        "manual",
      ],
      required: true,
    },

    paymentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    invoiceId: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "completed",
        "failed",
        "refunded",
      ],
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "CreditPurchase",
  CreditPurchaseSchema
);