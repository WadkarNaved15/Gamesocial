import React, { useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";

interface InstanceStartingNotificationProps {
  sessionId: string | null;
  isVisible: boolean;
  isMinimized: boolean;
  onMinimize: (val: boolean) => void;
  onCancel: () => Promise<void>;
  status: "waiting" | "allocation_ready" | "starting" | "running" | "ending" | "ended" | "failed";
  phase: "countdown" | "downloading" | "launching" | null;
}

export const InstanceStartingNotification: React.FC<
  InstanceStartingNotificationProps
> = ({ sessionId, isVisible, isMinimized, onMinimize, onCancel ,status,phase}) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () =>
      setIsDark(document.documentElement.classList.contains("dark"));

    check();

    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  if (!isVisible || !sessionId) return null;

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await onCancel();
    } catch (err) {
      console.error("Cancel error:", err);
      setIsCancelling(false);
    }
  };

  const gradient = isDark
    ? "linear-gradient(to bottom right, #3D7A6E, #000000)"
    : "linear-gradient(to bottom right, #9ca3af, #374151)";

  const bodyBg = isDark ? "#000000" : "#f3f4f6";
  const borderColor = isDark
    ? "rgba(255,255,255,0.07)"
    : "rgba(0,0,0,0.1)";

  const isTerminal = status === "failed" || status === "ended";

  const headerTitle = isTerminal
    ? status === "failed"
      ? "Session Failed"
      : "Session Ended"
    : "Preparing Your Rig";

    const headerSub = isTerminal
      ? status === "failed"
        ? "We couldn't prepare your session"
        : "Your session has ended"
      : phase === "downloading"
        ? "Downloading game files"
        : phase === "launching"
        ? "Launching your game"
        : "Preparing cloud environment";

      if (isTerminal) {
      return (
        <div className="fixed bottom-6 right-24 z-40 w-80 max-w-[calc(100vw-32px)]">
          <div className="rounded-2xl shadow-2xl overflow-hidden bg-black border border-white/10">
            <div className="px-4 py-3 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm leading-tight">
                  {status === "failed" ? "Session Failed" : "Session Ended"}
                </h3>
                <p className="text-xs text-white/60">{headerSub}</p>
              </div>
            </div>

            <div className="px-4 py-3">
              <p className="text-sm text-gray-300">
                {status === "failed"
                  ? "We could not prepare the session. Please try again."
                  : "The session has finished."}
              </p>
            </div>
          </div>
        </div>
      );
    }

  if (isMinimized) {
    return (
      <div
        onClick={() => onMinimize(false)}
        className="fixed bottom-6 right-24 z-40 cursor-pointer group"
      >
        <div
          style={{ background: gradient }}
          className="text-white px-3 py-2.5 rounded-2xl shadow-lg flex items-center gap-2"
        >
          <Loader2 className="animate-spin" size={14} />
          <span className="font-semibold text-xs">{headerTitle}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-24 z-40 w-80 max-w-[calc(100vw-32px)]">
      <div
        style={{ background: bodyBg, border: `1px solid ${borderColor}` }}
        className="rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div
          style={{ background: gradient }}
          className="text-white px-4 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <Loader2 size={14} className="animate-spin" />

            <div>
              <h3 className="font-bold text-sm leading-tight">
                {headerTitle}
              </h3>

              <p className="text-xs text-white/60">
                Getting everything ready
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="
              px-3 py-1
              rounded-lg
              text-xs font-medium
              transition-all duration-200
              disabled:opacity-50
              disabled:cursor-not-allowed
              bg-black/20 hover:bg-black/30
              text-gray-200
              border border-white/10
            "
            aria-label="Cancel"
            title="Cancel"
          >
            {isCancelling ? "Cancelling..." : "Cancel"}
          </button>
            <button
              onClick={() => onMinimize(true)}
              className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 hover:bg-white/15"
              aria-label="Minimize"
              title="Minimize"
            >
              <ChevronDown size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-2.5">
          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            className="flex items-center gap-2.5 p-2.5 rounded-lg"
          >
            <Loader2 size={14} className="animate-spin text-white/70" />

            <div>
              <p className="text-[9px] font-semibold text-white/50 uppercase tracking-widest">
                Status
              </p>

              <p className="text-sm font-semibold text-white">
                {headerSub}
              </p>
            </div>
          </div>

          <p className="text-xs text-white/40 text-center pt-1">
            This may take a few moments
          </p>
        </div>
      </div>
    </div>
  );
};

export default InstanceStartingNotification;