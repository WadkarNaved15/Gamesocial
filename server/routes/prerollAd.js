// routes/prerollAd.routes.js

import express from "express";
import verifyToken from "../middlewares/authMiddleware.js";
import {
  createPrerollAd,
} from "../controllers/prerollAd.controller.js";

const router = express.Router();

router.post("/", verifyToken, createPrerollAd);

export default router;