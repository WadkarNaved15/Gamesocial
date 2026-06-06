import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import adminOnly from "../middlewares/adminMiddleware.js";

import User from "../models/User.js";
import AllPost from "../models/Allposts.js";
import GameSession from "../models/GameSession.js";
import CreditAudit from "../models/CreditAudit.js";

const router = express.Router();

router.use(authMiddleware);
router.use(adminOnly);

async function loadGame(gameId) {
  const game = await AllPost.findOne({
    _id: gameId,
    type: "game_post",
  });

  if (!game) {
    throw new Error("Game not found");
  }

  return game;
}

router.get("/dashboard", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      activeGames,
      exhaustedGames,
      lowCreditGames,
      totalCreditsAgg,
      consumedToday,
      giftedToday,
      deductedToday,
    ] = await Promise.all([
      AllPost.countDocuments({
        type: "game_post",
        "gamePost.creditBudget.status": "active",
      }),

      AllPost.countDocuments({
        type: "game_post",
        "gamePost.creditBudget.status": "exhausted",
      }),

      AllPost.countDocuments({
        type: "game_post",
        "gamePost.creditBudget.remainingCredits": {
          $gt: 0,
          $lt: 100,
        },
      }),

      AllPost.aggregate([
        {
          $match: {
            type: "game_post",
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum:
                "$gamePost.creditBudget.remainingCredits",
            },
          },
        },
      ]),

      CreditAudit.aggregate([
        {
          $match: {
            action: "consumption",
            createdAt: { $gte: today },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$credits" },
          },
        },
      ]),

      CreditAudit.aggregate([
        {
          $match: {
            action: "gift",
            createdAt: { $gte: today },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$credits" },
          },
        },
      ]),

      CreditAudit.aggregate([
        {
          $match: {
            action: "deduct",
            createdAt: { $gte: today },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$credits" },
          },
        },
      ]),
    ]);

    res.json({
      totalActiveGames: activeGames,
      exhaustedGames,
      lowCreditGames,

      totalCreditsRemaining:
        totalCreditsAgg?.[0]?.total || 0,

      creditsConsumedToday:
        consumedToday?.[0]?.total || 0,

      creditsGiftedToday:
        giftedToday?.[0]?.total || 0,

      creditsDeductedToday:
        deductedToday?.[0]?.total || 0,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed dashboard",
    });
  }
});


router.get("/creators", async (req, res) => {
  try {
    const query = req.query.query?.trim();
    console.log("Search query:", query,req.query);

    if (!query) {
      return res.json([]);
    }

    const creators = await User.find({
      $or: [
        {
          username: {
            $regex: query,
            $options: "i",
          },
        },
        {
          email: {
            $regex: query,
            $options: "i",
          },
        },
        {
          _id: query.match(/^[0-9a-fA-F]{24}$/)
            ? query
            : null,
        },
      ],
    })
      .select(
        "username email avatar createdAt isVerified"
      )
      .limit(20)
      .lean();

    res.json(creators);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Search failed",
    });
  }
});

router.get(
  "/creator/:creatorId",
  async (req, res) => {
    try {
      const { creatorId } = req.params;

      const creator =
        await User.findById(creatorId).lean();

      if (!creator) {
        return res
          .status(404)
          .json({ message: "Creator not found" });
      }

      const games = await AllPost.find({
        user: creatorId,
        type: "game_post",
      })
        .select(
          `
        gamePost.gameName
        gamePost.creditBudget
        gamePost.gameMetrics
        createdAt
      `
        )
        .lean();

      const totalGames = games.length;

      const totals = games.reduce(
        (acc, game) => {
          const metrics =
            game.gamePost?.gameMetrics || {};

          const budget =
            game.gamePost?.creditBudget || {};

          acc.sessions +=
            metrics.totalSessions || 0;

          acc.playTime +=
            metrics.totalSessionTimeMs || 0;

          acc.purchased +=
            budget.purchasedCredits || 0;

          acc.used +=
            budget.usedCredits || 0;

          acc.remaining +=
            budget.remainingCredits || 0;

          return acc;
        },
        {
          sessions: 0,
          playTime: 0,
          purchased: 0,
          used: 0,
          remaining: 0,
        }
      );

      res.json({
        creator: {
          _id: creator._id,
          username: creator.username,
          email: creator.email,
          avatar: creator.avatar,
          createdAt: creator.createdAt,
        },

        summary: {
          totalGames,

          totalSessions:
            totals.sessions,

          totalPlayTime:
            totals.playTime,

          purchasedCredits:
            totals.purchased,

          totalCreditsConsumed:
            totals.used,

          remainingCredits:
            totals.remaining,
        },
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: "Failed",
      });
    }
  }
);


