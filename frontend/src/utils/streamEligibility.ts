export type StreamEligibility = {
  checked: boolean;
  allowed: boolean;
  reasons: string[];
  speedMbps: number | null;
  testMs: number | null;
  retryable: boolean; // only network-related failures should keep retrying
  lastCheckedAt: number | null;
};

const STORAGE_KEY = "rigzer:stream-eligibility:v2";
const ALLOWED_CACHE_MS = 10 * 60 * 1000; // 10 minutes
const BLOCKED_NETWORK_CACHE_MS = 15 * 1000; // short cache for temporary network issues
const SPEED_TEST_BYTES = 512 * 1024; // 512 KB, faster check
const MIN_SPEED_MBPS = 8;
const MAX_TEST_MS = 2500;

const RETRY_WHEN_BLOCKED_MS = 15 * 1000;
const RETRY_WHEN_ALLOWED_MS = 5 * 60 * 1000;

let inFlight: Promise<StreamEligibility> | null = null;
let watcherStarted = false;
let retryTimer: number | null = null;

type NavWithHints = Navigator & {
  userAgentData?: { mobile?: boolean };
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
    addEventListener?: (type: "change", listener: () => void) => void;
    removeEventListener?: (type: "change", listener: () => void) => void;
  };
};

const getBackendUrl = () =>
  import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const notifyListeners = (() => {
  const listeners = new Set<(value: StreamEligibility) => void>();

  return {
    add: (cb: (value: StreamEligibility) => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    emit: (value: StreamEligibility) => {
      listeners.forEach((cb) => cb(value));
    },
  };
})();

const readCache = (): StreamEligibility | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StreamEligibility & { checkedAt: number };

    if (!parsed.checkedAt) return null;

    const age = Date.now() - parsed.checkedAt;
    const maxAge = parsed.allowed ? ALLOWED_CACHE_MS : BLOCKED_NETWORK_CACHE_MS;

    if (age > maxAge) return null;

    return {
      checked: parsed.checked,
      allowed: parsed.allowed,
      reasons: parsed.reasons || [],
      speedMbps: parsed.speedMbps ?? null,
      testMs: parsed.testMs ?? null,
      retryable: Boolean(parsed.retryable),
      lastCheckedAt: parsed.lastCheckedAt ?? parsed.checkedAt ?? null,
    };
  } catch {
    return null;
  }
};

const saveCache = (value: StreamEligibility) => {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...value,
        checkedAt: Date.now(),
      })
    );
  } catch {}
};

const getDeviceEligibility = () => {
  const reasons: string[] = [];
  const nav = navigator as NavWithHints;

  const mobileHint =
    nav.userAgentData?.mobile ??
    /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);

  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const touchPoints = navigator.maxTouchPoints ?? 0;
  const connection = nav.connection;

  if (mobileHint) reasons.push("This looks like a mobile device.");
  if (!finePointer || touchPoints > 1) {
    reasons.push("Use a laptop or desktop with a mouse or trackpad.");
  }

  if (connection?.saveData) {
    reasons.push("Data-saver mode is on.");
  }

  if (
    connection?.effectiveType &&
    ["slow-2g", "2g", "3g"].includes(connection.effectiveType)
  ) {
    reasons.push(`Connection type is too weak (${connection.effectiveType}).`);
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  };
};

