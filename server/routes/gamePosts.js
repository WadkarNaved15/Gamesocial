/**
 * routes/gamePosts.js
 *
 * All routes for the draft → payment → publish pipeline.
 *
 * Route map
 * ─────────────────────────────────────────────────────────────
 * POST   /game-posts/draft                  create or update draft metadata
 * POST   /game-posts/draft/:draftId/build   mark build uploaded, update file meta
 * POST   /game-posts/draft/:draftId/video   mark video uploaded (optional)
 * POST   /game-posts/create-payment-order   create Razorpay order
 * POST   /game-posts/verify-payment         verify signature → queue publish job
 * POST   /game-posts/retry-publish/:draftId admin: retry failed publish
 * GET    /game-posts/draft/:draftId         poll draft status
 * ─────────────────────────────────────────────────────────────
 */

import express from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import mongoose from "mongoose";

import verifyToken  from "../middlewares/authMiddleware.js";
import requireAdmin from "../middlewares/adminMiddleware.js";
import GamePostDraft from "../models/GamePostDraft.js";
import CreditPurchase from "../models/CreditPurchase.js";
import CreditAudit from "../models/CreditAudit.js";
import AllPost from "../models/Allposts.js";
import { publishGameQueue } from "../queues/publishGameQueue.js";
import { videoProcessingQueue } from "../queues/videoQueue.js"; 

const router = express.Router();

// ── Razorpay client (lazy-initialised so tests don't need env vars) ──────────
let razorpay;
function getRazorpay() {
  if (!razorpay) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Derive buildType from file name (matches frontend logic). */
function buildTypeFromFileName(fileName) {
  return fileName.toLowerCase().endsWith(".exe") ? "executable" : "archive";
}

/** Derive format from file extension. */
function formatFromFileName(fileName) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "7z") return "7z";
  if (ext === "zip") return "zip";
  return "exe";
}

/**
 * Core publish transaction.
 * Runs inside a Mongo session; caller must pass the session.
 * Returns the created AllPost document.
 */
async function runPublishTransaction(draft, creditPurchase, session) {

  // 1. Create AllPost
  const [post] = await AllPost.create(
    [
      {
        user: draft.creator,
        description: draft.description,
        type: "game_post",
        gamePost: {
          gameName: draft.game.gameName,
          version: draft.game.version,
          platform: "windows",
          buildType: draft.game.buildType,
          startPath: draft.game.startPath,
          engine: draft.game.engine,
          runMode: "sandboxed",
          price: 0, // price is credit-based; set to 0
          file: draft.buildFile,
          videoDemo: draft.videoDemo ? {
            name: draft.videoDemo.name,
            key: draft.videoDemo.key,
            url: draft.videoDemo.url,
            size: draft.videoDemo.size,
            optimizedKey: draft.videoDemo.optimizedKey,
            optimizedUrl: draft.videoDemo.optimizedUrl,
            thumbnailUrl: draft.videoDemo.thumbnailUrl,
            processingStatus:draft.videoDemo.processingStatus || "pending",
            processingError: draft.videoDemo.processingError,
            processedAt: draft.videoDemo.processedAt,
          } : null,
          creditBudget: {
            purchasedCredits: draft.selectedCredits,
            giftedCredits: 0,
            deductedCredits: 0,
            usedCredits: 0,
            remainingCredits: draft.selectedCredits,
            status: "active",
            lastCreditPurchaseAt: new Date(),
          },
          verification: {
            status: "pending",
            error: null,
            verifiedAt: null,
          },
          visibility: "active",
          gameMetrics: {
            totalSessions: 0,
            totalSessionTimeMs: 0,
            uniquePlayers: 0,
          },
        },
      },
    ],
    { session }
  );

  // 2. Create CreditAudit entry (purchase action)
  await CreditAudit.create(
    [
      {
        gamePost: post._id,
        creator: draft.creator,
        admin: null,
        action: "purchase",
        credits: draft.selectedCredits,
        previousBalance: 0,
        newBalance: draft.selectedCredits,
        reason: "Initial credit purchase at publish",
        metadata: {
          paymentId: creditPurchase.paymentId,
          invoiceId: creditPurchase.invoiceId ?? null,
        },
      },
    ],
    { session }
  );

  // 3. Update CreditPurchase: link to post, mark fulfilled
  await CreditPurchase.updateOne(
    { _id: creditPurchase._id },
    {
      $set: {
        gamePost: post._id,
        fulfillmentStatus: "fulfilled",
      },
      $inc: { fulfillmentAttempts: 1 },
    },
    { session }
  );

  // 4. Update draft: mark published, link AllPost
  await GamePostDraft.updateOne(
    { _id: draft._id },
    {
      $set: {
        status: "published",
        fulfillmentStatus: "fulfilled",
        allPostId: post._id,
      },
    },
    { session }
  );

  return post;
}

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /game-posts/draft
 * Create (or upsert) a draft with game metadata.
 * Called when the user first opens the form or changes metadata.
 */
