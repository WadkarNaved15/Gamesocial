import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useAds } from './AdContext';

interface FeedbackState {
  open: boolean;
  sessionId: string | null;
  gameId: string | null;
  gameName: string | null;
}
interface FeedbackStorage {
  sessionId: string;
  gameId: string;
  createdAt: number;
}
export interface QueueState {
  // Session
  sessionId: string | null;

  // Status
  status: 'waiting' | 'allocation_ready' | 'starting' | 'running' | 'ended' | 'failed';
  phase: 'countdown' | 'downloading' | 'launching' | null;

  // Queue Info
  queuePosition: number | null;
  totalQueued: number | null;
  estimatedWaitMinutes: number | null;

  // Ready Modal (ONLY for queued users)
  countdownStartsAt: Date | null;
  countdownSecondsRemaining: number | null;
  isDirectPlay: boolean;

  // Error
  errorMessage: string | null;
}

interface QueueContextType {
  queue: QueueState;
  feedback: FeedbackState;
  setFeedback: React.Dispatch<React.SetStateAction<FeedbackState>>;
  startSession: (gamePostId: string) => Promise<string | null>;
  cancelSession: () => Promise<void>;
  launchSession: () => Promise<void>;
  dismissError: () => void;
  clearSession: () => void;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const STORAGE_KEY = 'rigzer_queue_session';
const FEEDBACK_STORAGE_KEY = "rigzer_feedback_session";

export const QueueProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<QueueState>({
    sessionId: null,
    status: 'ended',
    phase: null,
    queuePosition: null,
    totalQueued: null,
    estimatedWaitMinutes: null,
    countdownStartsAt: null,
    countdownSecondsRemaining: null,
    isDirectPlay: false,
    errorMessage: null,
  });
  const [feedback, setFeedback] = useState<FeedbackState>({
    open: false,
    sessionId: null,
    gameId: null,
    gameName: null,
  });
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { preloadAds, clearAds } = useAds();
  const adPreloadedRef = useRef(false);


