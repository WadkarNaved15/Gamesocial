import express from "express";
import verifyToken from "../middlewares/authMiddleware.js";
import {
  createStreamFeedback,
  getAllStreamFeedback,
} from "../controllers/streamFeedback.controller.js";

const router = express.Router();

//Submit stream feedback

router.post("/", verifyToken, createStreamFeedback); 

// Admin / Analytics

router.get("/", verifyToken, getAllStreamFeedback);

export default router;