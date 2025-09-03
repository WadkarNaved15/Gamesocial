import { useState, useEffect, useCallback } from "react";

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;

    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";

    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => !prev);
  }, []);

  return { isDark, toggleTheme };
}
