import GameFeedback from "../models/GameFeedback.js";
import GameSession from "../models/GameSession.js";
import mongoose from "mongoose";
import Comment from "../models/Comment.js";

//Create Game Feedback
export const createGameFeedback = async (req, res) => {
  const mongoSession = await mongoose.startSession();

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

    let createdFeedback;

    await mongoSession.withTransaction(async () => {

      const session = await GameSession.findOne({
        _id: sessionId,
        user: req.user.id,
      }).session(mongoSession);

      if (!session) {
        throw new Error("SESSION_NOT_FOUND");
      }

      if (session.status !== "ended") {
        throw new Error("SESSION_NOT_ENDED");
      }

      if (session.feedback?.submitted) {
        throw new Error("FEEDBACK_ALREADY_SUBMITTED");
      }

      // 1. Create Feedback
      const [feedback] = await GameFeedback.create(
        [{
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
        }],
        { session: mongoSession }
      );

      // 2. Create Review Comment
      const [comment] = await Comment.create(
        [{
          post: session.gamePost,
          user: session.user,
          text: suggestions || "",

          review: {
            isGameReview: true,
            feedback: feedback._id,
          },
        }],
        { session: mongoSession }
      );

      // 3. Link Comment to Feedback
      feedback.comment = comment._id;
      await feedback.save({ session: mongoSession });

      // 4. Mark Session Feedback Submitted
      session.feedback.submitted = true;
      session.feedback.submittedAt = new Date();

      await session.save({ session: mongoSession });

      createdFeedback = feedback;
    });

    res.status(201).json({
      success: true,
      feedback: createdFeedback,
    });

  } catch (err) {

    if (err.message === "SESSION_NOT_FOUND") {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    if (err.message === "SESSION_NOT_ENDED") {
      return res.status(400).json({
        error: "Session has not ended",
      });
    }

    if (err.message === "FEEDBACK_ALREADY_SUBMITTED") {
      return res.status(409).json({
        error: "Feedback already submitted",
      });
    }

    console.error(err);

    res.status(500).json({
      error: "Failed to submit feedback",
    });

  } finally {
    await mongoSession.endSession();
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