  // ✅ Load session from localStorage on mount
  useEffect(() => {
    console.log("[Queue] Loading session from localStorage");
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);

        // ✅ Restore queue state
        setQueue((prev) => ({
          ...prev,
          sessionId: data.sessionId,
          status: data.status,
          queuePosition: data.queuePosition,
          totalQueued: data.totalQueued,
          estimatedWaitMinutes: data.estimatedWaitMinutes,
        }));

        // ✅ If session exists, reconnect to SSE
        if (data.sessionId && ['waiting', 'allocation_ready', 'starting'].includes(data.status)) {
          setTimeout(() => setupSSE(data.sessionId), 500);
        }
      } catch (err) {
        console.error('[Queue] Failed to restore session:', err);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);
  // Check if feedback is eligible
  const checkFeedbackEligibility = async (sessionId: string) => {
    console.log(`[Queue] Checking feedback eligibility for session ${sessionId}`);
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/feedback/check/${sessionId}`,
        {
          credentials: "include",
        }
      );
      if (!res.ok) {
        localStorage.removeItem(FEEDBACK_STORAGE_KEY);
        clearSession();
        return;
      }
      const data = await res.json();
      console.log("Response of the sessions:", data);
      if (data.eligible) {
        setFeedback({
          open: true,
          sessionId: data.sessionId,
          gameId: data.gameId,
          gameName: data.gameName,
        });
        // DON'T clear session yet.
        return;
      }
      localStorage.removeItem(FEEDBACK_STORAGE_KEY);
      clearSession();
    } catch (err) {
      localStorage.removeItem(FEEDBACK_STORAGE_KEY);
      console.error(err);
      clearSession();
    }
  };

  // Check feedback token on mount
  useEffect(() => {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    console.log(`[Queue] Checking feedback token ${raw}`);
    if (!raw) return;
    try {
      const saved: FeedbackStorage = JSON.parse(raw);
      // Ignore stale sessions (optional)
      const THIRTY_MINUTES = 30 * 60 * 1000;
      if (Date.now() - saved.createdAt > THIRTY_MINUTES) {
        localStorage.removeItem(FEEDBACK_STORAGE_KEY);
        return;
      }
      checkFeedbackEligibility(saved.sessionId);
    } catch {
      localStorage.removeItem(FEEDBACK_STORAGE_KEY);
    }
  }, []);

  // ✅ Save session to localStorage whenever it changes
  useEffect(() => {
    if (queue.sessionId && queue.status !== 'ended' && queue.status !== 'failed') {
      const toSave = {
        sessionId: queue.sessionId,
        status: queue.status,
        queuePosition: queue.queuePosition,
        totalQueued: queue.totalQueued,
        estimatedWaitMinutes: queue.estimatedWaitMinutes,
        isDirectPlay: queue.isDirectPlay,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } else if (queue.status === 'ended' || queue.status === 'failed') {
      console.log("Removing queue items")
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [queue]);

  // 🧹 Clear Session
  const clearSession = useCallback(() => {

    if (eventSource) eventSource.close();
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    setQueue({
      sessionId: null,
      status: "ended",
      phase: null,
      queuePosition: null,
      totalQueued: null,
      estimatedWaitMinutes: null,
      countdownStartsAt: null,
      countdownSecondsRemaining: null,
      isDirectPlay: false,
      errorMessage: null,
    });

    localStorage.removeItem(STORAGE_KEY);
  }, [eventSource]);

  // 🔌 Setup SSE Connection
  const setupSSE = useCallback((sessionId: string) => {

    if (eventSource) eventSource.close();

    const es = new EventSource(
      `${BACKEND_URL}/api/sessions/${sessionId}/events`,
      { withCredentials: true }
    );

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      // 🔴 Session finished → clear everything
      if (data.status === "failed") {
        adPreloadedRef.current = false;
        clearAds();
        clearSession();
        return;
      }

      if (data.status === "ended") {
        console.log("Session ended")
        adPreloadedRef.current = false;
        clearAds();
        return;
      }

      setQueue((prev) => {
        const newState = { ...prev };

        // Update status + phase
        if (data.status) newState.status = data.status;
        if (data.phase !== undefined) newState.phase = data.phase;

        // Update queue info
        if (data.queuePosition !== undefined)
          newState.queuePosition = data.queuePosition;

        if (data.totalQueued !== undefined)
          newState.totalQueued = data.totalQueued;

        if (data.estimatedWaitMinutes !== undefined)
          newState.estimatedWaitMinutes = data.estimatedWaitMinutes;

        // 🟡 QUEUED USER → show countdown modal
        // 🟡 QUEUED USER → show countdown modal
        if (data.status === "allocation_ready") {

          newState.isDirectPlay = false;

          // ONLY initialize the countdown once
          if (!prev.countdownStartsAt) {

            const seconds = data.countdownSeconds || 30;

            newState.countdownStartsAt = data.countdownStartsAt
              ? new Date(data.countdownStartsAt)
              : new Date();

            newState.countdownSecondsRemaining = seconds;

            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }

            countdownIntervalRef.current = setInterval(() => {
              setQueue(prev => {
                if (prev.countdownSecondsRemaining == null) {
                  return prev;
                }

                const next = prev.countdownSecondsRemaining - 1;

                if (next <= 0) {
                  if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current);
                    countdownIntervalRef.current = null;
                  }

                  cancelSession();

                  return {
                    ...prev,
                    countdownSecondsRemaining: 0,
                  };
                }

                return {
                  ...prev,
                  countdownSecondsRemaining: next,
                };
              });
            }, 1000);
          }
        }

        // 🟢 DIRECT USER → skip countdown, show ads
        if (data.status === "starting") {

          if (!adPreloadedRef.current) {
            adPreloadedRef.current = true;
            preloadAds();
          }

          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }

          newState.isDirectPlay = true;
          newState.countdownStartsAt = null;
          newState.countdownSecondsRemaining = null;
          newState.phase = data.phase || "downloading";
        }


        return newState;
      });
    };

    es.onerror = () => {
      console.warn("[Queue SSE] Connection lost, retrying...");
      setTimeout(() => setupSSE(sessionId), 3000);
    };

    setEventSource(es);
  }, [eventSource, clearSession]);

  // 🎮 Start Session
  const startSession = useCallback(
    async (gamePostId: string): Promise<string | null> => {
      try {
        // ✅ Prevent starting if session already exists
        if (queue.sessionId) {
          console.warn('[Queue] Session already exists, cannot start new one');
          return null;
        }

        setQueue((prev) => ({
          ...prev,
          status: 'waiting',
          isDirectPlay: false,
          errorMessage: null,
        }));
        const res = await fetch(`${BACKEND_URL}/api/sessions/start`, {
          method: 'POST',
          credentials: 'include',


          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gamePostId }),
        });

        const data = await res.json();
  
        if (res.ok || res.status === 202) {
          const sessionId = data.sessionId;
          const feedbackStorage: FeedbackStorage = {
            sessionId,
            gameId: gamePostId,
            createdAt: Date.now(),
          };

          localStorage.setItem(
            FEEDBACK_STORAGE_KEY,
            JSON.stringify(feedbackStorage)
          );
          // ✅ Update queue state with all data from 202 response
          setQueue((prev) => ({
            ...prev,
            sessionId,
            status: 'waiting',
            queuePosition: data.queuePosition || null,
            totalQueued: data.totalQueued || null,
            estimatedWaitMinutes: data.estimatedWaitMinutes || null,
          }));

          // Start SSE listener
          setupSSE(sessionId);
          return sessionId;
        } else {
          console.error('[Queue] Start failed:', data);
          setQueue((prev) => ({
            ...prev,
            errorMessage: data.error || 'Failed to start session',
            status: 'failed',
          }));
          return null;
        }
      } catch (err: any) {
        console.error('[Queue] Network error:', err);
        setQueue((prev) => ({
          ...prev,
          errorMessage: err.message || 'Network error',
          status: 'failed',
        }));
        return null;
      }
    },
    [queue.sessionId, setupSSE]
  );

  // ❌ Cancel Session
  const cancelSession = useCallback(async () => {
    if (!queue.sessionId) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/sessions/${queue.sessionId}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok) {
        clearSession();
      } else {
        console.error('[Queue] Cancel failed');
      }
    } catch (err) {
      console.error('[Queue] Cancel error:', err);
    }
  }, [queue.sessionId]);

  // 🚀 Launch Session (from countdown modal - ONLY for queued users)
  const launchSession = useCallback(async () => {
    if (!queue.sessionId) return;

    try {

      const res = await fetch(`${BACKEND_URL}/api/internal/session/launch`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: queue.sessionId }),
      });

      if (res.ok) {
        setQueue((prev) => ({
          ...prev,
          status: 'starting',
        }));
      } else {
        const data = await res.json();
        console.error('[Queue] Launch failed:', data);
        setQueue((prev) => ({
          ...prev,
          errorMessage: data.error || 'Failed to launch',
        }));
      }
    } catch (err) {
      console.error('[Queue] Launch error:', err);
    }
  }, [queue.sessionId]);



  // 📌 Dismiss Error
  const dismissError = useCallback(() => {
    setQueue((prev) => ({
      ...prev,
      errorMessage: null,
    }));
  }, []);

  // ❤️ Heartbeat every 10s
  useEffect(() => {
    if (!queue.sessionId) return;

    const interval = setInterval(() => {
      navigator.sendBeacon(
        `${BACKEND_URL}/api/sessions/${queue.sessionId}/heartbeat`
      );
    }, 10_000);

    return () => clearInterval(interval);
  }, [queue.sessionId]);

  // 🏃 Abandon Beacon on unload
  useEffect(() => {
    if (!queue.sessionId) return;

    const handleUnload = () => {
      navigator.sendBeacon(
        `${BACKEND_URL}/api/sessions/${queue.sessionId}/abandon/${import.meta.env.VITE_ABANDON_SECRET}`,
        new Blob([JSON.stringify({})], { type: 'application/json' })
      );
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [queue.sessionId]);

  const value: QueueContextType = {
    queue,
    feedback,
    setFeedback,
    startSession,
    cancelSession,
    launchSession,
    dismissError,
    clearSession,
  };

  return (
    <QueueContext.Provider value={value}>
      {children}
    </QueueContext.Provider>
  );
};

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueue must be used within QueueProvider');
  }
  return context;
};