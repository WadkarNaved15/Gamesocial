import express from "express";
import GamePostDraft from "../models/GamePostDraft.js";
import AllPost from "../models/Allposts.js";
import CreditAudit from "../models/CreditAudit.js";
import CreditPurchase from "../models/CreditPurchase.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import adminOnly from "../middlewares/adminMiddleware.js";

const router = express.Router();

router.use(authMiddleware);
router.use(adminOnly);

// ── Dashboard Endpoint (Split Queue & Lifetime) ──────────────────────────────
router.get("/dashboard", async (req, res) => {
  try {
    // 1. Queue Dashboard (Drafts Only)
    const [pendingReviews, approvedWaiting, rejected, failedPublishing] = await Promise.all([
      GamePostDraft.countDocuments({ status: { $ne: "published" }, "game.sponsorship.status": "pending" }),
      GamePostDraft.countDocuments({ status: { $ne: "published" }, "game.sponsorship.status": "approved" }),
      GamePostDraft.countDocuments({ status: { $ne: "published" }, "game.sponsorship.status": "rejected" }),
      GamePostDraft.countDocuments({ status: "failed" })
    ]);

    // 2. Lifetime Analytics (Published/Audits/Purchases Only)
    
    // a) Sponsored Games Scope
    const sponsoredGamesData = await AllPost.aggregate([
      { $match: { type: "game_post", "gamePost.sponsorship.enabled": true } },
      { 
        $group: {
          _id: null,
          total: { $sum: 1 },
          live: { $sum: { $cond: [{ $eq: ["$gamePost.visibility", "active"] }, 1, 0] } },
          hidden: { $sum: { $cond: [{ $eq: ["$gamePost.visibility", "hidden"] }, 1, 0] } },
          creditsRemaining: { $sum: "$gamePost.creditBudget.remainingCredits" }
        }
      }
    ]);
    const sponsoredStats = sponsoredGamesData[0] || { total: 0, live: 0, hidden: 0, creditsRemaining: 0 };

    // b) Credit Audit scope (for sponsored games)
    const sponsoredGameIds = await AllPost.find({ type: "game_post", "gamePost.sponsorship.enabled": true }).distinct("_id");
    
    const auditStats = await CreditAudit.aggregate([
      { $match: { gamePost: { $in: sponsoredGameIds }, action: { $in: ["gift", "consumption"] } } },
      { 
        $group: {
          _id: "$action",
          totalCredits: { $sum: "$credits" }
        }
      }
    ]);
    const totalSponsoredCreditsGifted = auditStats.find(a => a._id === "gift")?.totalCredits || 0;
    const totalSponsoredCreditsConsumed = auditStats.find(a => a._id === "consumption")?.totalCredits || 0;

    // c) Purchase Scope
    const purchaseStats = await CreditPurchase.aggregate([
      { $match: { status: "completed" } },
      { 
        $group: {
          _id: null,
          totalCreditsPurchased: { $sum: "$creditsPurchased" },
          totalRevenue: { $sum: "$amountPaid" },
          uniqueGames: { $addToSet: "$gamePost" }
        }
      }
    ]);
    const purchases = purchaseStats[0] || { totalCreditsPurchased: 0, totalRevenue: 0, uniqueGames: [] };
    const totalPaidGames = purchases.uniqueGames.filter(id => id != null).length;

    // d) Averages
    const avgGiftCreditsPerSponsoredGame = sponsoredStats.total > 0 
      ? Math.round(totalSponsoredCreditsGifted / sponsoredStats.total) : 0;
    const avgPurchasedCreditsPerPaidGame = totalPaidGames > 0 
      ? Math.round(purchases.totalCreditsPurchased / totalPaidGames) : 0;

    res.json({
      queue: {
        pendingReviews,
        approvedWaiting,
        rejected,
        failedPublishing
      },
      lifetime: {
        totalSponsoredGames: sponsoredStats.total,
        liveSponsoredGames: sponsoredStats.live,
        hiddenSponsoredGames: sponsoredStats.hidden,
        totalSponsoredCreditsGifted,
        totalSponsoredCreditsConsumed,
        sponsoredCreditsRemaining: sponsoredStats.creditsRemaining,
        totalCreditsPurchased: purchases.totalCreditsPurchased,
        totalPurchaseRevenue: purchases.totalRevenue,
        totalPaidGames,
        avgGiftCreditsPerSponsoredGame,
        avgPurchasedCreditsPerPaidGame
      }
    });
  } catch (error) {
    console.error("Sponsored Dashboard Error:", error);
    res.status(500).json({ message: "Failed to load dashboard metrics" });
  }
});

