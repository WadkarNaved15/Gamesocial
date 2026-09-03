import { createPortal } from "react-dom";
import { useState } from "react";
import { useQueue } from "../context/QueueContext";
import QueueNotification from "./QueueNotification";
import InstanceReadyModal from "./InstanceReadyModal";
import AdWithStatus from "../components/Home/PlayGame";
import InstanceStartingNotification from "./InstanceStartingNotification";

export default function SessionOverlay() {
  const { queue, cancelSession, launchSession } = useQueue();
  const [isQueueMinimized, setIsQueueMinimized] = useState(false);

  // Nothing to display once the backend says the session is gone.
  if (!queue.sessionId) return null;

  const isQueued = queue.queuePosition !== null;

  // USER IS IN QUEUE
  const showQueueNotification =
    queue.status === "waiting" && isQueued;

  // INSTANCE ASSIGNED BUT STARTING
  const showInstanceStarting =
    (
      // Direct/scaling users
      queue.status === "waiting" &&
      !isQueued
    ) ||
    (
      // After launch click
      queue.status === "starting"
    );

  // QUEUED USER GOT INSTANCE
  // Only show the ready modal while the backend state
  // is still allocation_ready.
  const showInstanceReady =
    queue.status === "allocation_ready" &&
    queue.countdownSecondsRemaining !== null &&
    queue.countdownSecondsRemaining > 0;

  // DIRECT USER OR AFTER LAUNCH
  const showAds =
    Boolean(queue.sessionId) &&
    (
      queue.phase === "launching" ||
      queue.status === "running"
    );

  return createPortal(
    <>
      {showQueueNotification && (
        <QueueNotification
          sessionId={queue.sessionId}
          queuePosition={queue.queuePosition}
          totalQueued={queue.totalQueued}
          estimatedWaitMinutes={queue.estimatedWaitMinutes}
          isVisible={true}
          isMinimized={isQueueMinimized}
          onMinimize={setIsQueueMinimized}
          onCancel={cancelSession}
        />
      )}

      {showInstanceStarting && (
        <InstanceStartingNotification
          sessionId={queue.sessionId}
          isVisible={true}
          isMinimized={isQueueMinimized}
          onMinimize={setIsQueueMinimized}
          onCancel={cancelSession}
          status={queue.status}
          phase={queue.phase}
        />
      )}

      {showInstanceReady && (
        <InstanceReadyModal
          sessionId={queue.sessionId}
          countdown={queue.countdownSecondsRemaining ?? 0}
          onLaunch={launchSession}
          onCancel={cancelSession}
          isVisible={true}
        />
      )}

      {showAds && (
        <AdWithStatus sessionId={queue.sessionId} />
      )}
    </>,
    document.body
  );
}

