import Like from "../models/Like.js";
import Comment from "../models/Comment.js";
import Wishlist from "../models/Wishlist.js";
import DemoConsumption from "../models/DemoConsumption.js";
import AllPost from "../models/Allposts.js";

export async function getInteractUsers(postId) {
  const post = await AllPost.findById(postId)
    .select("user type")
    .lean();

  if (!post) return [];

  const userIds = new Set();

  // Likes
  const likes = await Like.find({ post: postId })
    .select("user")
    .lean();

  likes.forEach((like) => {
    if (like.user)
      userIds.add(like.user.toString());
  });

  // Comments
  const comments = await Comment.find({ post: postId })
    .select("user")
    .lean();

  comments.forEach((comment) => {
    if (comment.user)
      userIds.add(comment.user.toString());
  });

  // Wishlist
  const wishlists = await Wishlist.find({ post: postId })
    .select("user")
    .lean();

  wishlists.forEach((wishlist) => {
    if (wishlist.user)
      userIds.add(wishlist.user.toString());
  });

  // Game demo consumption
  if (post.type === "game_post") {
    const consumers = await DemoConsumption.find({
      gamePost: postId,
      status: "consumed",
    })
      .select("user")
      .lean();

    consumers.forEach((demo) => {
      if (demo.user)
        userIds.add(demo.user.toString());
    });
  }

  console.log("Interact users for post", postId, ":", [...userIds]);

  // Don't notify the author
  userIds.delete(post.user.toString());

  return [...userIds];
}