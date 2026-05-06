import React, { useState, useEffect } from 'react';
import { Play, X } from 'lucide-react';

interface InstanceReadyModalProps {
  sessionId: string | null;
  countdown: number;  // seconds remaining (30 to 0)
  onLaunch: () => Promise<void>;
  onCancel: () => Promise<void>;
  isVisible: boolean;
}

/**
 * InstanceReadyModal Component
 * Countdown modal when instance becomes available
 * Matches the aesthetic of QueueNotification and InstanceStartingNotification
 */
export const InstanceReadyModal: React.FC<InstanceReadyModalProps> = ({
  sessionId,
  countdown,
  onLaunch,
  onCancel,
  isVisible,
}) => {
  const [isLaunching, setIsLaunching] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [displayCountdown, setDisplayCountdown] = useState(countdown);
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

  useEffect(() => {
    setDisplayCountdown(countdown);

    const interval = setInterval(() => {
      setDisplayCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onCancel();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown, onCancel]);

  const handleLaunch = async () => {
    setIsLaunching(true);
    try {
      await onLaunch();
    } catch (err) {
      console.error("Launch failed:", err);
      setIsLaunching(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await onCancel();
    } catch (err) {
      console.error("Cancel failed:", err);
      setIsCancelling(false);
    }
  };

  if (!isVisible || !sessionId) return null;

  const gradient = isDark
    ? "linear-gradient(to bottom right, #3D7A6E, #000000)"
    : "linear-gradient(to bottom right, #9ca3af, #374151)";

  const bodyBg = isDark ? "#000000" : "#f3f4f6";
  const borderColor = isDark
    ? "rgba(255,255,255,0.07)"
    : "rgba(0,0,0,0.1)";

  const getCountdownColor = () => {
    if (displayCountdown > 15) return '#10b981';
    if (displayCountdown > 5) return '#f59e0b';
    return '#ef4444';
  };

  const getCountdownOpacity = () => {
    if (displayCountdown > 15) return 'text-emerald-600 dark:text-emerald-400';
    if (displayCountdown > 5) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div
          style={{ background: bodyBg, border: `1px solid ${borderColor}` }}
          className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden my-auto"
        >

          {/* Header */}
          <div
            style={{ background: gradient }}
            className="text-white px-5 py-5 sm:py-6 text-center border-b"
            style={{ borderColor: borderColor }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
              Instance Ready
            </h2>
            <p className="text-xs sm:text-sm text-white/60 mt-1">Your Rigzer rig is live</p>
          </div>

          {/* Countdown Section */}
          <div className="px-5 py-6 sm:py-8 space-y-5">
            <div className="flex flex-col items-center gap-4">
              <p className="text-xs sm:text-sm text-white/60 font-medium">
                Launching in
              </p>

              {/* Circular Countdown */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
                {/* SVG Progress Circle */}
                <svg
                  className="absolute w-full h-full"
                  style={{ transform: "rotate(-90deg)" }}
                  viewBox="0 0 100 100"
                >
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-white/10 dark:text-white/15"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={getCountdownColor()}
                    strokeWidth="2.5"
                    strokeDasharray={`${(displayCountdown / 30) * (2 * Math.PI * 40)} ${2 * Math.PI * 40}`}
                    className="transition-all duration-1000"
                    strokeLinecap="round"
                  />
                </svg>

                {/* Center Number */}
                <div className="relative text-center">
                  <div className={`text-4xl sm:text-5xl font-bold tabular-nums ${getCountdownOpacity()}`}>
                    {displayCountdown.toString().padStart(2, '0')}
                  </div>
                  <div className="text-[10px] font-semibold text-white/50 mt-0.5 uppercase tracking-wider">
                    seconds
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            className="px-5 pb-5 flex gap-2"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            {/* Launch Button */}
            <button
              onClick={handleLaunch}
              disabled={isLaunching || displayCountdown === 0}
              className="
                flex-1
                bg-gradient-to-br
                from-gray-600 to-gray-800
                hover:from-gray-700 hover:to-gray-900
                
                dark:from-gray-700 dark:to-gray-900
                dark:hover:from-gray-800 dark:hover:to-black
                
                text-white
                py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl
                transition-all duration-300 transform
                hover:scale-105 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
                font-bold text-sm sm:text-base
                shadow-lg shadow-gray-600/30
                flex items-center justify-center gap-2
              "
            >
              <Play size={16} className="sm:w-5 sm:h-5" fill="currentColor" />
              <span>Launch</span>
            </button>

            {/* Cancel Button */}
            <button
              onClick={handleCancel}
              disabled={isCancelling || isLaunching}
              className="
                flex-1
                bg-gradient-to-br
                from-gray-500 to-gray-600
                hover:from-gray-600 hover:to-gray-700
                
                dark:from-gray-600 dark:to-gray-700
                dark:hover:from-gray-700 dark:hover:to-gray-800
                
                text-white
                py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl
                transition-all duration-300 transform
                hover:scale-105 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
                font-bold text-sm sm:text-base
                shadow-lg shadow-gray-500/20
                flex items-center justify-center gap-2
              "
            >
              <X size={16} className="sm:w-5 sm:h-5" />
              <span>Cancel</span>
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default InstanceReadyModal;