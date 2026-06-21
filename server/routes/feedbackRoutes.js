// routes/feedbackRoutes.js

import express from "express";
import { createFeedback } from "../controllers/feedbackController.js";
import verifyToken  from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, createFeedback);

export default router;