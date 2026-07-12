import Chat from "../models/Chat.js";

export const acceptChatRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        message: "Chat not found",
      });
    }

    // must be participant
    if (
      !chat.participants.some(
        (p) => p.toString() === userId
      )
    ) {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    // requester cannot accept own request
    if (
      chat.requestedBy &&
      chat.requestedBy.toString() === userId
    ) {
      return res.status(400).json({
        message: "Cannot accept your own request",
      });
    }

    chat.status = "accepted";
    await chat.save();

    res.json({
      success: true,
      chat,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to accept request",
    });
  }
};

export const rejectChatRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        message: "Chat not found",
      });
    }

    if (
      !chat.participants.some(
        (p) => p.toString() === userId
      )
    ) {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    if (
      chat.requestedBy &&
      chat.requestedBy.toString() === userId
    ) {
      return res.status(400).json({
        message: "Cannot reject your own request",
      });
    }

    chat.status = "declined";

    await chat.save();

    res.json({
      success: true,
      chat,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to reject request",
    });
  }
};

export const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await Chat.find({
      participants: userId,
      status: "pending",
      requestedBy: { $ne: userId },
    })
      .populate(
        "participants",
        "username avatar"
      );

    const formatted = requests.map((chat) => {
      const otherUser =
        chat.participants.find(
          (p) =>
            p._id.toString() !== userId
        );

      return {
        chatId: chat._id,
        user: otherUser,
        status: chat.status,
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message:
        "Failed to fetch requests",
    });
  }
};