router.post(
  "/creator/:creatorId/gift",
  async (req, res) => {
    try {
      const { credits, reason } = req.body;

      if (!credits || credits <= 0) {
        return res.status(400).json({
          message: "Invalid credits",
        });
      }

      const games = await AllPost.find({
        user: req.params.creatorId,
        type: "game_post",
      });

      for (const game of games) {
        const previous =
          game.gamePost.creditBudget
            ?.remainingCredits || 0;

        await AllPost.updateOne(
          { _id: game._id },
          {
            $inc: {
              "gamePost.creditBudget.remainingCredits":
                credits,

              "gamePost.creditBudget.giftedCredits":
                credits,
            },

            $set: {
              "gamePost.creditBudget.status":
                "active",
            },
          }
        );

        await CreditAudit.create({
          gamePost: game._id,
          creator: game.user,
          admin: req.user._id,

          action: "gift",

          credits,

          previousBalance:
            previous,

          newBalance:
            previous + credits,

          reason,
        });
      }

      res.json({
        success: true,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: "Gift failed",
      });
    }
  }
);


router.post(
  "/creator/:creatorId/deduct",
  async (req, res) => {
    try {
      const { credits, reason } = req.body;

      const games = await AllPost.find({
        user: req.params.creatorId,
        type: "game_post",
      });

      for (const game of games) {
        const current =
          game.gamePost.creditBudget
            ?.remainingCredits || 0;

        const deduction =
          Math.min(
            credits,
            current
          );

        await AllPost.updateOne(
          { _id: game._id },
          {
            $inc: {
              "gamePost.creditBudget.remainingCredits":
                -deduction,

              "gamePost.creditBudget.deductedCredits":
                deduction,
            },
          }
        );

        await CreditAudit.create({
          gamePost: game._id,
          creator: game.user,
          admin: req.user._id,

          action: "deduct",

          credits: deduction,

          previousBalance:
            current,

          newBalance:
            current - deduction,

          reason,
        });
      }

      res.json({
        success: true,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: "Deduct failed",
      });
    }
  }
);


router.get(
  "/dashboard/trends",
  async (req, res) => {
    try {
      const start = new Date();

      start.setDate(
        start.getDate() - 30
      );

      const rows =
        await CreditAudit.aggregate([
          {
            $match: {
              createdAt: {
                $gte: start,
              },
            },
          },

          {
            $group: {
              _id: {
                day: {
                  $dateToString: {
                    format:
                      "%Y-%m-%d",
                    date:
                      "$createdAt",
                  },
                },

                action:
                  "$action",
              },

              credits: {
                $sum:
                  "$credits",
              },
            },
          },

          {
            $sort: {
              "_id.day": 1,
            },
          },
        ]);

      res.json(rows);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message:
          "Failed trends",
      });
    }
  }
);


