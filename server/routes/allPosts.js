import express from "express";
import { createPost } from "../controllers/post.controller.js";
import { deletePost } from "../controllers/post.controller.js";
import verifyToken from "../middlewares/authMiddleware.js";
const router = express.Router();

router.post("/", verifyToken, createPost);
router.delete("/:postId", verifyToken, deletePost);
export default router;
