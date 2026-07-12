import express from "express";
import verifyToken from "../middlewares/authMiddleware.js";

import {
  acceptChatRequest,
  rejectChatRequest,
  getPendingRequests
} from "../controllers/chatRequestController.js";

const router = express.Router();

router.put(
  "/:chatId/accept",
  verifyToken,
  acceptChatRequest
);

router.put(
  "/:chatId/reject",
  verifyToken,
  rejectChatRequest
);

router.get(
  "/pending",
  verifyToken,
  getPendingRequests
);

export default router;