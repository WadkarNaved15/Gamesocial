import { useEffect, useState } from "react";

const SESSION_KEY = "rigzer_guest_started";

export function useGuestSession() {
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    let startedAt = localStorage.getItem(SESSION_KEY);

    if (!startedAt) {
      startedAt = Date.now().toString();
      localStorage.setItem(SESSION_KEY, startedAt);
    }

    const interval = setInterval(() => {
      const elapsed =
        (Date.now() - Number(startedAt)) / 1000 / 60;

      setMinutes(elapsed);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return {
    minutes,
  };
}