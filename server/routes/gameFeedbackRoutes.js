import express from "express";
import verifyToken from "../middlewares/authMiddleware.js";
import {
  createGameFeedback,
  getAllGameFeedback,
} from "../controllers/gameFeedbackController.js";
import requireAdmin from "../middlewares/adminMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, createGameFeedback);

router.get(
  "/",
  verifyToken,
  requireAdmin,
  getAllGameFeedback
);

export default router;