// controllers/feedbackController.js

import Feedback from "../models/Feedback.js";
import StreamFeedback from "../models/StreamFeedback.js";

export const createFeedback = async (req, res) => {
  try {
    const { category, message } = req.body;

    if (!category || !message?.trim()) {
      return res.status(400).json({
        error: "Category and message are required",
      });
    }

    const feedback = await Feedback.create({
      user: req.user._id, // comes from auth middleware
      category,
      message: message.trim(),
    });

    res.status(201).json({
      success: true,
      feedback,
    });
  } catch (error) {
    console.error("Feedback Error:", error);

    res.status(500).json({
      error: "Failed to submit feedback",
    });
  }
};

export const getAllFeedback = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = 20;

    const [feedback, streamFeedback] = await Promise.all([
      Feedback.find()
        .populate("user", "displayName username avatar email")
        .lean(),

      StreamFeedback.find()
        .populate("user", "displayName username avatar email")
        .lean(),
    ]);

    const combined = [
      ...feedback,
      ...streamFeedback.map((item) => ({
        ...item,

        category: "Stream Feedback",

        message:
          item.issues && item.issues.length
            ? item.issues.join(", ")
            : "No issues selected",
      })),
    ];

    combined.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const total = combined.length;

    const paginated = combined.slice(
      (page - 1) * limit,
      page * limit
    );

    res.status(200).json({
      success: true,
      feedback: paginated,
      hasMore: page * limit < total,
      currentPage: page,
    });
  } catch (error) {
    console.error("Fetch Feedback Error:", error);

    res.status(500).json({
      error: "Failed to fetch feedback",
    });
  }
};