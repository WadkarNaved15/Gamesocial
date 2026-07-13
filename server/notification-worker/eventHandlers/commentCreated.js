import Comment from "../../models/Comment.js";
import AllPost from "../../models/Allposts.js";
import { getInteractUsers } from "../../services/interact.js";
import { handleNotificationEvent } from "../handleNotificationEvent.js";
import { NotificationTypes } from "../types.js";

export async function handleCommentCreated(event) {
  const { actorId, commentId } = event;

  const comment = await Comment.findById(commentId)
    .select("post mentions hasInteractMention")
    .lean();

  if (!comment) return;

  const post = await AllPost.findById(comment.post)
    .select("user")
    .lean();

  if (!post) return;

  const notifications = [];

  //
  // 1. Notify post owner
  //
  if (post.user.toString() !== actorId) {
    notifications.push({
        recipientId: post.user.toString(),
        type: NotificationTypes.COMMENT,
    });
    }

  //
  // 2. Notify mentioned users
  //
  for (const mention of comment.mentions || []) {
    if (!mention.user) continue;

    const id = mention.user.toString();

    if (
        id !== actorId &&
        id !== post.user.toString()
    ) {
        notifications.push({
        recipientId: id,
        type: NotificationTypes.MENTION_COMMENT,
        });
    }
    }

  //
  // 3. Notify @interact users
  //
  let interactUsers = [];

  if (comment.hasInteractMention) {
    interactUsers = await getInteractUsers(comment.post);
  }

  interactUsers.forEach((id) => {
    if (
        id !== actorId &&
        id !== post.user.toString() &&
        !notifications.some(
        n => n.recipientId === id
        )
    ) {
        notifications.push({
        recipientId: id,
        type: NotificationTypes.INTERACT_COMMENT,
        });
    }
    });

    console.log("Comment has @interact:", comment.hasInteractMention);
    console.log("Interact users:", interactUsers);
    console.log("Notifications:", notifications);

  //
  // 4. Create notifications
  //
  await Promise.all(
    notifications.map((notification) =>
        handleNotificationEvent({
        type: notification.type,
        actorId,
        recipientId: notification.recipientId,
        postId: comment.post,
        })
    )
    );
}