router.post("/draft", verifyToken, async (req, res) => {
  try {
    const { draftId, description, game } = req.body;

    let draft;
    if (draftId) {
      // Update existing draft (must belong to caller)
      draft = await GamePostDraft.findOneAndUpdate(
        { _id: draftId, creator: req.user._id, status: { $in: ["draft", "uploading", "ready_for_payment"] } },
        { $set: { description, game } },
        { new: true }
      );
      if (!draft) return res.status(404).json({ message: "Draft not found or not editable" });
    } else {
      draft = await GamePostDraft.create({
        creator: req.user._id,
        description,
        game,
        status: "draft",
      });
    }

    res.json({ draftId: draft._id, status: draft.status });
  } catch (err) {
    console.error("draft create/update error:", err);
    res.status(500).json({ message: "Failed to save draft" });
  }
});

/**
 * POST /game-posts/draft/:draftId/build
 * Called by the frontend after the game build upload completes.
 * Stores S3 metadata in the draft and advances status if video is also done
 * (or not required).
 */
router.post("/draft/:draftId/build", verifyToken, async (req, res) => {
  try {
    const { name, key, url, size } = req.body;
    if (!name || !key || !url || !size) {
      return res.status(400).json({ message: "Missing file metadata" });
    }

    const buildType = buildTypeFromFileName(name);
    const format = formatFromFileName(name);

    const draft = await GamePostDraft.findOneAndUpdate(
      {
        _id: req.params.draftId,
        creator: req.user._id,
        status: {
          $in: [
            "draft",
            "uploading",
            "ready_for_payment",
          ],
        },
      },
      {
        $set: {
          buildFile: { name, key, url, size, format, uploadedAt: new Date() },
          "game.buildType": buildType,
          "game.platform": "windows",
          status: "uploading",
        },
      },
      { new: true }
    );
    if (!draft) return res.status(404).json({ message: "Draft not found" });

    res.json({ draftId: draft._id, status: draft.status });
  } catch (err) {
    console.error("draft build update error:", err);
    res.status(500).json({ message: "Failed to update build metadata" });
  }
});

/**
 * POST /game-posts/draft/:draftId/video
 * Called after optional gameplay trailer upload completes.
 */
/**
 * POST /game-posts/draft/:draftId/video
 * Called after optional gameplay trailer upload completes.
 */
router.post("/draft/:draftId/video", verifyToken, async (req, res) => {
  try {
    const { name, key, url, size } = req.body;

    const draft = await GamePostDraft.findOneAndUpdate(
      {
        _id: req.params.draftId,
        creator: req.user._id,
        status: {
          $in: ["draft", "uploading", "ready_for_payment"],
        },
      },
      { 
        $set: { 
          videoDemo: { 
            name, 
            key, 
            url, 
            size, 
            processingStatus: "pending", // Trigger loading state on frontend
            uploadedAt: new Date() 
          } 
        } 
      },
      { new: true }
    );
    if (!draft) return res.status(404).json({ message: "Draft not found" });

    // 🚀 Dispatch to FFmpeg Worker
    await videoProcessingQueue.add('optimize-video', {
      key: key,
      url: url,
      entityType: 'game',
      entityId: draft._id.toString()
    }, {
      removeOnComplete: true,
      attempts: 3
    });

    res.json({ draftId: draft._id, status: draft.status });
  } catch (err) {
    console.error("draft video update error:", err);
    res.status(500).json({ message: "Failed to update video metadata" });
  }
});
/**
 * POST /game-posts/draft/:draftId/ready
 * Frontend calls this after uploads finish to advance status to ready_for_payment.
 */
router.post("/draft/:draftId/ready", verifyToken , async (req, res) => {
  try {
    const draft = await GamePostDraft.findOne({
      _id: req.params.draftId,
      creator: req.user._id,
    });
    if (!draft) return res.status(404).json({ message: "Draft not found" });

    // Validate required fields
    if (!draft.buildFile?.key) {
      return res.status(400).json({ message: "Game build must be uploaded before proceeding" });
    }
    if (!draft.game?.gameName) {
      return res.status(400).json({ message: "Game name is required" });
    }
    if (!draft.game?.startPath) {
      return res.status(400).json({ message: "Start path is required" });
    }

    draft.status = "ready_for_payment";
    await draft.save();

    res.json({ draftId: draft._id, status: draft.status });
  } catch (err) {
    console.error("draft ready error:", err);
    res.status(500).json({ message: "Failed to advance draft status" });
  }
});

