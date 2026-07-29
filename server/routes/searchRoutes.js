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

    const escaped = escapeRegex(q);

    const users = await User.aggregate([
      {
        $match: {
          $or: [
            {
              username: {
                $regex: escaped,
                $options: "i",
              },
            },
            {
              displayName: {
                $regex: escaped,
                $options: "i",
              },
            },
          ],
        },
      },

      {
        $addFields: {
          priority: {
            $switch: {
              branches: [
                // username starts with query
                {
                  case: {
                    $regexMatch: {
                      input: "$username",
                      regex: `^${escaped}`,
                      options: "i",
                    },
                  },
                  then: 1,
                },

                // displayName starts with query
                {
                  case: {
                    $regexMatch: {
                      input: "$displayName",
                      regex: `^${escaped}`,
                      options: "i",
                    },
                  },
                  then: 2,
                },

                // query matches a word inside display name
                {
                  case: {
                    $regexMatch: {
                      input: "$displayName",
                      regex: `\\b${escaped}`,
                      options: "i",
                    },
                  },
                  then: 3,
                },

                // username contains query
                {
                  case: {
                    $regexMatch: {
                      input: "$username",
                      regex: escaped,
                      options: "i",
                    },
                  },
                  then: 4,
                },

                // display name contains query anywhere
                {
                  case: {
                    $regexMatch: {
                      input: "$displayName",
                      regex: escaped,
                      options: "i",
                    },
                  },
                  then: 5,
                },
              ],
              default: 6,
            },
          },
        },
      },

      {
        $sort: {
          priority: 1,
          followersCount: -1,
          username: 1,
        },
      },

      {
        $project: {
          username: 1,
          displayName: 1,
          avatar: 1,
        },
      },

      {
        $limit: 8,
      },
    ]);

    res.json(users);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;