router.get("/games", async (req, res) => {
  try {
    const { creatorId } = req.query;

    const filter = {
      type: "game_post",
    };

    if (creatorId) {
      filter.user = creatorId;
    }

    const games = await AllPost.find(filter)
      .select(`
        user
        createdAt
        gamePost.gameName
        gamePost.version
        gamePost.creditBudget
        gamePost.gameMetrics
        gamePost.visibility
      `)
      .lean();

    res.json(
      games.map(game => ({
        _id: game._id,
        user: game.user,
        gameName: game.gamePost?.gameName,
        version: game.gamePost?.version,
        createdAt: game.createdAt,
        visibility: game.gamePost?.visibility,
        creditBudget: game.gamePost?.creditBudget,
        gameMetrics: game.gamePost?.gameMetrics,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Failed to load games",
    });
  }
});


router.post(
  "/game/:gameId/gift",
  async (req, res) => {
    try {
      const { gameId } = req.params;
      const { credits, reason } = req.body;

      if (!credits || credits <= 0) {
        return res.status(400).json({
          message: "Invalid credits",
        });
      }

      const game = await loadGame(gameId);

      const budget =
        game.gamePost.creditBudget;

      const previousBalance =
        budget.remainingCredits;

      const newBalance =
        previousBalance + credits;

      await AllPost.updateOne(
        {
          _id: gameId,
        },
        {
          $inc: {
            "gamePost.creditBudget.remainingCredits":
              credits,

            "gamePost.creditBudget.purchasedCredits":
              credits,
          },

          $set: {
            "gamePost.creditBudget.status":
              "active",
          },
        }
      );

      await CreditAudit.create({
        gamePost: game._id,
        creator: game.user,
        admin: req.user.id,

        action: "gift",

        credits,

        previousBalance,
        newBalance,

        reason,
      });

      res.json({
        success: true,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: "Gift failed",
      });
    }
  }
);


router.post(
  "/game/:gameId/deduct",
  async (req, res) => {
    try {
      const { gameId } = req.params;
      const { credits, reason } = req.body;

      const game = await loadGame(gameId);

      const budget =
        game.gamePost.creditBudget;

      const previousBalance =
        budget.remainingCredits;

      const deduction = Math.min(
        credits,
        previousBalance
      );

      const newBalance =
        previousBalance - deduction;

      await AllPost.updateOne(
        {
          _id: gameId,
        },
        {
          $inc: {
            "gamePost.creditBudget.remainingCredits":
              -deduction,
          },
        }
      );

      await CreditAudit.create({
        gamePost: game._id,
        creator: game.user,
        admin: req.user.id,

        action: "deduct",

        credits: deduction,

        previousBalance,
        newBalance,

        reason,
      });

      if (newBalance <= 0) {
        await AllPost.updateOne(
          { _id: gameId },
          {
            $set: {
              "gamePost.creditBudget.status":
                "exhausted",
            },
          }
        );
      }

      res.json({
        success: true,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: "Deduct failed",
      });
    }
  }
);


router.post(
  "/game/:gameId/set-balance",
  async (req, res) => {
    try {
      const { gameId } = req.params;

      const {
        balance,
        reason,
      } = req.body;

      if (balance < 0) {
        return res.status(400).json({
          message:
            "Balance cannot be negative",
        });
      }

      const game = await loadGame(gameId);

      const budget =
        game.gamePost.creditBudget;

      const previousBalance =
        budget.remainingCredits;

      await AllPost.updateOne(
        {
          _id: gameId,
        },
        {
          $set: {
            "gamePost.creditBudget.remainingCredits":
              balance,

            "gamePost.creditBudget.status":
              balance > 0
                ? "active"
                : "exhausted",
          },
        }
      );

      await CreditAudit.create({
        gamePost: game._id,
        creator: game.user,
        admin: req.user.id,

        action: "set_balance",

        credits: balance,

        previousBalance,
        newBalance: balance,

        reason,
      });

      res.json({
        success: true,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: "Failed",
      });
    }
  }
);


router.post(
  "/game/:gameId/hide",
  async (req, res) => {
    try {
      const game =
        await loadGame(
          req.params.gameId
        );

      await AllPost.updateOne(
        {
          _id: game._id,
        },
        {
          $set: {
            "gamePost.visibility": "hidden",
          },
        }
      );

      await CreditAudit.create({
        gamePost: game._id,
        creator: game.user,
        admin: req.user.id,

        action: "hide",

        credits: 0,

        previousBalance:
          game.gamePost.creditBudget
            .remainingCredits,

        newBalance:
          game.gamePost.creditBudget
            .remainingCredits,

        reason: "Admin hidden",
      });

      res.json({
        success: true,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: "Failed",
      });
    }
  }
);


router.post(
  "/game/:gameId/unhide",
  async (req, res) => {
    try {
      const game =
        await loadGame(
          req.params.gameId
        );

      await AllPost.updateOne(
        {
          _id: game._id,
        },
        {
          $set: {
            "gamePost.visibility": "active",
          },
        }
      );

      await CreditAudit.create({
        gamePost: game._id,
        creator: game.user,
        admin: req.user.id,

        action: "unhide",

        credits: 0,

        previousBalance:
          game.gamePost.creditBudget
            .remainingCredits,

        newBalance:
          game.gamePost.creditBudget
            .remainingCredits,

        reason: "Admin unhidden",
      });

      res.json({
        success: true,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: "Failed",
      });
    }
  }
);


router.post(
  "/game/:gameId/reactivate",
  async (req, res) => {
    try {
      const game =
        await loadGame(
          req.params.gameId
        );

      const credits =
        game.gamePost.creditBudget
          ?.remainingCredits || 0;

      if (credits <= 0) {
        return res.status(400).json({
          message:
            "Game has no credits",
        });
      }

      await AllPost.updateOne(
        {
          _id: game._id,
        },
        {
          $set: {
            "gamePost.creditBudget.status":
              "active",
          },
        }
      );

      await CreditAudit.create({
        gamePost: game._id,
        creator: game.user,
        admin: req.user.id,

        action: "reactivate",

        credits: 0,

        previousBalance: credits,
        newBalance: credits,

        reason:
          "Manual reactivation",
      });

      res.json({
        success: true,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: "Failed",
      });
    }
  }
);


router.get("/audit", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      action,
      creatorId,
      gamePostId,
      adminId,
    } = req.query;

    const filter = {};

    if (action) filter.action = action;
    if (creatorId) filter.creator = creatorId;
    if (gamePostId) filter.gamePost = gamePostId;
    if (adminId) filter.admin = adminId;

    const skip =
      (Number(page) - 1) *
      Number(limit);

    const [rows, total] =
      await Promise.all([
        CreditAudit.find(filter)
          .populate(
            "creator",
            "username avatar"
          )
          .populate(
            "admin",
            "username avatar"
          )
          .populate(
            "gamePost",
            "gamePost.gameName"
          )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(Number(limit))
          .lean(),

        CreditAudit.countDocuments(filter),
      ]);

    res.json({
      rows,
      total,
      page: Number(page),
      pages: Math.ceil(
        total / Number(limit)
      ),
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed",
    });
  }
});

