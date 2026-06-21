// controllers/feedbackController.js

import Feedback from "../models/Feedback.js";

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