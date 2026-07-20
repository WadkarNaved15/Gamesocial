import GameSessionRequest from "../models/GameSessionRequest.js";

export async function enrichSessionRequests(posts, userId) {
  if (!userId || !posts?.length) return;

  const gamePosts = posts.filter(
    (p) => p.type === "game_post"
  );

  if (!gamePosts.length) return;

  const requests = await GameSessionRequest.find({
    requestedBy: userId,
    gamePost: {
      $in: gamePosts.map((p) => p._id),
    },
  })
    .select("gamePost createdAt notifiedAt")
    .lean();

  const map = new Map(
    requests.map((r) => [r.gamePost.toString(), r])
  );

  for (const post of gamePosts) {
    const request = map.get(post._id.toString());

    post.gamePost.sessionRequest = request
      ? {
          hasRequested: true,
          requestedAt: request.createdAt,
          notifiedAt: request.notifiedAt,
        }
      : {
          hasRequested: false,
        };
  }
}