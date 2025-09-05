import express from "express";
import verifyToken from "../middleware/authMiddleware.js";
import Feedback from "../models/Feedback.js";

const router = express.Router();

// POST - Submit feedback
router.post("/feedback", verifyToken, async (req, res) => {
  try {
    const { category, message } = req.body;

    if (!category || !message) {
      return res.status(400).json({ error: "Category and message are required" });
    }

    const feedback = new Feedback({
      user: req.user.id,
      category,
      message,
    });

    await feedback.save();
    res.status(201).json({ message: "Feedback submitted successfully", feedback });
  } catch (error) {
    console.error("Feedback error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET - Get all feedback (for admin)
// router.get("/", verifyToken, async (req, res) => {
//   try {
//     const feedbacks = await Feedback.find().populate("user", "username email");
//     res.status(200).json(feedbacks);
//   } catch (error) {
//     console.error("Fetch feedback error:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

export default router;
