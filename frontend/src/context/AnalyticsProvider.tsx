// context/AnalyticsProvider.tsx

import { useEffect } from "react";
import api from "../utils/api";
import { useUser } from "./user";

const SESSION_KEY = "rigzer_analytics_session";

export function AnalyticsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;

    initializeSession();
  }, [user]);

useEffect(() => {
  if (!user) return;

  let interval:
  ReturnType<typeof setInterval>;

  const startHeartbeat = () => {
    interval = setInterval(
  async () => {
    try {
      await api.post("/api/analytics/session/heartbeat", {
        timestamp: Date.now(),
      });
    } catch {}
  },
  2 * 60 * 1000
);
  };

  const stopHeartbeat = () => {
    clearInterval(interval);
  };

const handleVisibility = async () => {
  if (document.hidden) {
    stopHeartbeat();
  } else {
    try {
     await api.post("/api/analytics/session/heartbeat", {
  timestamp: Date.now(),
});
    } catch {}

    stopHeartbeat();
    startHeartbeat();
  }
};

  startHeartbeat();

  document.addEventListener(
    "visibilitychange",
    handleVisibility
  );

  return () => {
    stopHeartbeat();

    document.removeEventListener(
      "visibilitychange",
      handleVisibility
    );
  };
}, [user]);

useEffect(() => {
  if (user) return;

  localStorage.removeItem(
    SESSION_KEY
  );
}, [user]);


useEffect(() => {
  const handleUnload = () => {
  const sessionId =
    localStorage.getItem(
      SESSION_KEY
    );

  if (!sessionId) return;

  navigator.sendBeacon(
    `${
      import.meta.env
        .VITE_BACKEND_URL
    }/api/analytics/session/end`,
    new Blob(
      [
        JSON.stringify({
          sessionId,
        }),
      ],
      {
        type:
          "application/json",
      }
    )
  );
};


  window.addEventListener(
    "beforeunload",
    handleUnload
  );

  return () =>
    window.removeEventListener(
      "beforeunload",
      handleUnload
    );
}, []);

  return <>{children}</>;
}


async function initializeSession() {
  try {
    const existingSessionId =
      localStorage.getItem(SESSION_KEY);

    const res = await api.post(
  "/api/analytics/session/start",
  {
    existingSessionId,

    source: "web",

    deviceType:
      getDeviceType(),

    browser:
      getBrowser(),

    operatingSystem:
      getOperatingSystem(),
  }
);

    localStorage.setItem(
      SESSION_KEY,
      res.data.sessionId
    );
  } catch (err) {
    console.error(
      "Session init failed",
      err
    );
  }
}


function getDeviceType() {
  const ua = navigator.userAgent;

  if (/Tablet|iPad/i.test(ua)) {
    return "tablet";
  }

  if (/Mobi|Android/i.test(ua)) {
    return "mobile";
  }

  return "desktop";
}

function getBrowser() {
  const ua = navigator.userAgent;

  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome"))
    return "Safari";

  return "Other";
}

function getOperatingSystem() {
  const ua = navigator.userAgent;

  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad"))
    return "iOS";
  if (ua.includes("Linux")) return "Linux";

  return "Other";
}