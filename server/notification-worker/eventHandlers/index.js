import { handleCommentCreated } from "./commentCreated.js";
import { handlePostCreated } from "./postCreated.js";
import { handleNotificationEvent } from "../handleNotificationEvent.js";
import { NotificationTypes } from "../types.js";
import { handleGameSessionRequest } from "./gameSessionRequest.js";
import { handleGameSessionsAvailable } from "./gameSessionsAvailable.js";

export async function dispatchNotificationEvent(event) {
  switch (event.type) {
    case NotificationTypes.COMMENT_CREATED:
      return handleCommentCreated(event);

    case NotificationTypes.POST_CREATED:
      return handlePostCreated(event);
    
    case NotificationTypes.GAME_SESSION_REQUEST:
      return handleGameSessionRequest(event);

    case NotificationTypes.GAME_SESSIONS_AVAILABLE:
      return handleGameSessionsAvailable(event);  

    default:
      return handleNotificationEvent(event);
  }
}