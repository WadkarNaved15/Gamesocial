import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { Loader2, ChevronRight, XCircle, AlertTriangle } from "lucide-react";
import PrerollAdPostCard from "../ads/PrerollAdPostCard";
import { useAds } from "../../context/AdContext";

// --- Static Constants ---
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const MAX_RETRIES = 5;
const MAX_RECONNECT = 8;

type AdWithStatusProps = {
  sessionId: string;
};

interface Ad {
  _id: string;
  brandName: string;
  brandLogo?: string | null;
  ctaText?: string;
  ctaLink?: string;
  asset: {
    type: "video";
    url: string;
    name?: string;
    optimizedUrl?: string;
    optimizedKey?: string;
    processingStatus?: "pending" | "processing" | "completed" | "failed";
  };
  mechanics?: {
    duration?: number;
  };
}

type SessionError = "failed" | "ended" | "stream_error" | null;

export default function AdWithStatus({ sessionId }: AdWithStatusProps) {
  const {
  ads,
  preloadAds,
  adFetchCompleted,
} = useAds();

const [currentAdIndex, setCurrentAdIndex] =
  useState(0);

const currentAd =
  ads[currentAdIndex];
  
  // --- State ---
  const [sessionStatus, setSessionStatus] = useState<string>("waiting");
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamUrlError, setStreamUrlError] = useState(false);
  const [sessionError, setSessionError] = useState<SessionError>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [adCountdown, setAdCountdown] = useState(20);
  const [startedInRunningState, setStartedInRunningState] =
  useState(false);

  // --- Refs ---
  const fetchRetryCount = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const adRequested = useRef(false);

  // --- Effects ---

  // 1. Initial Ad Fetch
  useEffect(() => {
    if (
  ads.length === 0 &&
  !adRequested.current
) {
  adRequested.current = true;
  preloadAds();
}
  }, [ads, preloadAds]);

  // 2. Countdown Timer
