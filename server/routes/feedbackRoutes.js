// routes/feedbackRoutes.js

import express from "express";
import { createFeedback, getAllFeedback} from "../controllers/feedbackController.js";
import verifyToken  from "../middlewares/authMiddleware.js";
import requireAdmin from "../middlewares/adminMiddleware.js";
const router = express.Router();

router.post("/", verifyToken, createFeedback);
router.get(
   "/",
   verifyToken,
   requireAdmin,
   getAllFeedback
);
export default router;