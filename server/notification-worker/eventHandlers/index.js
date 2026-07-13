import { handleCommentCreated } from "./commentCreated.js";
import { handlePostCreated } from "./postCreated.js";
import { handleNotificationEvent } from "../handleNotificationEvent.js";
import { NotificationTypes } from "../types.js";

export async function dispatchNotificationEvent(event) {
  switch (event.type) {
    case NotificationTypes.COMMENT_CREATED:
      return handleCommentCreated(event);

    case NotificationTypes.POST_CREATED:
      return handlePostCreated(event);

    default:
      return handleNotificationEvent(event);
  }
}