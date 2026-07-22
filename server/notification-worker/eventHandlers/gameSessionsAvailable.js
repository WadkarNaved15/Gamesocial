import { handleNotificationEvent } from "../handleNotificationEvent.js";
import { NotificationTypes } from "../types.js";

export async function handleGameSessionsAvailable(event) {
  const {
    actorId,
    recipientId,
    postId,
  } = event;

  return handleNotificationEvent({
    type: NotificationTypes.GAME_SESSIONS_AVAILABLE,
    actorId,
    recipientId,
    postId,
  });
}