// ── Get All Drafts (with Search Aggregation) ──────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 25, search = "", status } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const pipeline = [];

    // 1. Join Creator data for searching
    pipeline.push({
      $lookup: {
        from: "users", 
        localField: "creator",
        foreignField: "_id",
        as: "creatorData"
      }
    });
    pipeline.push({ $unwind: "$creatorData" });

    // 2. Match search term across Game Name, Username, and Email
    if (search) {
      const regex = new RegExp(search, "i");
      pipeline.push({
        $match: {
          $or: [
            { "game.gameName": regex },
            { "creatorData.username": regex },
            { "creatorData.email": regex }
          ]
        }
      });
    }

    // 3. Match specific filters (excluding published by default)
    const matchObj = { status: { $ne: "published" } };
    if (status) matchObj["game.sponsorship.status"] = status;
    pipeline.push({ $match: matchObj });

    // 4. Add sorting weight (Pending first, then by date)
    pipeline.push({
      $addFields: {
        sortWeight: { $cond: [{ $eq: ["$game.sponsorship.status", "pending"] }, 0, 1] }
      }
    });

    // 5. Count total documents for pagination before skip/limit
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await GamePostDraft.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // 6. Sort, Paginate, and format the output
    pipeline.push(
      { $sort: { sortWeight: 1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limitNum },
      {
        $project: {
          creator: {
            _id: "$creatorData._id",
            username: "$creatorData.username",
            email: "$creatorData.email",
            avatar: "$creatorData.avatar",
            isVerified: "$creatorData.isVerified",
            createdAt: "$creatorData.createdAt"
          },
          description: 1,
          "game.gameName": 1,
          "game.version": 1,
          "game.engine": 1,
          "game.maxSessionDurationMinutes": 1,
          buildFile: 1,
          "videoDemo.thumbnailUrl": 1,
          "videoDemo.optimizedUrl": 1,
          "game.sponsorship": 1,
          createdAt: 1,
          updatedAt: 1,
          status: 1
        }
      }
    );

    const drafts = await GamePostDraft.aggregate(pipeline);

    res.json({ rows: drafts, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (error) {
    console.error("Sponsored Games Fetch Error:", error);
    res.status(500).json({ message: "Failed to fetch sponsored games" });
  }
});

// ── Get Single Draft ──────────────────────────────────────────────────────────
router.get("/:draftId", async (req, res) => {
  try {
    const draft = await GamePostDraft.findById(req.params.draftId)
      .populate("creator", "username email avatar isVerified createdAt");
      
    if (!draft) return res.status(404).json({ message: "Draft not found" });
    res.json(draft);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch draft" });
  }
});

// ── Approve Draft ─────────────────────────────────────────────────────────────
router.post("/:draftId/approve", async (req, res) => {
  try {
    const { credits, notes } = req.body;
    const numericCredits = Number(credits);
    
    if (!Number.isInteger(numericCredits) || numericCredits <= 0) {
      return res.status(400).json({ message: "Credits must be a positive whole number." });
    }

    const draft = await GamePostDraft.findById(req.params.draftId);
    if (!draft) return res.status(404).json({ message: "Draft not found" });

    if (draft.game.sponsorship.status !== "pending") {
      return res.status(400).json({ message: "Cannot approve: draft is already reviewed." });
    }

    // Direct property assignment prevents replacing the entire object
    draft.game.sponsorship.status = "approved";
    draft.game.sponsorship.enabled = true;
    draft.game.sponsorship.initialCredits = numericCredits;
    draft.game.sponsorship.reviewedBy = req.user._id;
    draft.game.sponsorship.reviewedAt = new Date();
    draft.game.sponsorship.notes = notes || "";
    draft.game.sponsorship.rejectionReason = null;

    await draft.save();
    res.json(draft);
  } catch (error) {
    res.status(500).json({ message: "Failed to approve draft" });
  }
});

// ── Reject Draft ──────────────────────────────────────────────────────────────
router.post("/:draftId/reject", async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    
    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ message: "Rejection reason is required." });
    }

    const draft = await GamePostDraft.findById(req.params.draftId);
    if (!draft) return res.status(404).json({ message: "Draft not found" });

    if (draft.game.sponsorship.status !== "pending") {
      return res.status(400).json({ message: "Cannot reject: draft is already reviewed." });
    }

    draft.game.sponsorship.status = "rejected";
    draft.game.sponsorship.enabled = false;
    draft.game.sponsorship.initialCredits = 0;
    draft.game.sponsorship.reviewedBy = req.user._id;
    draft.game.sponsorship.reviewedAt = new Date();
    draft.game.sponsorship.rejectionReason = rejectionReason;

    await draft.save();
    res.json(draft);
  } catch (error) {
    res.status(500).json({ message: "Failed to reject draft" });
  }
});

// ── Reset Draft ───────────────────────────────────────────────────────────────
router.post("/:draftId/reset", async (req, res) => {
  try {
    const draft = await GamePostDraft.findById(req.params.draftId);
    if (!draft) return res.status(404).json({ message: "Draft not found" });

    draft.game.sponsorship.status = "pending";
    draft.game.sponsorship.enabled = false;
    draft.game.sponsorship.initialCredits = 0;
    draft.game.sponsorship.reviewedBy = null;
    draft.game.sponsorship.reviewedAt = null;
    draft.game.sponsorship.notes = null;
    draft.game.sponsorship.rejectionReason = null;

    await draft.save();
    res.json(draft);
  } catch (error) {
    res.status(500).json({ message: "Failed to reset draft sponsorship" });
  }
});

export default router;