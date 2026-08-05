import StreamFeedback from "../models/StreamFeedback.js";
import GameSession from "../models/GameSession.js";

// Create Stream Feedback
export const createStreamFeedback = async (req, res) => {
  try {
    const { sessionId, issues } = req.body;

    // Validate request
    if (!sessionId) {
      return res.status(400).json({
        error: "Session ID is required",
      });
    }

    if (!Array.isArray(issues) || issues.length === 0) {
      return res.status(400).json({
        error: "At least one issue must be selected",
      });
    }

    // Find session
    const session = await GameSession.findOne({
      _id: sessionId,
      user: req.user.id,
    });

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    // Session must be completed
    if (session.status !== "ended") {
      return res.status(400).json({
        error: "Session has not ended",
      });
    }

    // Prevent duplicate feedback
    const existingFeedback = await StreamFeedback.findOne({
      session: session._id,
    });

    if (existingFeedback) {
      return res.status(409).json({
        error: "Stream feedback already submitted",
      });
    }

    // Create feedback
    const feedback = await StreamFeedback.create({
      session: session._id,
      user: session.user,
      gamePost: session.gamePost,

      issues,

      playTimeMs: session.metrics?.totalPlayTime || 0,
      creditsConsumed: session.billing?.creditsConsumed || 0,
      queueType: session.queueType,
      exitReason: session.exitReason,
    });

    return res.status(201).json({
      success: true,
      feedback,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Failed to submit stream feedback",
    });
  }
};

// Get Stream Feedback
export const getAllStreamFeedback = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = 20;

    const feedback = await StreamFeedback.find()
      .populate("user", "displayName username avatar email")
      .populate("gamePost", "gamePost.gameName")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await StreamFeedback.countDocuments();

    res.json({
      success: true,
      feedback,
      hasMore: page * limit < total,
      currentPage: page,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to fetch stream feedback",
    });
  }
};