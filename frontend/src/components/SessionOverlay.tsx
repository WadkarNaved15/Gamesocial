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

  if (!queue.sessionId) return null;

  const isQueued = queue.queuePosition !== null;

  // USER IS IN QUEUE
  const showQueueNotification =
    queue.status === "waiting" && isQueued;

  // INSTANCE ASSIGNED BUT STARTING
const showInstanceStarting =
  (
    // direct scaling users
    queue.status === "waiting" &&
    !isQueued
  ) ||
  (
    // after launch click
    queue.status === "starting"
  );


  // QUEUED USER GOT INSTANCE
  const showInstanceReady =
    queue.status === "allocation_ready";

  // DIRECT USER OR AFTER LAUNCH
const showAds =
  queue.sessionId &&
  (
    queue.phase === "launching" ||
    queue.status === "running"
  );

  console.log("SESSION OVERLAY", {
  sessionId: queue.sessionId,
  status: queue.status,
  phase: queue.phase,
});
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
          countdown={queue.countdownSecondsRemaining || 30}
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