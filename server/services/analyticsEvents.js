// ─── LIKE / COMMENT ANALYTICS HELPERS (call from your like/comment routes) ───
//
// Export these so your existing like and comment route handlers can import
// and call them, keeping analytics writes close to their events.

import PostAnalytics from "../models/postAnalytics.js";
import AllPost from "../models/Allposts.js";
import PostViewEvent from "../models/postViewEvent.js";


/**
 * Call when a like is added.
 * @param {string|ObjectId} postId
 */
export async function onLikeAdded(postId) {
  const dateKey = new Date().toISOString().split("T")[0];

  // Ensure analytics document exists and initialize fields
  await PostAnalytics.findOneAndUpdate(
    { post: postId },
    {
      $setOnInsert: {
        post: postId,
        dailyStats: [],
        hourlyStats: [],
        lifetime: {
          views: 0,
          uniqueViews: 0,
          watchTimeMs: 0,
          likes: 0,
          comments: 0,
          demoConsumptions: 0,
          sessions: 0,
          sessionPlayTimeMs: 0,
          uniquePlayers: 0,
          repeatPlayers: 0,
        },
      },
      $inc: {
        "lifetime.likes": 1,
      },
    },
    {
      upsert: true,
      new: true,
    }
  );

  // Try incrementing existing daily row
  const dailyResult = await PostAnalytics.updateOne(
    {
      post: postId,
      "dailyStats.date": dateKey,
    },
    {
      $inc: {
        "dailyStats.$.likes": 1,
      },
    }
  );

  // If today's row doesn't exist, create it
  if (dailyResult.modifiedCount === 0) {
    await PostAnalytics.updateOne(
      { post: postId },
      {
        $push: {
          dailyStats: {
            date: dateKey,
            views: 0,
            uniqueViews: 0,
            watchTimeMs: 0,
            likes: 1,
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
 * Call when a like is removed.
 * Ensures count never goes below zero via $max trick.
 * @param {string|ObjectId} postId
 */
export async function onLikeRemoved(postId) {
  const dateKey = new Date().toISOString().split("T")[0];

  // Decrement lifetime but floor at 0
  await PostAnalytics.updateOne(
    { post: postId, "lifetime.likes": { $gt: 0 } },
    { $inc: { "lifetime.likes": -1 } }
  );

  // Decrement daily but floor at 0
  await PostAnalytics.updateOne(
  {
    post: postId,
    dailyStats: {
      $elemMatch: {
        date: dateKey,
        likes: { $gt: 0 },
      },
    },
  },
  {
    $inc: {
      "dailyStats.$.likes": -1,
    },
  }
);
}

/**
 * Call when a comment is created.
 * @param {string|ObjectId} postId
 */
export async function onCommentAdded(postId) {
  const dateKey = new Date().toISOString().split("T")[0];

  await PostAnalytics.findOneAndUpdate(
    { post: postId },
    {
      $setOnInsert: {
        post: postId,
        dailyStats: [],
        hourlyStats: [],
      },
      $inc: {
        "lifetime.comments": 1,
      },
    },
    {
      upsert: true,
    }
  );

  const dailyResult = await PostAnalytics.updateOne(
    {
      post: postId,
      "dailyStats.date": dateKey,
    },
    {
      $inc: {
        "dailyStats.$.comments": 1,
      },
    }
  );

  if (dailyResult.modifiedCount === 0) {
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
            comments: 1,
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
 * Call when a comment is deleted.
 * @param {string|ObjectId} postId
 */
export async function onCommentRemoved(postId) {
  const dateKey = new Date().toISOString().split("T")[0];

  await PostAnalytics.updateOne(
    { post: postId, "lifetime.comments": { $gt: 0 } },
    { $inc: { "lifetime.comments": -1 } }
  );

  await PostAnalytics.updateOne(
  {
    post: postId,
    dailyStats: {
      $elemMatch: {
        date: dateKey,
        comments: { $gt: 0 },
      },
    },
  },
  {
    $inc: {
      "dailyStats.$.comments": -1,
    },
  }
);
}