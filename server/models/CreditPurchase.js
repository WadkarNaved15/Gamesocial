import mongoose from "mongoose";

/**
 * CreditPurchase — records every Razorpay payment for game credits.
 *
 * Key invariant: a CreditPurchase is created with status = "completed"
 * only AFTER Razorpay signature verification succeeds.  The AllPost
 * is created separately, inside a Mongo transaction, by the publish job.
 *
 * fulfillmentStatus tracks whether the post was actually created:
 *   pending     → payment verified, publish job not yet run
 *   processing  → publish job is running the transaction
 *   fulfilled   → AllPost created, credits initialized
 *   failed      → transaction aborted; admin / worker can retry
 *
 * Safety invariants:
 *   • paymentId has a unique index → idempotent webhook / callback processing
 *   • gamePost is set to null initially and filled by the publish job so
 *     the purchase record exists even if publishing fails
 */
const CreditPurchaseSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Set by the publish job once AllPost is created.
    // null = not yet published (or failed).
    gamePost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AllPost",
      default: null,
      index: true,
    },

    // Reference back to the draft that initiated this payment
    draft: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GamePostDraft",
      required: true,
      index: true,
    },

    creditsPurchased: {
      type: Number,
      required: true,
      min: 10,
    },

    /**
 * Amount paid in the payment provider's smallest currency unit.
 *
 * USD -> cents
 * INR -> paise
 * EUR -> euro cents
 */
    amountPaid: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "USD",
    },

    paymentProvider: {
      type: String,
      enum: ["razorpay", "stripe", "paypal", "manual"],
      required: true,
    },

    // Razorpay order ID (created before checkout opens)
    razorpayOrderId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },

    // Razorpay payment ID (from checkout success callback)
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

    // Payment lifecycle
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
      index: true,
    },

    // Post-payment fulfillment lifecycle
    fulfillmentStatus: {
      type: String,
      enum: ["pending", "processing", "fulfilled", "failed"],
      default: "pending",
      index: true,
    },

    // Number of times the publish job has been retried
    fulfillmentAttempts: {
      type: Number,
      default: 0,
    },

    // Last error from a failed publish attempt (for admin inspection)
    fulfillmentError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for admin retry queries: find paid-but-unfulfilled purchases
CreditPurchaseSchema.index(
  { status: 1, fulfillmentStatus: 1 },
  {
    partialFilterExpression: {
      status: "completed",
      fulfillmentStatus: { $in: ["pending", "failed"] },
    },
    name: "UnfulfilledPayments",
  }
);

export default mongoose.model("CreditPurchase", CreditPurchaseSchema);