const runBackendSpeedTest = async () => {
  const backendUrl = getBackendUrl();
  const started = performance.now();

  const res = await fetch(
    `${backendUrl}/stream-speed-test?bytes=${SPEED_TEST_BYTES}&ts=${Date.now()}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(`Speed test failed: ${res.status}`);
  }

  const buf = await res.arrayBuffer();
  const elapsedMs = performance.now() - started;
  const mbps = ((buf.byteLength * 8) / (elapsedMs / 1000)) / 1_000_000;

  return { mbps, elapsedMs };
};

const evaluateEligibility = async (): Promise<StreamEligibility> => {
  const device = getDeviceEligibility();

  // Hard block mobile-like devices; do not keep retrying these.
  if (!device.allowed) {
    const blocked: StreamEligibility = {
      checked: true,
      allowed: false,
      reasons: device.reasons,
      speedMbps: null,
      testMs: null,
      retryable: false,
      lastCheckedAt: Date.now(),
    };

    saveCache(blocked);
    return blocked;
  }

  const reasons = [...device.reasons];

  try {
    const speed = await runBackendSpeedTest();

    if (speed.mbps < MIN_SPEED_MBPS) {
      reasons.push(`Download speed is too low (${speed.mbps.toFixed(1)} Mbps).`);
    }

    if (speed.elapsedMs > MAX_TEST_MS) {
      reasons.push(`Connection test took too long (${Math.round(speed.elapsedMs)} ms).`);
    }

    const result: StreamEligibility = {
      checked: true,
      allowed: reasons.length === 0,
      reasons,
      speedMbps: speed.mbps,
      testMs: speed.elapsedMs,
      retryable: reasons.some((r) =>
        r.includes("speed") || r.includes("Connection") || r.includes("Could not")
      ),
      lastCheckedAt: Date.now(),
    };

    saveCache(result);
    return result;
  } catch (err) {
    console.error("Speed test failed:", err);

    const result: StreamEligibility = {
      checked: true,
      allowed: false,
      reasons: ["Could not verify your internet right now."],
      speedMbps: null,
      testMs: null,
      retryable: true,
      lastCheckedAt: Date.now(),
    };

    saveCache(result);
    return result;
  }
};

const clearTimer = () => {
  if (retryTimer) {
    window.clearTimeout(retryTimer);
    retryTimer = null;
  }
};

const scheduleRetry = (delay: number, onChange?: (value: StreamEligibility) => void) => {
  clearTimer();

  retryTimer = window.setTimeout(async () => {
    if (document.visibilityState !== "visible") {
      scheduleRetry(RETRY_WHEN_BLOCKED_MS, onChange);
      return;
    }

    if (!navigator.onLine) {
      scheduleRetry(RETRY_WHEN_BLOCKED_MS, onChange);
      return;
    }

    const result = await evaluateEligibility();
    notifyListeners.emit(result);
    onChange?.(result);

    if (!result.allowed && result.retryable) {
      scheduleRetry(RETRY_WHEN_BLOCKED_MS, onChange);
    } else if (result.allowed) {
      scheduleRetry(RETRY_WHEN_ALLOWED_MS, onChange);
    }
  }, delay);
};

export const getStreamEligibility = async (): Promise<StreamEligibility> => {
  const cached = readCache();
  if (cached) return cached;

  if (inFlight) return inFlight;

  inFlight = (async () => {
    const result = await evaluateEligibility();
    return result;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
};

export const watchStreamEligibility = (onChange: (value: StreamEligibility) => void) => {
  let stopped = false;

  const handleResult = (value: StreamEligibility) => {
    if (!stopped) onChange(value);
  };

  const run = async () => {
    const cached = readCache();
    if (cached) {
      handleResult(cached);
    } else {
      const result = await getStreamEligibility();
      handleResult(result);
    }

    const current = readCache();
    if (current?.allowed) {
      scheduleRetry(RETRY_WHEN_ALLOWED_MS, handleResult);
    } else if (current?.retryable) {
      scheduleRetry(RETRY_WHEN_BLOCKED_MS, handleResult);
    }
  };

  const onOnline = () => run();
  const onVisible = () => {
    if (document.visibilityState === "visible") run();
  };

  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisible);

  const nav = navigator as NavWithHints;
  nav.connection?.addEventListener?.("change", run);

  run();

  watcherStarted = true;

  return () => {
    stopped = true;
    clearTimer();
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisible);
    nav.connection?.removeEventListener?.("change", run);
    watcherStarted = false;
  };
};

export const ensureStreamEligibilityWatcher = (
  onChange: (value: StreamEligibility) => void
) => {
  if (watcherStarted) {
    return () => {};
  }
  return watchStreamEligibility(onChange);
};

export const clearStreamEligibility = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
};