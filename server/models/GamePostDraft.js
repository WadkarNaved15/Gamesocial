import mongoose from "mongoose";

/**
 * GamePostDraft — holds all pre-payment state for a game post.
 *
 * Status lifecycle:
 *   draft → uploading → ready_for_payment → payment_pending
 *     → payment_completed → publishing → published | failed
 */
const GamePostDraftSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    description: {
      type: String,
      default: "",
      maxlength: 5000,
    },

    // ── Game metadata ────────────────────────────────────────────
    game: {
      gameName: {
        type: String,
        trim: true,
        maxlength: 120,
        default: "",
      },
      version: {
        type: String,
        default: "1.0.0",
      },
      /**
       * Always "windows" — never surfaced to the user.
       * Stored here so the publish job can copy it verbatim.
       */
      platform: {
        type: String,
        enum: ["windows"],
        default: "windows",
      },
      /**
       * Derived from file extension on the backend at upload time:
       *   .exe  → "executable"
       *   .zip / .7z → "archive"
       */
      buildType: {
        type: String,
        enum: ["archive", "executable"],
        default: null,
      },
      startPath: {
        type: String,
        default: "",
        validate: {
          validator: (v) => !v || (!v.startsWith("/") && !v.includes("..")),
          message: "startPath must be a relative path",
        },
      },
      engine: {
        type: String,
        trim: true,
        default: "",
      },
      runMode: {
        type: String,
        enum: ["sandboxed"],
        default: "sandboxed",
      },
    },

    // ── Uploaded build file (stored in draft, NOT yet in AllPost) ─
    buildFile: {
        name: String,
        key: String,
        url: String,
        size: Number,
        format: {
            type: String,
            enum: ["7z", "zip", "exe"],
        },

        uploadedAt: {
            type: Date,
            default: null,
        },
        },

        videoDemo: {
        name: String,
        key: String,
        url: String,
        size: Number,

        uploadedAt: {
            type: Date,
            default: null,
        },
        },

    // ── Payment / credits ─────────────────────────────────────────
    selectedCredits: {
      type: Number,
      default: null,
      min: 10,
    },
    /**
 * Amount paid in the payment provider's smallest currency unit.
 *
 * USD -> cents
 * INR -> paise
 * EUR -> euro cents
 */
    amount: {
      type: Number,
      default: null,
    },
    currency: {
      type: String,
      default: "USD",
    },

    // ── Razorpay order reference ──────────────────────────────────
    razorpayOrderId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },

    // ── Linked CreditPurchase (set after payment verification) ───
    creditPurchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CreditPurchase",
      default: null,
    },

    // ── Resulting AllPost (set after publish job succeeds) ───────
    allPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AllPost",
      default: null,
    },

    // ── Workflow status ───────────────────────────────────────────
    status: {
      type: String,
      enum: [
        "draft",             // form open, nothing uploaded yet
        "uploading",         // file uploads in progress
        "ready_for_payment", // uploads done, awaiting Pay & Publish click
        "payment_pending",   // Razorpay order created, checkout open
        "payment_completed", // payment verified, publish job queued
        "publishing",        // transaction running
        "published",         // AllPost created successfully
        "failed",            // publish job failed after successful payment
      ],
      default: "draft",
      index: true,
    },

    // ── Fulfillment tracking (mirrors CreditPurchase.fulfillmentStatus) ─
    fulfillmentStatus: {
      type: String,
      enum: ["pending", "processing", "fulfilled", "failed"],
      default: "pending",
    },

    // ── Optional error detail for admin inspection ───────────────
    failureReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Cleanup job index: find stale non-published drafts older than 24 h
GamePostDraftSchema.index(
  { status: 1, createdAt: 1 },
  {
    partialFilterExpression: {
      status: { $nin: ["published"] },
    },
    name: "StaleNonPublishedDrafts",
  }
);

GamePostDraftSchema.index(
  { updatedAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30, partialFilterExpression: { status: "published" } }
);

export default mongoose.model("GamePostDraft", GamePostDraftSchema);