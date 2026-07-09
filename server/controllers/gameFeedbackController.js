import GameFeedback from "../models/GameFeedback.js";
import GameSession from "../models/GameSession.js";

export const createGameFeedback = async (req, res) => {
  try {
    const { sessionId, overall, suggestions } = req.body;

    if (!sessionId || !overall) {
      return res.status(400).json({
        error: "Session ID and rating are required",
      });
    }

    if (overall < 1 || overall > 10) {
      return res.status(400).json({
        error: "Rating must be between 1 and 10",
      });
    }

    const session = await GameSession.findOne({
      _id: sessionId,
      user: req.user.id,
    });

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    if (session.status !== "ended") {
      return res.status(400).json({
        error: "Session has not ended",
      });
    }

    if (session.feedback?.submitted) {
      return res.status(409).json({
        error: "Feedback already submitted",
      });
    }

    const feedback = await GameFeedback.create({
      session: session._id,
      user: session.user,
      gamePost: session.gamePost,

      overall,
      suggestions,

      playTimeMs: session.metrics.totalPlayTime,
      creditsConsumed: session.billing.creditsConsumed,
      queueType: session.queueType,
      exitReason: session.exitReason,

      sessionStartedAt: session.startedAt,
      sessionEndedAt: session.endedAt,
    });

    session.feedback.submitted = true;
    session.feedback.submittedAt = new Date();

    await session.save();

    res.status(201).json({
      success: true,
      feedback,
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: "Failed to submit feedback",
    });
  }
};
// GET Game Feedback
export const getAllGameFeedback = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);

    const limit = 20;

    const feedback = await GameFeedback.find()
      .populate("user", "displayName username avatar email")
      .populate("gamePost", "gamePost.gameName")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await GameFeedback.countDocuments();

    res.json({
      success: true,
      feedback,
      hasMore: page * limit < total,
      currentPage: page,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to fetch game feedback",
    });
  }
};