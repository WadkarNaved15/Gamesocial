// ─── LIKE / COMMENT ANALYTICS HELPERS (call from your like/comment routes) ───
//
// Export these so your existing like and comment route handlers can import
// and call them, keeping analytics writes close to their events.

import PostAnalytics from "../models/postAnalytics.js";
import AllPost from "../models/Allposts.js";
import PostViewEvent from "../models/postViewEvent.js";

async function ensureDailyRow(postId, dateKey) {
  await PostAnalytics.updateOne(
    { post: postId },
    {
      $setOnInsert: {
        post: postId,
        dailyStats: [],
        hourlyStats: [],
      },
    },
    {
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  const exists = await PostAnalytics.exists({
    post: postId,
    "dailyStats.date": dateKey,
  });

  if (!exists) {
    await PostAnalytics.updateOne(
      { post: postId },
      {
        $push: {
          dailyStats: {
            date: dateKey,
            views: 0,
            uniqueViews: 0,
            watchTimeMs: 0,
            likes: 0,
            comments: 0,
            demoConsumptions: 0,
            sessions: 0,
            sessionPlayTimeMs: 0,
            uniquePlayers: 0,
          },
        },
      }
    );
  }
}


/**
 * Call when a like is added.
 * @param {string|ObjectId} postId
 */
export async function onLikeAdded(postId) {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  await ensureDailyRow(postId, dateKey);

  await PostAnalytics.updateOne(
    { post: postId },
    {
      $inc: {
        "lifetime.likes": 1,
        "dailyStats.$[day].likes": 1,
      },
    },
    {
      arrayFilters: [{ "day.date": dateKey }],
    }
  );
}

export async function onLikeRemoved(postId) {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  await PostAnalytics.updateOne(
    {
      post: postId,
      "lifetime.likes": { $gt: 0 },
    },
    {
      $inc: {
        "lifetime.likes": -1,
      },
    }
  );

  await PostAnalytics.updateOne(
    {
      post: postId,
    },
    {
      $inc: {
        "dailyStats.$[day].likes": -1,
      },
    },
    {
      arrayFilters: [
        {
          "day.date": dateKey,
          "day.likes": { $gt: 0 },
        },
      ],
    }
  );
}
/**
 * Call when a comment is created.
 * @param {string|ObjectId} postId
 */
export async function onCommentAdded(postId) {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  await ensureDailyRow(postId, dateKey);

  await PostAnalytics.updateOne(
    { post: postId },
    {
      $inc: {
        "lifetime.comments": 1,
        "dailyStats.$[day].comments": 1,
      },
    },
    {
      arrayFilters: [{ "day.date": dateKey }],
    }
  );
}
/**
 * Call when a comment is deleted.
 * @param {string|ObjectId} postId
 */
export async function onCommentRemoved(postId) {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  await PostAnalytics.updateOne(
    {
      post: postId,
      "lifetime.comments": { $gt: 0 },
    },
    {
      $inc: {
        "lifetime.comments": -1,
      },
    }
  );

  await PostAnalytics.updateOne(
    { post: postId },
    {
      $inc: {
        "dailyStats.$[day].comments": -1,
      },
    },
    {
      arrayFilters: [
        {
          "day.date": dateKey,
          "day.comments": { $gt: 0 },
        },
      ],
    }
  );
}