// utils/enrichDemoConsumed.js

import DemoConsumption from "../models/DemoConsumption.js";

export async function enrichDemoConsumed(posts, userId) {
  if (!userId || !posts?.length) return posts;

  const gamePostIds = posts
    .filter(p => p.type === "game_post" && p.gamePost)
    .map(p => p._id.toString());

  if (!gamePostIds.length) return posts;

  const consumptions = await DemoConsumption.find({
    user: userId,
    gamePost: { $in: gamePostIds },
    status: "consumed",
  })
    .select("gamePost")
    .lean();

  const consumedSet = new Set(
    consumptions.map(c => c.gamePost.toString())
  );

  for (const post of posts) {
    if (post.type === "game_post" && post.gamePost) {
      post.gamePost.demoConsumed =
        consumedSet.has(post._id.toString());
    }
  }

  return posts;
}