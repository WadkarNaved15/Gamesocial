export type StreamEligibility = {
  checked: boolean;
  allowed: boolean;
  reasons: string[];
  speedMbps: number | null;
  testMs: number | null;
};

const SPEED_TEST_BYTES = 5 * 1024 * 1024;
const MIN_SPEED_MBPS = 2;
const MAX_TEST_MS = 100000;

type NavWithHints = Navigator & {
  userAgentData?: { mobile?: boolean };
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
};

const getBackendUrl = () =>
  import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const getDeviceReasons = () => {
  const reasons: string[] = [];
  const nav = navigator as NavWithHints;

  const mobileHint =
    nav.userAgentData?.mobile ??
    /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);

  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const touchPoints = navigator.maxTouchPoints ?? 0;
  const connection = nav.connection;

  if (mobileHint) {
    reasons.push("Mobile support is coming soon. Please use a laptop or desktop.");
  }

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

  return reasons;
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

export const getStreamEligibility = async (): Promise<StreamEligibility> => {
  const reasons = getDeviceReasons();

  // If it already looks like mobile, skip the speed test.
  const mobileBlocked = reasons.some((r) =>
    r.includes("Mobile support is coming soon")
  );

  if (!mobileBlocked) {
    try {
      const speed = await runBackendSpeedTest();

      if (speed.mbps < MIN_SPEED_MBPS) {
        reasons.push(`Download speed is too low (${speed.mbps.toFixed(1)} Mbps).`);
      }

      if (speed.elapsedMs > MAX_TEST_MS) {
        reasons.push(`Connection test took too long (${Math.round(speed.elapsedMs)} ms).`);
      }

      return {
        checked: true,
        allowed: reasons.length === 0,
        reasons,
        speedMbps: speed.mbps,
        testMs: speed.elapsedMs,
      };
    } catch {
      return {
        checked: true,
        allowed: false,
        reasons: ["Could not verify your internet right now."],
        speedMbps: null,
        testMs: null,
      };
    }
  }

  return {
    checked: true,
    allowed: false,
    reasons,
    speedMbps: null,
    testMs: null,
  };
};