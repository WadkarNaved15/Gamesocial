import AllPost from "../../models/Allposts.js";
import { getInteractUsers } from "../../services/interact.js";
import { handleNotificationEvent } from "../handleNotificationEvent.js";
import { NotificationTypes } from "../types.js";

export async function handlePostCreated(event) {
  const { actorId, postId } = event;

  const post = await AllPost.findById(postId)
    .select("user mentions hasInteractMention")
    .lean();

  if (!post) return;

  const notifications = [];

  //
  // 1. Notify mentioned users
  //
  for (const mention of post.mentions || []) {
    if (!mention.user) continue;

    const id = mention.user.toString();

    if (id !== actorId) {
        notifications.push({
        recipientId: id,
        type: NotificationTypes.MENTION_POST,
        });
    }
    }

  //
  // 2. Notify @interact users
  //
  let interactUsers = [];

  if (comment.hasInteractMention) {
    interactUsers = await getInteractUsers(comment.post);
  }

  interactUsers.forEach((id) => {
  if (
    id !== actorId &&
    !notifications.some(
      n => n.recipientId === id
    )
  ) {
    notifications.push({
      recipientId: id,
      type: NotificationTypes.INTERACT_POST,
    });
  }
});

  //
  // 3. Create notifications
  //
  await Promise.all(
    notifications.map((notification) =>
        handleNotificationEvent({
        type: notification.type,
        actorId,
        recipientId: notification.recipientId,
        postId,
        })
    )
    );
}