router.get("/games/search", async (req, res) => {
  try {
    const query = req.query.query?.trim();

    if (!query) {
      return res.json([]);
    }

    const posts = await AllPost.find({
      type: "game_post",
      $or: [
        {
          "gamePost.gameName": {
            $regex: query,
            $options: "i",
          },
        },
        ...(query.match(/^[0-9a-fA-F]{24}$/)
          ? [{ _id: query }]
          : []),
      ],
    })
      .populate(
        "user",
        "username avatar email"
      )
      .limit(25)
      .lean();

    const games = posts.map((post) => ({
      _id: post._id,

      creatorId: post.user?._id,
      creatorUsername:
        post.user?.username,

      creatorAvatar:
        post.user?.avatar,

      gameName:
        post.gamePost?.gameName || "",

      version:
        post.gamePost?.version || "",

      createdAt:
        post.createdAt,

      visibility:
        post.gamePost?.visibility ||
        "active",

      creditBudget:
        post.gamePost?.creditBudget || {
          purchasedCredits: 0,
          giftedCredits: 0,
          deductedCredits: 0,
          usedCredits: 0,
          remainingCredits: 0,
          status: "active",
        },

      gameMetrics:
        post.gamePost?.gameMetrics || {
          totalSessions: 0,
          totalSessionTimeMs: 0,
          uniquePlayers: 0,
        },
    }));

    res.json(games);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Search failed",
    });
  }
});



router.get(
  "/game/:gameId/history",
  async (req, res) => {
    try {
      const rows =
        await CreditAudit.find({
          gamePost:
            req.params.gameId,
        })
          .populate(
            "admin",
            "username avatar"
          )
          .sort({
            createdAt: -1,
          })
          .lean();

      res.json(rows);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: "Failed",
      });
    }
  }
);


router.get(
  "/creator/:creatorId/history",
  async (req, res) => {
    try {
      const rows =
        await CreditAudit.find({
          creator:
            req.params.creatorId,
        })
          .populate(
            "admin",
            "username avatar"
          )
          .populate(
            "gamePost",
            "gamePost.gameName"
          )
          .sort({
            createdAt: -1,
          })
          .lean();

      res.json(rows);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: "Failed",
      });
    }
  }
);


