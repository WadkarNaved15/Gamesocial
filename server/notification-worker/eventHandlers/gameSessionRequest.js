import { handleNotificationEvent } from "../handleNotificationEvent.js";
import { NotificationTypes } from "../types.js";

export async function handleGameSessionRequest(event) {
  const {
    actorId,
    recipientId,
    postId,
  } = event;

  return handleNotificationEvent({
    type: NotificationTypes.GAME_SESSION_REQUEST,
    actorId,
    recipientId,
    postId,
  });
}