/**
 * POST /game-posts/create-payment-order
 * Validates draft, creates Razorpay order, advances draft to payment_pending.
 *
 * Body: { draftId, selectedCredits }
 */
router.post("/create-payment-order", verifyToken, async (req, res) => {
  try {
    const { draftId, selectedCredits } = req.body;

    // Minimum $100 -> 4000 credits
    if (!draftId || !selectedCredits || selectedCredits < 4000) {
      return res.status(400).json({ message: "Invalid request: draftId and selectedCredits (min 4000 = $100) required" });
    }

    const draft = await GamePostDraft.findOne({
      _id: draftId,
      creator: req.user._id,
    });

    if (!draft) return res.status(404).json({ message: "Draft not found" });

        if (draft.status === "payment_pending" && draft.razorpayOrderId) {
      return res.json({
        orderId: draft.razorpayOrderId,
        amount: draft.amount,
        currency: draft.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        draftId: draft._id,
      });
    }

    if (draft.status !== "ready_for_payment") {
      return res.status(409).json({
        message: `Draft is in status '${draft.status}' and cannot be paid for`,
      });
    }

    if (!draft.buildFile?.key) {
      return res.status(400).json({ message: "Game build must be uploaded before payment" });
    }

    // $1 = 40 credits
    // Total Dollars = selectedCredits / 40
    // Total Cents = (selectedCredits / 40) * 100
    const amount = Math.round((selectedCredits / 40) * 100);

    // Create Razorpay order
    const order = await getRazorpay().orders.create({
      amount: amount,
      currency: draft.currency || "USD",
      receipt: `draft_${draft._id}`,
      notes: {
        draftId: String(draft._id),
        userId: String(req.user._id),
        credits: String(selectedCredits),
      },
    });

    // Persist order details on draft
    draft.selectedCredits = selectedCredits;
    draft.amount = amount;
    draft.currency = draft.currency || "USD";
    draft.razorpayOrderId = order.id;
    draft.status = "payment_pending";
    await draft.save();

    res.json({
      orderId: order.id,
      amount: amount,
      currency: draft.currency || "USD",
      keyId: process.env.RAZORPAY_KEY_ID,
      draftId: draft._id,
    });
  } catch (err) {
    console.error("create-payment-order error:", err);
    res.status(500).json({ message: "Failed to create payment order" });
  }
});

/**
 * POST /game-posts/verify-payment
 * Verifies Razorpay signature → creates CreditPurchase → queues publish job.
 *
 * Body: { draftId, razorpayOrderId, razorpayPaymentId, razorpaySignature }
 */
router.post("/verify-payment", verifyToken, async (req, res) => {
  try {
    const { draftId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!draftId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ message: "Missing payment verification fields" });
    }

    // 1. Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ message: "Payment signature verification failed" });
    }

    // 2. Load draft and validate ownership
    const draft = await GamePostDraft.findOne({
      _id: draftId,
      creator: req.user._id,
      razorpayOrderId,
      status: "payment_pending",
    });

    if (!draft) {
      return res.status(404).json({ message: "Draft not found or already processed" });
    }

    // 3. Idempotency: reject if a CreditPurchase with this paymentId already exists
    const existingPurchase = await CreditPurchase.findOne({ paymentId: razorpayPaymentId });
    if (existingPurchase) {
      // Payment already processed — return current draft status to frontend
      return res.json({
        message: "Payment already recorded",
        draftId: draft._id,
        status: draft.status,
      });
    }

    const payment = await getRazorpay().payments.fetch(razorpayPaymentId);

    if (payment.status !== "captured") {
      return res.status(400).json({
        message: "Payment not captured",
      });
    }

    if (
      payment.amount !== draft.amount ||
      payment.order_id !== razorpayOrderId ||
      payment.currency !== draft.currency
    ) {
      return res.status(400).json({
        message: "Payment mismatch"
      });
    }

    // 4. Create CreditPurchase (status = completed)
    const creditPurchase = await CreditPurchase.create({
      creator: req.user._id,
      draft: draft._id,
      gamePost: null, // set by publish job
      creditsPurchased: draft.selectedCredits,
      amountPaid: draft.amount,
      currency: draft.currency || "USD",
      paymentProvider: "razorpay",
      razorpayOrderId,
      paymentId: razorpayPaymentId,
      status: "completed",
      fulfillmentStatus: "pending",
    });

    // 5. Advance draft to payment_completed
    draft.status = "payment_completed";
    draft.creditPurchaseId = creditPurchase._id;
    await draft.save();

    await publishGameQueue.add(
      "publishGame",
      {
        draftId: draft._id.toString(),
        creditPurchaseId: creditPurchase._id.toString(),
      },
      {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 10000,
        },
        removeOnComplete: 500,
        removeOnFail: 500,
      }
    );

    res.json({
      message: "Payment verified. Publishing your game…",
      draftId: draft._id,
      status: "payment_completed",
    });
  } catch (err) {
    console.error("verify-payment error:", err);
    res.status(500).json({ message: "Payment verification failed" });
  }
});