router.get(
  "/game/:gameId/burn-rate",
  async (req, res) => {
    try {
      const gameId =
        req.params.gameId;

      const today =
        new Date();

      const seven =
        new Date();

      const thirty =
        new Date();

      seven.setDate(
        seven.getDate() - 7
      );

      thirty.setDate(
        thirty.getDate() - 30
      );

      const [
        todayBurn,
        sevenBurn,
        thirtyBurn,
        game,
      ] = await Promise.all([
        CreditAudit.aggregate([
          {
            $match: {
              gamePost:
                new mongoose.Types.ObjectId(
                  gameId
                ),

              action:
                "consumption",

              createdAt: {
                $gte: new Date(
                  today.setHours(
                    0,
                    0,
                    0,
                    0
                  )
                ),
              },
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum:
                  "$credits",
              },
            },
          },
        ]),

        CreditAudit.aggregate([
          {
            $match: {
              gamePost:
                new mongoose.Types.ObjectId(
                  gameId
                ),

              action:
                "consumption",

              createdAt: {
                $gte: seven,
              },
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum:
                  "$credits",
              },
            },
          },
        ]),

        CreditAudit.aggregate([
          {
            $match: {
              gamePost:
                new mongoose.Types.ObjectId(
                  gameId
                ),

              action:
                "consumption",

              createdAt: {
                $gte: thirty,
              },
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum:
                  "$credits",
              },
            },
          },
        ]),

        AllPost.findById(
          gameId
        ).lean(),
      ]);

      const remaining =
        game?.gamePost
          ?.creditBudget
          ?.remainingCredits ||
        0;

      const avgDailyBurn =
        (thirtyBurn?.[0]
          ?.total || 0) / 30;

      const estimatedDays =
        avgDailyBurn > 0
          ? Math.floor(
              remaining /
                avgDailyBurn
            )
          : null;

      res.json({
        burnedToday:
          todayBurn?.[0]
            ?.total || 0,

        burned7Days:
          sevenBurn?.[0]
            ?.total || 0,

        burned30Days:
          thirtyBurn?.[0]
            ?.total || 0,

        averageDailyBurn:
          avgDailyBurn,

        estimatedDaysRemaining:
          estimatedDays,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: "Failed",
      });
    }
  }
);


router.get(
  "/game/:gameId/trends",
  async (req, res) => {
    try {
      const start =
        new Date();

      start.setDate(
        start.getDate() - 30
      );

      const rows =
        await CreditAudit.aggregate([
          {
            $match: {
              gamePost:
                new mongoose.Types.ObjectId(
                  req.params.gameId
                ),

              action:
                "consumption",

              createdAt: {
                $gte: start,
              },
            },
          },

          {
            $group: {
              _id: {
                $dateToString:
                  {
                    format:
                      "%Y-%m-%d",

                    date:
                      "$createdAt",
                  },
              },

              credits: {
                $sum:
                  "$credits",
              },
            },
          },

          {
            $sort: {
              _id: 1,
            },
          },
        ]);

      res.json(rows);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: "Failed",
      });
    }
  }
);


router.get(
  "/creator/:creatorId/overview",
  async (req, res) => {
    try {
      const games =
        await AllPost.find({
          user:
            req.params.creatorId,
          type: "game_post",
        }).lean();

      let purchased = 0;
      let consumed = 0;
      let remaining = 0;
      let active = 0;
      let exhausted = 0;

      games.forEach((game) => {
        const budget =
          game.gamePost
            ?.creditBudget || {};

        purchased +=
          budget.purchasedCredits ||
          0;

        consumed +=
          budget.usedCredits || 0;

        remaining +=
          budget.remainingCredits ||
          0;

        if (
          budget.status ===
          "active"
        )
          active++;

        if (
          budget.status ===
          "exhausted"
        )
          exhausted++;
      });

      res.json({
        purchasedCredits:
          purchased,

        consumedCredits:
          consumed,

        remainingCredits:
          remaining,

        totalGames:
          games.length,

        activeGames:
          active,

        exhaustedGames:
          exhausted,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: "Failed",
      });
    }
  }
);

export default router;