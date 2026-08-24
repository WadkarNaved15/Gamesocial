import SpeedTest from "@cloudflare/speedtest";

export type StreamEligibility = {
  checked: boolean;
  allowed: boolean;
  reasons: string[];

  downloadMbps: number | null;
  uploadMbps: number | null;

  latencyMs: number | null;
  jitterMs: number | null;
};


type NavWithHints = Navigator & {
  userAgentData?: { mobile?: boolean };
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
};

const MIN_DOWNLOAD = 65;
const MAX_JITTER = 40;
const MAX_LATENCY = 80;


const getDeviceReasons = () => {
  const reasons: string[] = [];
  const nav = navigator as NavWithHints;

  const mobileHint =
    nav.userAgentData?.mobile ??
    /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);

  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const connection = nav.connection;

  if (mobileHint) {
    reasons.push(
      "Mobile support is coming soon. Please use a laptop or desktop."
    );
  }

  // Only block if there is no precise mouse/trackpad-style pointer.
  if (!mobileHint && !finePointer) {
    reasons.push(
      "Use a laptop or desktop with a mouse or trackpad."
    );
  }

  if (connection?.saveData) {
    reasons.push("Data-saver mode is on.");
  }

  if (
    connection?.effectiveType &&
    ["slow-2g", "2g", "3g"].includes(connection.effectiveType)
  ) {
    reasons.push(
      `Connection type is too weak (${connection.effectiveType}).`
    );
  }

  return reasons;
};


const runCloudflareSpeedTest = async () => {
  return new Promise<{
    download: number | null;
    upload: number | null;
    latency: number | null;
    jitter: number | null;
  }>((resolve, reject) => {
    const test = new SpeedTest({
      measurements: [
        {
          type: "latency",
          numPackets: 20,
        },
        {
          type: "download",
          bytes: 2_000_000,
          count: 6,
        },
        {
          type: "upload",
          bytes: 2_000_000,
          count: 6,
        },
      ],
    });

    test.onError = (err) => {
      console.error("ERROR", err);
      reject(err);
    };


    test.onFinish = (results) => {
      const summary = results.getSummary();

      resolve({
        download: summary.download != null
          ? Number((summary.download / 1_000_000).toFixed(1))
          : null,

        upload: summary.upload != null
          ? Number((summary.upload / 1_000_000).toFixed(1))
          : null,

        latency: summary.latency != null
          ? Number(summary.latency.toFixed(1))
          : null,

        jitter: summary.jitter != null
          ? Number(summary.jitter.toFixed(1))
          : null,
      });
    };

    test.onError = reject;

    test.play();
  });
};

export const getStreamEligibility = async (): Promise<StreamEligibility> => {
  const reasons = getDeviceReasons();

  // If it already looks like mobile, skip the speed test.
  const mobileBlocked = reasons.some((r) =>
    r.includes("Mobile support is coming soon")
  );

 if (!mobileBlocked) {
  try {
    const result = await runCloudflareSpeedTest();

    if (result.download !== null && result.download < MIN_DOWNLOAD) {
      reasons.push(
        `Download speed is ${result.download?.toFixed(1)} Mbps. Minimum required is ${MIN_DOWNLOAD} Mbps.`
      );
    }

    if (
      result.latency !== null &&
      result.latency > MAX_LATENCY
    ) {
      reasons.push(
        `Network latency is ${result.latency.toFixed(1)} ms. Maximum allowed is ${MAX_LATENCY} ms.`
      );
    }

    if (result.jitter !== null && result.jitter > MAX_JITTER) {
      reasons.push(
        `Network jitter is ${result.jitter?.toFixed(1)} ms. Maximum allowed is ${MAX_JITTER} ms.`
      );
    }

    return {
      checked: true,
      allowed: reasons.length === 0,
      reasons,

      downloadMbps: result.download,
      uploadMbps: result.upload,

      latencyMs: result.latency,
      jitterMs: result.jitter,
    };

  } catch (err) {

  return {
    checked: true,
    allowed: false,
    reasons: ["Unable to verify your internet connection."],
    downloadMbps: null,
    uploadMbps: null,
    latencyMs: null,
    jitterMs: null,
  };
}
}

return {
    checked: true,
    allowed: reasons.length === 0,
    reasons,

    downloadMbps: null,
    uploadMbps: null,

    latencyMs: null,
    jitterMs: null,
};
};