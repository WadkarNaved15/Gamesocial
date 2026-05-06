import React, { useEffect, useState } from 'react';
import { ChevronDown, Clock, Users } from 'lucide-react';

interface QueueNotificationProps {
  sessionId: string | null;
  queuePosition: number | null;
  totalQueued: number | null;
  estimatedWaitMinutes: number | null;
  isVisible: boolean;
  isMinimized: boolean;              
  onMinimize: (val: boolean) => void; 
  onCancel: () => Promise<void>;
}

export const QueueNotification: React.FC<QueueNotificationProps> = ({
  sessionId,
  queuePosition,
  totalQueued,
  estimatedWaitMinutes,
  isVisible,
  isMinimized,
  onMinimize,
  onCancel,
}) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  if (!isVisible || !sessionId) return null;

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await onCancel();
    } catch (err) {
      console.error('Cancel error:', err);
      setIsCancelling(false);
    }
  };

  const gradient = isDark
    ? 'linear-gradient(to bottom right, #3D7A6E, #000000)'
    : 'linear-gradient(to bottom right, #9ca3af, #374151)';

  const bodyBg = isDark ? '#000000' : '#f3f4f6';
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.1)';
  const textSecondary = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)';

  // ✅ MINIMIZED — compact badge
  if (isMinimized) {
    return (
      <div
        onClick={() => onMinimize(false)}
        className="fixed bottom-6 right-24 z-40 cursor-pointer group"
      >
        <div
          style={{ background: gradient }}
          className="text-white px-3 py-2.5 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center gap-2"
        >
          <Users size={14} />
          <span className="font-semibold text-xs">Queue #{queuePosition}</span>
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </div>
        </div>
      </div>
    );
  }

  // ✅ EXPANDED — compact card with integrated header controls
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
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white/30" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">In Queue</h3>
              <p className="text-xs text-white/60">Position #{queuePosition}</p>
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
              aria-label="Cancel Queue"
              title="Leave Queue"
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

          {/* Queue position and total */}
          <div
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            className="flex items-center justify-between p-2.5 rounded-lg"
          >
            <div>
              <p className="text-[9px] font-semibold text-white/50 uppercase tracking-widest mb-0.5">
                Position
              </p>
              <p className="text-2xl font-bold text-white leading-none">
                #{queuePosition}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-semibold text-white/50 uppercase tracking-widest mb-0.5">
                Total
              </p>
              <div className="flex items-center justify-end gap-1">
                <Users size={12} className="text-white/40" />
                <p className="text-lg font-bold text-white leading-none">
                  {totalQueued}
                </p>
              </div>
            </div>
          </div>

          {/* Estimated wait */}
          {estimatedWaitMinutes !== null && (
            <div
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              className="flex items-center gap-2.5 p-2.5 rounded-lg"
            >
              <Clock size={14} className="text-white/70 flex-shrink-0" />
              <div>
                <p className="text-[9px] font-semibold text-white/50 uppercase tracking-widest mb-0.5">
                  Est. Wait
                </p>
                <p className="text-sm font-semibold text-white">
                  {estimatedWaitMinutes < 1
                    ? '< 1 min'
                    : `${estimatedWaitMinutes} min`}
                </p>
              </div>
            </div>
          )}

          <p className="text-xs text-white/40 text-center pt-1">
            You can browse while waiting
          </p>
        </div>
      </div>
    </div>
  );
};

export default QueueNotification;