/**
 * Publish job — runs the Mongo transaction.
 * Called by setImmediate (or BullMQ worker).
 *
 * @param {ObjectId|string} draftId
 * @param {ObjectId|string} creditPurchaseId
 */
export async function runPublishJob(draftId, creditPurchaseId) {
  const lockedDraft = await GamePostDraft.findOneAndUpdate(
    {
      _id: draftId,
      status: {
        $in: [
          "payment_completed",
          "failed"
        ]
      }
    },
    {
      $set: {
        status: "publishing",
        fulfillmentStatus: "processing",
        failureReason: null,
      }
    },
    {
      new: true,
    }
  );

  if (!lockedDraft) {
    console.log(`Draft ${draftId} already processing`);
    return;
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    await CreditPurchase.updateOne(
      { _id: creditPurchaseId },
      {
        $set: {
          fulfillmentStatus: "processing",
        },
        $inc: {
          fulfillmentAttempts: 1,
        },
      },
      { session }
    );

    const draft = await GamePostDraft.findById(draftId).session(session);
    const creditPurchase = await CreditPurchase.findById(creditPurchaseId).session(session);

    if (!draft || !creditPurchase) {
      throw new Error("Draft or CreditPurchase not found inside transaction");
    }

    await runPublishTransaction(draft, creditPurchase, session);
    await session.commitTransaction();

    console.log(`[publishJob] Game post published for draft ${draftId}`);
  } catch (err) {
    await session.abortTransaction();

    console.error(`[publishJob] Transaction failed for draft ${draftId}:`, err);

    await GamePostDraft.updateOne(
      { _id: draftId },
      {
        $set: {
          status: "failed",
          fulfillmentStatus: "failed",
          failureReason: err.message,
        },
      }
    );

    await CreditPurchase.updateOne(
      { _id: creditPurchaseId },
      {
        $set: {
          fulfillmentStatus: "failed",
          fulfillmentError: err.message,
        },
      }
    );
  } finally {
    session.endSession();
  }
}

/**
 * POST /game-posts/retry-publish/:draftId
 * Admin endpoint: retry a failed publish job.
 */
router.post("/retry-publish/:draftId", verifyToken, requireAdmin, async (req, res) => {
  try {
    const draft = await GamePostDraft.findOne({
      _id: req.params.draftId,
      status: "failed",
    });
    if (!draft) return res.status(404).json({ message: "Failed draft not found" });

    const creditPurchase = await CreditPurchase.findOne({
      _id: draft.creditPurchaseId,
      status: "completed",
      fulfillmentStatus: "failed",
    });
    if (!creditPurchase) {
      return res.status(409).json({ message: "No retryable CreditPurchase found for this draft" });
    }

    await publishGameQueue.add(
      "publishGame",
      {
        draftId: draft._id.toString(),
        creditPurchaseId: creditPurchase._id.toString(),
      },
      {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 10000,
        },
        removeOnComplete: 500,
        removeOnFail: 500,
      }
    );

    res.json({ message: "Publish retry queued", draftId: draft._id });
  } catch (err) {
    console.error("retry-publish error:", err);
    res.status(500).json({ message: "Failed to queue retry" });
  }
});

/**
 * GET /game-posts/draft/:draftId
 * Frontend polls this to check publish progress.
 */
router.get(
  "/draft/:draftId",
  verifyToken,
  async (req, res) => {
    console.log(`Fetching draft ${req.params.draftId} for user ${req.user._id}`);
    const draft =
      await GamePostDraft.findOne({
        _id: req.params.draftId,
        creator: req.user._id,
      });

    console.log("Draft found:", !!draft, draft ? `status=${draft.status}` : "");

    if (!draft) {
      return res
        .status(404)
        .json({
          message:
            "Draft not found",
        });
    }

    res.json({
      draftId: draft._id,
      description:
        draft.description,
      game: draft.game,
      buildFile:
        draft.buildFile,
      videoDemo:
        draft.videoDemo,
      selectedCredits:
        draft.selectedCredits,
      amount: draft.amount,
      currency:
        draft.currency,
      status: draft.status,
      failureReason:
        draft.failureReason,
    });
  }
);


router.get(
  "/my-active-draft",
  verifyToken,
  async (req, res) => {
    const draft =
      await GamePostDraft.findOne({
        creator: req.user._id,
        status: {
          $nin: ["published"]
        }
      }).sort({
        updatedAt: -1
      });

    console.log(draft);

    res.json(draft);
  }
);



export default router;