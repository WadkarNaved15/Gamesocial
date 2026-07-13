import express from "express";
import User from "../models/User.js";

const router = express.Router();

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get("/", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    if (!q) {
      return res.json([]);
    }

    const users = await User.find({
      username: {
        $regex: `^${escapeRegex(q)}`,
        $options: "i",
      },
    })
      .select("username displayName avatar")
      .limit(8)
      .lean();

    res.json(users);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;