useEffect(() => {
  const interval = setInterval(() => {
    setAdCountdown((prev) => {
      if (prev <= 1) {
        clearInterval(interval);
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(interval);
}, []);

  // 3. Heartbeat & Abandonment
  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(() => {
      navigator.sendBeacon(`${BACKEND_URL}/api/sessions/${sessionId}/heartbeat`);
    }, 10_000);

    const handleUnload = () => {
      navigator.sendBeacon(
        `${BACKEND_URL}/api/sessions/${sessionId}/abandon/${import.meta.env.VITE_ABANDON_SECRET}`,
        new Blob([JSON.stringify({})], { type: "application/json" })
      );
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [sessionId]);

  // --- Callbacks ---

  const handleTerminalState = useCallback((state: "failed" | "ended") => {
    localStorage.removeItem("rigzer_queue_session");

    if (state === "failed") {
      setSessionError("failed");
      setErrorMessage("Your session failed to start. This is usually due to a server issue. Please try again.");
    } else {
      setSessionError("ended");
      setErrorMessage("Your session has ended.");
    }

    setSessionStatus(state);

    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchStreamUrl = useCallback(async () => {
    if (fetchRetryCount.current >= MAX_RETRIES) {
      setStreamUrlError(true);
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/stream-token`, { 
        credentials: "include" 
      });
      
      if (res.ok) {
        const data = await res.json();
        setStreamUrl(data.streamUrl);
        fetchRetryCount.current = 0;
      } else {
        throw new Error("Failed to fetch stream token");
      }
    } catch (err) {
      console.error("Failed to fetch stream URL:", err);
      fetchRetryCount.current += 1;
      if (fetchRetryCount.current >= MAX_RETRIES) {
        setStreamUrlError(true);
      } else {
        const backoff = Math.min(1000 * 2 ** fetchRetryCount.current, 10000);
        setTimeout(fetchStreamUrl, backoff);
      }
    }
  }, [sessionId]);

  // Centralized status handler for both SSE and Polling
  const handleSessionUpdate = useCallback(async (status: string, phase?: string) => {
    const effectiveStatus = (status === "running" || status === "ended" || status === "failed") 
      ? status 
      : phase ?? status;

    if (effectiveStatus === "failed" || effectiveStatus === "ended") {
      handleTerminalState(effectiveStatus);
      return;
    }

    setSessionStatus(effectiveStatus);

    if (
  effectiveStatus === "running" &&
  sessionStatus !== "launching"
) {
  setStartedInRunningState(true);
}

if (effectiveStatus === "running") {
  if (!streamUrl) {
    await fetchStreamUrl();
  }

  if (pollRef.current) {
    clearInterval(pollRef.current);
    pollRef.current = null;
  }
}
}, [
  sessionStatus,
  streamUrl,
  fetchStreamUrl,
  handleTerminalState,
]);


  const startFallbackPoll = useCallback(() => {
    if (pollRef.current) return;
    
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/status`, { 
          credentials: "include" 
        });
        if (!res.ok) return;
        
        const { status, phase } = await res.json();
        handleSessionUpdate(status, phase);
      } catch {
        // Silent catch — SSE is the primary channel
      }
    }, 6000);
  }, [sessionId, handleSessionUpdate]);

  // 4. SSE Connection Setup
  useEffect(() => {
    if (!sessionId) return;

    let es: EventSource;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let reconnectAttempts = 0;

    const connect = () => {
      es = new EventSource(`${BACKEND_URL}/api/sessions/${sessionId}/events`, { 
        withCredentials: true 
      });

      es.onmessage = async (e) => {
        reconnectAttempts = 0;
        const { status, phase } = JSON.parse(e.data);
        
        await handleSessionUpdate(status, phase);
        
        // Close ES on terminal states
        if (status === "failed" || status === "ended") {
          es.close();
        }
      };

      es.onerror = () => {
        es.close();
        reconnectAttempts += 1;
        if (reconnectAttempts > MAX_RECONNECT) {
          console.error("SSE permanently failed, relying on poll");
          startFallbackPoll();
          return;
        }
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 15000);
        console.warn(`SSE error — reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();
    startFallbackPoll();

    return () => {
      es?.close();
      clearTimeout(reconnectTimer);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [sessionId, startFallbackPoll, handleSessionUpdate]);

  // --- Event Handlers ---

  const cancelSession = async () => {
    if (!sessionId) return;
    if (!confirm("Are you sure you want to cancel this session? Your game session will be terminated.")) return;
    
    try {
      await axios.post(`${BACKEND_URL}/api/sessions/${sessionId}/cancel`, {}, { 
        withCredentials: true 
      });
      localStorage.removeItem("rigzer_queue_session");
      window.location.href = "/";
    } catch (err) {
      console.error("Cancel session error:", err);
      setSessionError("failed");
      setErrorMessage("Failed to cancel the session. Please refresh and try again.");
    }
  };

  const handleLaunch = () => {
    if (streamUrl) window.location.href = streamUrl;
  };

  const handleRetry = () => {
    localStorage.removeItem("rigzer_queue_session");
    window.location.href = "/";
  };

  // --- Renders ---

  if (sessionError === "failed" || sessionError === "stream_error") {
    return (
      <div className="fixed inset-0 bg-white dark:bg-black z-50 flex flex-col items-center justify-center space-y-6 p-8">
        <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center">
            <AlertTriangle className="text-red-500" size={28} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Session Failed</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{errorMessage}</p>
          <button
            onClick={handleRetry}
            className="mt-2 px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl text-sm font-semibold hover:opacity-90 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (sessionError === "ended") {
    return (
      <div className="fixed inset-0 bg-white dark:bg-black z-50 flex flex-col items-center justify-center space-y-6 p-8">
        <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
            <XCircle className="text-gray-400 dark:text-gray-500" size={28} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Session Ended</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{errorMessage}</p>
          <button
            onClick={handleRetry}
            className="mt-2 px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl text-sm font-semibold hover:opacity-90 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (
  ads.length === 0 && !adFetchCompleted) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-[#0a0a0a] z-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-gray-400 dark:text-gray-600" size={32} />
        <span className="text-gray-400 dark:text-gray-600 text-xs tracking-[0.3em] uppercase font-medium">
          Loading Advertisement
        </span>
      </div>
    );
  }

  const adData = currentAd?.data as Ad;
  const showLaunchButton =
  !!streamUrl &&
  (
    startedInRunningState ||
    adCountdown === 0
  );

  const displayAsset = adData?.asset
    ? {
        ...adData.asset,
        url: adData.asset.processingStatus === "completed" && adData.asset.optimizedUrl
            ? adData.asset.optimizedUrl
            : adData.asset.url,
        processingStatus: undefined,
      }
    : undefined;
    
  return (
    <div className="fixed inset-0 bg-white dark:bg-black z-50 flex flex-col font-sans overflow-hidden select-none">
      
      <div className="relative flex-grow bg-black">
        {adData && (
          <PrerollAdPostCard
            fullscreen
            brandName={adData.brandName}
            brandLogo={adData.brandLogo}
            ctaText={adData.ctaText}
            ctaLink={adData.ctaLink}
            asset={displayAsset}
            duration={adData.mechanics?.duration || 15}
            onEnded={() => {
    if (
      currentAdIndex <
      ads.length - 1
    ) {
      setCurrentAdIndex(
        prev => prev + 1
      );
    } else {
      setAdCountdown(0);
    }
  }}
          />
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-white dark:from-black to-transparent z-20">
        <div className="w-full flex items-end justify-end">
          <div className="flex flex-col items-end gap-3">
            {showLaunchButton ? (
              <>
                <button
                  onClick={handleLaunch}
                  disabled={!streamUrl}
                  className="group flex items-center space-x-3 bg-gray-800 dark:bg-gray-200 text-white dark:text-black px-8 py-3 rounded-xl text-sm font-bold transition-all shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {streamUrl ? (
                    <>
                      <span>LAUNCH SESSION</span>
                      <ChevronRight size={18} />
                    </>
                  ) : (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>CONNECTING...</span>
                    </>
                  )}
                </button>
                
                {streamUrlError && (
                  <button
                    onClick={() => {
                      setStreamUrlError(false);
                      fetchRetryCount.current = 0;
                      fetchStreamUrl();
                    }}
                    className="text-xs text-gray-500 underline"
                  >
                    Retry connection
                  </button>
                )}
              </>
            ) : (
              <div className="flex items-center space-x-3 bg-white/80 dark:bg-black/40 backdrop-blur-md px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500 text-[10px] font-bold tracking-widest uppercase shadow-sm">
                <div className="w-3 h-3 border-2 border-gray-300 dark:border-gray-700 border-t-gray-600 dark:border-t-gray-300 rounded-full animate-spin" />
                <span>
                  {sessionStatus === "running"
                    ? `Launch Available in ${adCountdown}s`
                    : "Preparing Session"}
                </span>
              </div>
            )}

            <button
              onClick={cancelSession}
              className="text-xs font-bold text-red-500 border border-red-500/40 px-5 py-2 rounded-lg hover:bg-red-500/10 transition"
            >
              Cancel Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}