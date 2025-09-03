import express from "express";
import { startGameSession } from "../functions/gameStream.js"; // adjust path as needed

const router = express.Router();

router.post("/start_game", async (req, res) => {
  try {
    const { gameFolderPath } = req.body;

    // Trigger AWS SSM to start the game
    const commandId = await startGameSession(gameFolderPath);

    res.json({
      message: "Game start command sent successfully",
      commandId,
    });
  } catch (error) {
    console.error("Error starting game session:", error);
    res.status(500).json({
      message: "Failed to start game session",
      error: error.message,
    });
  }
});

export default router;
