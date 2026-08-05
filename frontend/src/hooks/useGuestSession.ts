import { useEffect, useState } from "react";

const SESSION_KEY = "rigzer_guest_started";
const SESSION_DURATION = 60 * 60 * 1000; // 1 hour

export function useGuestSession() {
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    const now = Date.now();
    let startedAt = localStorage.getItem(SESSION_KEY);

    if (
      !startedAt ||
      now - Number(startedAt) >= SESSION_DURATION
    ) {
      startedAt = now.toString();
      localStorage.setItem(SESSION_KEY, startedAt);
    }

    const updateElapsed = () => {
      const elapsed =
        (Date.now() - Number(startedAt)) / 1000 / 60;

      setMinutes(elapsed);
    };

    // Update immediately
    updateElapsed();

    // Continue updating every 10 seconds
    const interval = setInterval(updateElapsed, 10000);

    return () => clearInterval(interval);
  }, []);

  return {
    minutes,
  };
}